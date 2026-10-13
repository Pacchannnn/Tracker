import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '../cloud/node_modules/@electric-sql/pglite/dist/index.js';
import {runOperator} from '../cloud/operator.js';

const review={environment:'preview',projectUrl:'https://abcdefghijklmnopqrst.supabase.co',registrations:[]};
// Local characterization only: no supautils or hosted Dashboard authority is simulated.
async function fixture({bucket=true}={}){
 const db=new PGlite();
 await db.exec(`CREATE ROLE qa_admin SUPERUSER LOGIN;SET SESSION AUTHORIZATION qa_admin;
 ALTER ROLE postgres RENAME TO bootstrap_admin;
 CREATE ROLE postgres LOGIN CREATEROLE CREATEDB NOSUPERUSER NOBYPASSRLS;
 GRANT CREATE ON DATABASE postgres TO postgres;
 CREATE ROLE supabase_auth_admin NOLOGIN;CREATE ROLE supabase_storage_admin NOLOGIN;
 CREATE ROLE authenticated NOLOGIN;CREATE ROLE anon NOLOGIN;CREATE ROLE service_role NOLOGIN;
 CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);
 ALTER TABLE auth.users OWNER TO supabase_auth_admin;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
 REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC;
 GRANT USAGE ON SCHEMA auth TO postgres,authenticated;
 GRANT EXECUTE ON FUNCTION auth.uid() TO postgres,authenticated;
 GRANT REFERENCES ON auth.users TO postgres;
 CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean);
 CREATE TABLE storage.objects(id uuid,bucket_id text,name text);
 ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;
 ALTER TABLE storage.objects OWNER TO supabase_storage_admin;
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO postgres,authenticated,anon;
 GRANT SELECT ON storage.buckets TO postgres;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;
 ${bucket?"INSERT INTO storage.buckets VALUES('tracker-preview-photos','tracker-preview-photos',false);":''}
 SET SESSION AUTHORIZATION postgres;`);
 return db;
}

test('hosted photo packet is offline, separates all seven policies and never mutates managed auth/bucket objects',async()=>{
 let connects=0;
 const packet=await runOperator('prepare-hosted-photos',review,{connect:async()=>{connects++;throw Error('remote');}});
 assert.equal(packet.offlineOnly,true);assert.equal(packet.rerunnable,false);
 assert.match(packet.sql,/CREATE FUNCTION tracker_photo_policy.request_uid/);
 assert.doesNotMatch(packet.sql,/CREATE POLICY .* ON storage\.objects|INSERT INTO storage\.buckets|GRANT .* ON (SCHEMA auth|FUNCTION auth\.uid)/);
 assert.equal((packet.storagePolicySql.match(/CREATE POLICY /g)||[]).length,7);
 assert.match(packet.storagePolicySql,/AS RESTRICTIVE FOR UPDATE/);
 assert.match(packet.storagePolicySql,/AS RESTRICTIVE FOR DELETE/);
 await assert.rejects(()=>runOperator('prepare-hosted-photos',review,{execute:true}),/offline_only/);
 assert.equal(connects,0);
});

