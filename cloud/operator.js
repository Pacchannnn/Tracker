// Local preparation only by default. Remote execution requires separate human
// approval, --execute, and a matching TRACKER_OPERATOR_APPROVAL command:project.
// Connection secrets belong only in TRACKER_OPERATOR_DATABASE_URL, never argv.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const runtimeRole = 'tracker_preview_runtime';
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const keys = (value, allowed) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key));

export function validateReview(review) {
  if (!keys(review, ['environment', 'projectUrl', 'registrations']) || review.environment !== 'preview' ||
      !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(review.projectUrl) || !Array.isArray(review.registrations) || review.registrations.length > 20) throw Error('invalid_operator_review');
  const seen = new Set();
  for (const identity of review.registrations) {
    if (!keys(identity, ['uid', 'deviceId', 'confirmedAuthUser', 'confirmedDevice', 'synthetic']) || !uuid(identity.uid) || !uuid(identity.deviceId) ||
        identity.confirmedAuthUser !== true || identity.confirmedDevice !== true || identity.synthetic !== true) throw Error('invalid_operator_review');
    const pair = `${identity.uid.toLowerCase()}:${identity.deviceId.toLowerCase()}`;
    if (seen.has(pair)) throw Error('invalid_operator_review');
    seen.add(pair);
  }
  return { ...review, projectId: new URL(review.projectUrl).hostname.split('.')[0], runtimeRole };
}

