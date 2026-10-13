import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { preparePhotos, runOperator } from '../cloud/operator.js';
import { PGlite } from '../cloud/node_modules/@electric-sql/pglite/dist/index.js';
const review={environment:'preview',projectUrl:'https://abcdefghijklmnopqrst.supabase.co',registrations:[]};
const fixture=`CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean);INSERT INTO storage.buckets VALUES('tracker-preview-photos','tracker-preview-photos',false);CREATE TABLE storage.objects(id uuid,bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';CREATE ROLE anon;CREATE ROLE authenticated;`;

test('photo preparation preserves migration body/hash and cannot execute or connect',async()=>{
 const source=await readFile(new URL('../cloud/migrations/003_photos.sql',import.meta.url),'utf8');
 const packet=await preparePhotos(review);
 assert.equal(packet.migrations[0].sha256,createHash('sha256').update(source).digest('hex'));
 assert.ok(packet.sql.includes(source.replace(/^BEGIN;\r?$/m,'').replace(/COMMIT;\s*$/,'')));
 assert.equal(packet.offlineOnly,true);assert.equal(packet.rerunnable,false);
 let connects=0; const connect=async()=>{connects++;throw Error('network');};
 await runOperator('prepare-photos',review,{connect});
 await assert.rejects(runOperator('prepare-photos',review,{execute:true,connect}),/offline_only/);
 await assert.rejects(runOperator('execute-photos',review,{execute:true,connect}),/invalid_operator_command/);
 assert.equal(connects,0); assert.doesNotMatch(packet.sql,/GRANT postgres TO tracker_sync_owner|ALTER ROLE .* LOGIN/);
});

test('photo packet installs as non-superuser postgres after foundation and restores all grantors',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE qa_admin SUPERUSER LOGIN;SET SESSION AUTHORIZATION qa_admin;ALTER ROLE postgres RENAME TO bootstrap_admin;CREATE ROLE postgres LOGIN CREATEROLE CREATEDB;GRANT CREATE ON DATABASE postgres TO postgres;SET SESSION AUTHORIZATION postgres;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);${fixture}`);
 await db.exec((await runOperator('prepare',review)).sql);
 await db.exec('GRANT tracker_sync_owner TO postgres WITH INHERIT FALSE,SET FALSE;SET SESSION AUTHORIZATION qa_admin;GRANT tracker_sync_owner TO postgres WITH ADMIN TRUE,INHERIT FALSE,SET FALSE;SET SESSION AUTHORIZATION postgres');
 // The bootstrap grantor's ADMIN membership stays distinct from postgres's temporary grant.
 const before=(await db.query("SELECT m.* FROM pg_auth_members m WHERE roleid=to_regrole('tracker_sync_owner') ORDER BY member,grantor")).rows;
 const packet=await preparePhotos(review); await db.exec(packet.sql);
 assert.deepEqual((await db.query("SELECT m.* FROM pg_auth_members m WHERE roleid=to_regrole('tracker_sync_owner') ORDER BY member,grantor")).rows,before);
 assert.equal((await db.query("SELECT rolsuper FROM pg_roles WHERE rolname=current_user")).rows[0].rolsuper,false);
 assert.equal((await db.query("SELECT count(*)::integer n FROM pg_policy WHERE polrelid='storage.objects'::regclass")).rows[0].n,7);
 assert.equal((await db.query("SELECT rolcanlogin FROM pg_roles WHERE rolname='tracker_preview_runtime'")).rows[0].rolcanlogin,false);
 await db.exec('SET SESSION AUTHORIZATION qa_admin;SET ROLE tracker_preview_runtime');await assert.rejects(db.query('SELECT * FROM tracker_sync.photo_assets'),/permission denied/);await db.exec('RESET ROLE;SET SESSION AUTHORIZATION postgres');
 await assert.rejects(db.exec(packet.sql),/existing_photo_installation/);await db.exec('ROLLBACK');
 }finally{await db.close();}
});

test('photo packet rejects missing foundation and unowned hosted storage atomically',async()=>{
 const db=new PGlite();try{
 const packet=await preparePhotos(review);await assert.rejects(db.exec(packet.sql),/missing_tracker_schema/);await db.exec('ROLLBACK');
 await db.exec(`CREATE ROLE qa_admin SUPERUSER LOGIN;SET SESSION AUTHORIZATION qa_admin;ALTER ROLE postgres RENAME TO bootstrap_admin;CREATE ROLE postgres LOGIN CREATEROLE CREATEDB;GRANT CREATE ON DATABASE postgres TO postgres;SET SESSION AUTHORIZATION postgres;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);${fixture}`);
 await db.exec((await runOperator('prepare',review)).sql);
 await db.exec('SET SESSION AUTHORIZATION qa_admin;CREATE ROLE hosted_storage_owner NOLOGIN;ALTER TABLE storage.objects OWNER TO hosted_storage_owner;SET SESSION AUTHORIZATION postgres;');
 await assert.rejects(db.exec(packet.sql),/photo_operator_ownership_required/);await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT to_regclass('tracker_sync.photo_assets') IS NULL absent")).rows[0].absent,true);
 }finally{await db.close();}
});