test('001→002→hosted 003 private setup works with unowned Auth/Storage and no admin memberships',async()=>{
 const db=await fixture();try{
 await db.exec((await runOperator('prepare',review)).sql);
 const packet=await runOperator('prepare-hosted-photos',review);
 await db.exec(packet.sql);
 const flags=(await db.query(`SELECT
 pg_has_role('postgres','supabase_auth_admin','MEMBER') auth_admin,
 pg_has_role('postgres','supabase_storage_admin','MEMBER') storage_admin,
 has_schema_privilege('tracker_sync_owner','auth','USAGE') helper_auth,
 has_function_privilege('tracker_sync_owner','auth.uid()','EXECUTE') helper_uid,
 pg_has_role('tracker_preview_runtime','tracker_sync_owner','MEMBER') runtime_owner`)).rows[0];
 assert.deepEqual(flags,{auth_admin:false,storage_admin:false,helper_auth:false,helper_uid:false,runtime_owner:false});
 assert.equal((await db.query("SELECT pg_get_userbyid(proowner) owner FROM pg_proc WHERE oid='tracker_photo_policy.request_uid()'::regprocedure")).rows[0].owner,'postgres');
 assert.equal((await db.query("SELECT count(*)::int n FROM pg_policy WHERE polrelid='storage.objects'::regclass")).rows[0].n,0);
 const tables=(await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('tracker_sync.photo_assets'::regclass,'tracker_sync.photo_manifests'::regclass)")).rows;
 assert.equal(tables.length,2);assert.ok(tables.every(row=>row.relrowsecurity&&row.relforcerowsecurity));
 // Ordinary SQL does not gain CREATE POLICY from DML grants or the new bridge.
 await assert.rejects(()=>db.exec(packet.storagePolicySql),/must be owner/);await db.exec('ROLLBACK');
 await db.exec('SET SESSION AUTHORIZATION qa_admin;SET ROLE authenticated');
 await assert.rejects(()=>db.query('SELECT tracker_photo_policy.request_uid()'),/permission denied/);
 assert.equal((await db.query("SELECT tracker_photo_policy.allowed('invalid',false) allowed")).rows[0].allowed,false);
 await db.exec('RESET ROLE;SET ROLE tracker_preview_runtime');
 await assert.rejects(()=>db.query('SELECT * FROM tracker_sync.photo_assets'),/permission denied/);
 }finally{await db.close();}
});

test('hosted 003 requires an already private Dashboard/API bucket and fails without partial DB changes',async()=>{
 const db=await fixture({bucket:false});try{
 await db.exec((await runOperator('prepare',review)).sql);
 const packet=await runOperator('prepare-hosted-photos',review);
 await assert.rejects(()=>db.exec(packet.sql),/photo_private_bucket_required/);await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT to_regclass('tracker_sync.photo_assets') IS NULL absent")).rows[0].absent,true);
 await db.exec("SET SESSION AUTHORIZATION qa_admin;INSERT INTO storage.buckets VALUES('tracker-preview-photos','tracker-preview-photos',true);SET SESSION AUTHORIZATION postgres");
 await assert.rejects(()=>db.exec(packet.sql),/photo_private_bucket_required/);await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT to_regnamespace('tracker_photo_policy') IS NULL absent")).rows[0].absent,true);
 }finally{await db.close();}
});

test('hosted UID bridge excludes unexpected global default EXECUTE recipients',async()=>{
 const db=await fixture();try{
 await db.exec((await runOperator('prepare',review)).sql);
 await db.exec(`SET SESSION AUTHORIZATION qa_admin;CREATE ROLE app_readers NOLOGIN;
 GRANT app_readers TO authenticated;ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO app_readers;
 SET SESSION AUTHORIZATION postgres;`);
 await db.exec((await runOperator('prepare-hosted-photos',review)).sql);
 const unexpected=(await db.query(`SELECT count(*)::int n FROM pg_proc p,
 LATERAL aclexplode(p.proacl) a WHERE p.oid='tracker_photo_policy.request_uid()'::regprocedure
 AND a.grantee NOT IN (p.proowner,'tracker_sync_owner'::regrole)`)).rows[0].n;
 assert.equal(unexpected,0);
 assert.equal((await db.query("SELECT has_function_privilege('authenticated','tracker_sync.photo_asset(uuid,text,text,uuid,uuid)','EXECUTE') allowed")).rows[0].allowed,false);
 await db.exec('SET SESSION AUTHORIZATION qa_admin;SET ROLE authenticated');
 await assert.rejects(()=>db.query('SELECT tracker_photo_policy.request_uid()'),/permission denied/);
 }finally{await db.close();}
});

test('foundation packet rolls back unexpected default EXECUTE grants on private helpers',async()=>{
 const db=await fixture();try{
 await db.exec(`SET SESSION AUTHORIZATION qa_admin;CREATE ROLE app_readers NOLOGIN;
 GRANT USAGE ON SCHEMA auth TO app_readers;
 ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO app_readers;
 SET SESSION AUTHORIZATION postgres;`);
 const packet=await runOperator('prepare',review);
 await assert.rejects(()=>db.exec(packet.sql),/unexpected_tracker_function_acl/);
 await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT to_regnamespace('tracker_sync') IS NULL absent")).rows[0].absent,true);
 }finally{await db.close();}
});

test('hosted photo installation rejects helper role membership acquired after foundation',async()=>{
 const db=await fixture();try{
 await db.exec((await runOperator('prepare',review)).sql);
 await db.exec('SET SESSION AUTHORIZATION qa_admin;GRANT supabase_auth_admin TO tracker_sync_owner;SET SESSION AUTHORIZATION postgres');
 const packet=await runOperator('prepare-hosted-photos',review);
 await assert.rejects(()=>db.exec(packet.sql),/unsafe_tracker_membership/);
 await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT to_regnamespace('tracker_photo_policy') IS NULL absent")).rows[0].absent,true);
 }finally{await db.close();}
});