async function prepare(review) {
  const migrations = [];
  const bodies = [];
  for (const file of ['001_foundation.sql', '002_sync_counts.sql']) {
    const source = await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8');
    if ((source.match(/^BEGIN;\r?$/gm) || []).length !== 1 || !/COMMIT;\s*$/.test(source)) throw Error('unexpected_migration_transaction');
    migrations.push({ file, sha256: createHash('sha256').update(source).digest('hex') });
    bodies.push(source.replace(/^BEGIN;\r?$/m, '').replace(/COMMIT;\s*$/, ''));
  }
  const sql = `-- PREVIEW SYNTHETIC ONLY: review project ${review.projectId} in Dashboard before execution.
-- No target selection occurs in SQL. Run only after separate migration/role approval.
-- Unmodified migration bodies; one transaction prevents partial installation.
BEGIN;
DO $$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'postgres_operator_required'; END IF;
  IF pg_catalog.to_regnamespace('tracker_sync') IS NOT NULL THEN RAISE EXCEPTION 'existing_tracker_schema'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND (rolcreaterole OR rolsuper))
    OR NOT pg_catalog.has_database_privilege(current_user,pg_catalog.current_database(),'CREATE') THEN RAISE EXCEPTION 'tracker_role_schema_creation_required'; END IF;
  IF NOT pg_catalog.has_schema_privilege(current_user,'auth','USAGE')
    OR NOT pg_catalog.has_table_privilege(current_user,'auth.users','REFERENCES') THEN RAISE EXCEPTION 'tracker_auth_reference_required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='tracker_sync_owner') THEN
    CREATE ROLE tracker_sync_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='tracker_gateway') THEN
    CREATE ROLE tracker_gateway NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('tracker_sync_owner','tracker_gateway')
    AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN RAISE EXCEPTION 'unsafe_tracker_role'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles parent ON parent.oid=m.roleid
    JOIN pg_catalog.pg_roles member ON member.oid=m.member
    WHERE (parent.rolname='tracker_sync_owner' AND member.rolname<>'postgres')
       OR (parent.rolname='tracker_gateway' AND member.rolname NOT IN ('${runtimeRole}','postgres'))
       OR (parent.rolname='${runtimeRole}' AND member.rolname<>'postgres')) THEN RAISE EXCEPTION 'unsafe_tracker_membership'; END IF;
  PERFORM pg_catalog.set_config('tracker.operator_owner_membership', COALESCE((SELECT pg_catalog.to_jsonb(m)::text FROM pg_catalog.pg_auth_members m
    JOIN pg_catalog.pg_roles parent ON parent.oid=m.roleid JOIN pg_catalog.pg_roles member ON member.oid=m.member
    WHERE parent.rolname='tracker_sync_owner' AND member.rolname='postgres' AND m.grantor=member.oid),'null'), true);
  IF pg_catalog.current_setting('server_version_num')::integer >= 160000 THEN
    EXECUTE 'GRANT tracker_sync_owner TO postgres WITH INHERIT TRUE, SET TRUE';
  ELSE GRANT tracker_sync_owner TO postgres; END IF;
END $$;
${bodies.join('\n')}
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='${runtimeRole}') THEN
    CREATE ROLE ${runtimeRole} NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='${runtimeRole}'
    AND (rolcanlogin OR NOT rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles parent ON parent.oid=m.roleid
      JOIN pg_catalog.pg_roles member ON member.oid=m.member WHERE member.rolname='${runtimeRole}' AND parent.rolname<>'tracker_gateway')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles parent ON parent.oid=m.roleid
      JOIN pg_catalog.pg_roles member ON member.oid=m.member WHERE member.rolname='${runtimeRole}' AND parent.rolname='tracker_gateway'
        AND m.grantor<>(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='postgres')
        AND (m.admin_option OR COALESCE((pg_catalog.to_jsonb(m)->>'set_option')::boolean,false)))
    OR pg_catalog.pg_has_role('${runtimeRole}','tracker_sync_owner','MEMBER') THEN RAISE EXCEPTION 'unsafe_runtime_role'; END IF;
END $$;
REVOKE ALL ON SCHEMA tracker_sync FROM ${runtimeRole};
REVOKE ALL ON ALL TABLES IN SCHEMA tracker_sync FROM ${runtimeRole};
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tracker_sync FROM ${runtimeRole};
DO $$ BEGIN
  IF pg_catalog.current_setting('server_version_num')::integer >= 160000 THEN
    EXECUTE 'GRANT tracker_gateway TO ${runtimeRole} WITH ADMIN FALSE, INHERIT TRUE, SET FALSE';
  ELSE
    GRANT tracker_gateway TO ${runtimeRole};
    REVOKE ADMIN OPTION FOR tracker_gateway FROM ${runtimeRole};
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
    LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
    WHERE n.nspname='tracker_sync' AND a.grantee NOT IN (p.proowner,pg_catalog.to_regrole('tracker_gateway'))) THEN
    RAISE EXCEPTION 'unexpected_tracker_function_acl';
  END IF;
END $$;
DO $$ DECLARE prior jsonb := pg_catalog.current_setting('tracker.operator_owner_membership')::jsonb; BEGIN
  IF prior='null'::jsonb THEN
    REVOKE tracker_sync_owner FROM postgres GRANTED BY CURRENT_USER;
  ELSIF pg_catalog.current_setting('server_version_num')::integer >= 160000 THEN
    EXECUTE pg_catalog.format('GRANT tracker_sync_owner TO postgres WITH INHERIT %s, SET %s',
      prior->>'inherit_option',prior->>'set_option');
  END IF;
END $$;
COMMIT;
-- Runtime remains NOLOGIN. After separate secret/role approval: use psql's
-- interactive \\password tracker_preview_runtime with provider logging reviewed,
-- store its secret in the approved server secret manager, then ALTER ROLE
-- tracker_preview_runtime LOGIN. Never put a literal password in this SQL.
`;
  return { environment: 'preview', projectId: review.projectId, runtimeRole, migrations, sql };
}

// Generates a packet only: hosted ownership must pass the SQL preflight at installation.
export async function preparePhotos(input, {hosted=false}={}) {
  const review = validateReview(input);
  const file = '003_photos.sql';
  const source = await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8');
  if ((source.match(/^BEGIN;\r?$/gm) || []).length !== 1 || !/COMMIT;\s*$/.test(source)) throw Error('unexpected_migration_transaction');
  let body = source.replace(/^BEGIN;\r?$/m, '').replace(/COMMIT;\s*$/, '');
  const marker='-- STORAGE POLICY INSTALLATION:';
  const boundary=body.indexOf(marker);
  if(boundary<0 || body.indexOf(marker,boundary+marker.length)>=0)throw Error('unexpected_photo_policy_boundary');
  const policyBody=body.slice(boundary);
  if((policyBody.match(/^CREATE POLICY /gm)||[]).length!==7)throw Error('unexpected_photo_policy_count');
  if(hosted)body=body.slice(0,boundary);
  const sql = `-- OFFLINE PHOTO PACKET: reviewed preview project ${review.projectId}.
-- Not rerunnable. Hosted storage ownership/adminability is not established locally.
BEGIN;
DO $$ DECLARE target record; BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'postgres_operator_required'; END IF;
  IF pg_catalog.to_regnamespace('tracker_sync') IS NULL THEN RAISE EXCEPTION 'missing_tracker_schema'; END IF;
  IF pg_catalog.to_regclass('tracker_sync.photo_manifests') IS NOT NULL
    OR pg_catalog.to_regclass('tracker_sync.photo_assets') IS NOT NULL
    OR pg_catalog.to_regnamespace('tracker_photo_policy') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='tracker_sync' AND p.proname LIKE 'photo_%')
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('storage.objects') AND polname LIKE 'tracker_photo_%') THEN RAISE EXCEPTION 'existing_photo_installation'; END IF;
  IF pg_catalog.to_regclass('storage.objects') IS NULL OR pg_catalog.to_regclass('storage.buckets') IS NULL
    OR pg_catalog.to_regprocedure('auth.uid()') IS NULL THEN RAISE EXCEPTION 'missing_hosted_photo_dependencies'; END IF;
  -- The combined local packet requires ownership. Hosted policies are a separate
  -- Dashboard step: provider policy delegation is not proved by membership.
  FOR target IN SELECT c.relowner AS owner FROM pg_catalog.pg_class c
    WHERE c.oid IN (${hosted?'':"pg_catalog.to_regclass('storage.objects'),"}pg_catalog.to_regclass('tracker_sync.sync_records'))
    UNION SELECT n.nspowner FROM pg_catalog.pg_namespace n WHERE n.nspname='tracker_sync' LOOP
    IF NOT pg_catalog.pg_has_role(current_user,target.owner,'USAGE') THEN RAISE EXCEPTION 'photo_operator_ownership_required'; END IF;
  END LOOP;
  IF NOT pg_catalog.has_schema_privilege(current_user,'storage','USAGE') OR NOT pg_catalog.has_table_privilege(current_user,'storage.buckets','SELECT') THEN RAISE EXCEPTION 'photo_bucket_privileges_required'; END IF;
  IF NOT pg_catalog.has_schema_privilege(current_user,'auth','USAGE') OR NOT pg_catalog.has_function_privilege(current_user,'auth.uid()','EXECUTE') THEN RAISE EXCEPTION 'photo_operator_uid_read_required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='tracker_sync_owner')
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='tracker_sync_owner' AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN RAISE EXCEPTION 'unsafe_tracker_role'; END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=pg_catalog.to_regrole('tracker_sync_owner'))
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles r ON r.oid=m.member
    WHERE m.roleid=pg_catalog.to_regrole('tracker_sync_owner') AND r.rolname<>'postgres') THEN RAISE EXCEPTION 'unsafe_tracker_membership'; END IF;
  PERFORM pg_catalog.set_config('tracker.photo_owner_membership',COALESCE((SELECT pg_catalog.to_jsonb(m)::text FROM pg_catalog.pg_auth_members m
    WHERE m.roleid=pg_catalog.to_regrole('tracker_sync_owner') AND m.member=pg_catalog.to_regrole('postgres') AND m.grantor=m.member),'null'),true);
  IF pg_catalog.current_setting('server_version_num')::integer>=160000 THEN
    EXECUTE 'GRANT tracker_sync_owner TO postgres WITH INHERIT TRUE, SET TRUE';
  ELSE GRANT tracker_sync_owner TO postgres; END IF;
END $$;
${body}
DO $$ DECLARE prior jsonb:=pg_catalog.current_setting('tracker.photo_owner_membership')::jsonb; BEGIN
  IF prior='null'::jsonb THEN REVOKE tracker_sync_owner FROM postgres GRANTED BY CURRENT_USER;
  ELSIF pg_catalog.current_setting('server_version_num')::integer>=160000 THEN
    EXECUTE pg_catalog.format('GRANT tracker_sync_owner TO postgres WITH INHERIT %s, SET %s',prior->>'inherit_option',prior->>'set_option');
  END IF;
END $$;
COMMIT;
`;
  const storagePolicySql=hosted?`-- PROVIDER DASHBOARD POLICY STEP ONLY. Separately approved; no ownership/role changes.
BEGIN;
DO $$ BEGIN
  IF current_user<>'postgres' THEN RAISE EXCEPTION 'postgres_operator_required'; END IF;
  IF pg_catalog.to_regprocedure('tracker_photo_policy.allowed(text,boolean)') IS NULL THEN RAISE EXCEPTION 'missing_photo_foundation'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='tracker-preview-photos' AND public=false) THEN RAISE EXCEPTION 'photo_private_bucket_required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid='storage.objects'::pg_catalog.regclass AND relrowsecurity) THEN RAISE EXCEPTION 'storage_rls_required'; END IF;
END $$;
${policyBody}
COMMIT;
`:null;
  return { environment:'preview',projectId:review.projectId,offlineOnly:true,rerunnable:false,
    migrations:[{file,sha256:createHash('sha256').update(source).digest('hex')}],sql,
    ...(hosted?{storagePolicySql,acceptance:'private_db_packet_only_dashboard_policy_capability_and_final_catalog_verification_required'}:
      {acceptance:'local_packet_only_hosted_storage_ownership_policy_and_auth_validation_required'}) };
}

function executionConnection(command, review, env) {
  if (env.TRACKER_OPERATOR_APPROVAL !== `${command}:${review.projectId}`) throw Error('operator_execution_not_approved');
  try {
    const url = new URL(env.TRACKER_OPERATOR_DATABASE_URL);
    const username = decodeURIComponent(url.username);
    const roles = command === 'inspect' ? ['postgres', runtimeRole] : ['postgres'];
    const direct = url.hostname === `db.${review.projectId}.supabase.co` && roles.includes(username);
    const pooler = /^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(url.hostname) && roles.some(role => username === `${role}.${review.projectId}`);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || (!direct && !pooler) || (url.port && url.port !== '5432') || url.pathname !== '/postgres' ||
        !url.password || url.hash || url.searchParams.getAll('sslmode').length !== 1 || url.searchParams.get('sslmode') !== 'verify-full' ||
        [...url.searchParams.keys()].some(key => !['sslmode', 'sslrootcert'].includes(key)) || env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw Error();
    return env.TRACKER_OPERATOR_DATABASE_URL;
  } catch { throw Error('invalid_operator_connection'); }
}

export async function provisionRegistrations(query, input) {
  const review = validateReview(input);
  if (!review.registrations.length) throw Error('registration_review_required');
  await query('BEGIN', []);
  try {
    // Auth confirmation is checked as operator, with no email/token selection.
    for (const identity of review.registrations) {
      const confirmed = await query('SELECT EXISTS(SELECT 1 FROM auth.users WHERE id=$1::uuid AND email_confirmed_at IS NOT NULL) AS confirmed', [identity.uid]);
      if (confirmed.rows[0]?.confirmed !== true) throw Error('auth_user_not_confirmed');
    }
    await query(`DO $$ BEGIN
      IF current_user <> 'postgres' THEN RAISE EXCEPTION 'postgres_operator_required'; END IF;
      PERFORM pg_catalog.set_config('tracker.operator_gateway_membership', COALESCE((SELECT pg_catalog.to_jsonb(m)::text FROM pg_catalog.pg_auth_members m
        JOIN pg_catalog.pg_roles parent ON parent.oid=m.roleid JOIN pg_catalog.pg_roles member ON member.oid=m.member
        WHERE parent.rolname='tracker_gateway' AND member.rolname='postgres' AND m.grantor=member.oid),'null'), true);
      IF pg_catalog.current_setting('server_version_num')::integer >= 160000 THEN
        EXECUTE 'GRANT tracker_gateway TO postgres WITH INHERIT FALSE, SET TRUE';
      ELSE GRANT tracker_gateway TO postgres; END IF;
    END $$`, []);
    // Registration runs with helper permissions, never as bypass-RLS admin.
    await query('SET LOCAL ROLE tracker_gateway', []);
    for (const { uid, deviceId } of review.registrations) {
      const result = await query('SELECT tracker_sync.register_account_device($1::uuid,$2::text,$3::text,$4::uuid) AS registration', [uid, 'preview', review.projectId, deviceId]);
      if (result.rows[0]?.registration?.registered !== true) throw Error('registration_failed');
    }
    await query('RESET ROLE', []);
    await query(`DO $$ DECLARE prior jsonb := pg_catalog.current_setting('tracker.operator_gateway_membership')::jsonb; BEGIN
      IF prior='null'::jsonb THEN
        REVOKE tracker_gateway FROM postgres GRANTED BY CURRENT_USER;
      ELSIF pg_catalog.current_setting('server_version_num')::integer >= 160000 THEN
        EXECUTE pg_catalog.format('GRANT tracker_gateway TO postgres WITH INHERIT %s, SET %s',prior->>'inherit_option',prior->>'set_option');
      END IF;
    END $$`, []);
    await query('COMMIT', []);
    return { registered: review.registrations.length };
  } catch (error) { await query('ROLLBACK', []); throw error; }
}

async function inspect(query) {
  await query('BEGIN READ ONLY', []);
  try {
    const statements = (await readFile(new URL('./hosted-preflight.sql', import.meta.url), 'utf8')).split(';').map(sql => sql.trim()).filter(Boolean);
    statements.push(
      "SELECT defaclrole::regrole::text AS owner,COALESCE(n.nspname,'all_schemas') AS schema,defaclobjtype,defaclacl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='tracker_sync' OR d.defaclnamespace=0",
      "SELECT grantee,table_name,privilege_type FROM information_schema.table_privileges WHERE table_schema='tracker_sync'",
      "SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication,pg_has_role(oid,to_regrole('tracker_gateway'),'USAGE') AS gateway,pg_has_role(oid,to_regrole('tracker_sync_owner'),'MEMBER') AS helper FROM pg_roles WHERE rolname='tracker_preview_runtime'",
      "SELECT nspname,nspacl FROM pg_namespace WHERE nspname='tracker_sync'",
      "SELECT r.rolname,p.oid::regprocedure::text AS function,has_function_privilege(r.oid,p.oid,'EXECUTE') AS can_execute FROM pg_roles r CROSS JOIN pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='tracker_sync' AND r.rolname IN ('anon','authenticated','service_role','tracker_preview_runtime')",
      "SELECT r.rolname,c.relname,has_table_privilege(r.oid,c.oid,'SELECT') AS can_select,has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert,has_table_privilege(r.oid,c.oid,'UPDATE') AS can_update,has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tracker_sync' AND c.relkind='r' AND r.rolname IN ('anon','authenticated','service_role','tracker_preview_runtime')"
    );
    const catalog = [];
    for (const sql of statements) catalog.push((await query(sql, [])).rows);
    await query('COMMIT', []);
    return { catalog, acceptance: 'catalog_only_hosted_denial_tls_and_auth_checks_still_required' };
  } catch (error) { await query('ROLLBACK', []); throw error; }
}

async function connectDatabase(connectionString) {
  const { Client } = await import('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  try { await client.connect(); } catch (error) { await client.end(); throw error; }
  return client;
}

export async function runOperator(command, input, { execute = false, env = process.env, connect = connectDatabase } = {}) {
  if (!['prepare', 'prepare-photos', 'prepare-hosted-photos', 'inspect', 'provision'].includes(command)) throw Error('invalid_operator_command');
  const review = validateReview(input);
  if (command === 'prepare-photos'||command==='prepare-hosted-photos') {
    if (execute) throw Error('prepare_is_offline_only');
    return preparePhotos(input,{hosted:command==='prepare-hosted-photos'});
  }
  if (command === 'prepare') {
    if (execute) throw Error('prepare_is_offline_only');
    return prepare(review);
  }
  if (command === 'provision' && !review.registrations.length) throw Error('registration_review_required');
  if (!execute) return { dryRun: true, command, environment: 'preview', projectId: review.projectId, runtimeRole, registrationCount: review.registrations.length, remoteApprovalRequired: true };
  const connection = executionConnection(command, review, env);
  const client = await connect(connection);
  try { return await (command === 'inspect' ? inspect((sql, params) => client.query(sql, params)) : provisionRegistrations((sql, params) => client.query(sql, params), input)); }
  finally { await client.end(); }
}

async function main(argv) {
  const [command, flag, file, execution, ...extra] = argv;
  if (flag !== '--review' || !file || (execution && execution !== '--execute') || extra.length) throw Error('invalid_operator_arguments');
  const review = JSON.parse(await readFile(file, 'utf8'));
  const result = await runOperator(command, review, { execute: execution === '--execute' });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(() => { process.stderr.write('Operator action failed; configuration, credentials and database errors redacted.\n'); process.exitCode = 1; });
}
