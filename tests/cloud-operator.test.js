import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const operator = await import('../cloud/operator.js').catch(() => ({}));
const projectUrl = 'https://abcdefghijklmnopqrst.supabase.co';
const uid = '11111111-1111-4111-8111-111111111111';
const deviceId = '33333333-3333-4333-8333-333333333333';
const review = () => ({ environment: 'preview', projectUrl, registrations: [{ uid, deviceId, confirmedAuthUser: true, confirmedDevice: true, synthetic: true }] });

test('review rejects another environment, ambiguous target, unreviewed identities and extra tenant inputs', () => {
  assert.equal(typeof operator.validateReview, 'function');
  assert.equal(operator.validateReview(review()).projectId, 'abcdefghijklmnopqrst');
  for (const value of [
    { ...review(), environment: 'production' },
    { ...review(), projectUrl: `${projectUrl}/` },
    { ...review(), projectUrl: 'https://user:secret@abcdefghijklmnopqrst.supabase.co' },
    { ...review(), registrations: [{ ...review().registrations[0], confirmedDevice: false }] },
    { ...review(), registrations: [{ ...review().registrations[0], synthetic: false }] },
    { ...review(), registrations: [{ ...review().registrations[0], uid: 'invented' }] },
    { ...review(), registrations: [{ ...review().registrations[0], environment: 'production' }] }
  ]) assert.throws(() => operator.validateReview(value), /invalid_operator_review/);
});

test('prepare and default inspect/provision are offline even with connection secrets present', async () => {
  assert.equal(typeof operator.runOperator, 'function');
  let connects = 0;
  const connect = async () => { connects++; throw Error('network must never be used'); };
  const prepared = await operator.runOperator('prepare', review(), { connect });
  assert.equal(prepared.environment, 'preview');
  assert.equal(prepared.runtimeRole, 'tracker_preview_runtime');
  assert.equal(prepared.migrations.length, 2);
  assert.match(prepared.migrations[0].sha256, /^[a-f0-9]{64}$/);
  for (const command of ['inspect', 'provision']) {
    const result = await operator.runOperator(command, review(), { connect, env: { TRACKER_OPERATOR_DATABASE_URL: 'secret' } });
    assert.equal(result.dryRun, true);
    assert.equal(result.projectId, 'abcdefghijklmnopqrst');
  }
  assert.equal(connects, 0);
});

test('execute refuses absent approval, mismatched project and unverified TLS without connecting', async () => {
  assert.equal(typeof operator.runOperator, 'function');
  let connects = 0;
  const connect = async () => { connects++; throw Error('should not connect'); };
  const validUrl = 'postgresql://postgres.abcdefghijklmnopqrst:SECRET@aws-0.pooler.supabase.com:5432/postgres?sslmode=verify-full';
  const env = { TRACKER_OPERATOR_DATABASE_URL: validUrl, TRACKER_OPERATOR_APPROVAL: 'provision:abcdefghijklmnopqrst' };
  for (const bad of [
    { ...env, TRACKER_OPERATOR_APPROVAL: '' },
    { ...env, TRACKER_OPERATOR_APPROVAL: 'provision:other' },
    { ...env, TRACKER_OPERATOR_DATABASE_URL: validUrl.replace('verify-full', 'require') },
    { ...env, TRACKER_OPERATOR_DATABASE_URL: validUrl.replace('abcdefghijklmnopqrst:', 'other:') },
    { ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }
  ]) await assert.rejects(operator.runOperator('provision', review(), { execute: true, env: bad, connect }), /operator_execution_not_approved|invalid_operator_connection/);
  assert.equal(connects, 0);
});

test('real SQL ownership wrapper installs both migrations, restricts runtime and refuses rerun', async () => {
  assert.equal(typeof operator.runOperator, 'function');
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz); CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
    const prepared = await operator.runOperator('prepare', review());
    await db.exec(prepared.sql);
    const role = (await db.query("SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication,pg_has_role('tracker_preview_runtime','tracker_gateway','USAGE') AS gateway,pg_has_role('tracker_preview_runtime','tracker_sync_owner','MEMBER') AS helper FROM pg_roles WHERE rolname='tracker_preview_runtime'")).rows[0];
    assert.deepEqual(role, { rolcanlogin: false, rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false, gateway: true, helper: false });
    assert.equal((await db.query("SELECT count(*)::integer AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tracker_sync' AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity")).rows[0].count, 6);
    assert.equal((await db.query("SELECT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE parent.rolname='tracker_sync_owner' AND member.rolname='postgres') AS member")).rows[0].member, false);
    await db.exec('SET ROLE tracker_preview_runtime');
    await assert.rejects(db.query('SELECT * FROM tracker_sync.sync_records'), /permission denied/);
    await assert.rejects(db.query('SELECT tracker_sync.set_scope($1::uuid,$2::text,$3::text)', [uid, 'preview', 'abcdefghijklmnopqrst']), /permission denied/);
    await db.exec('RESET ROLE');
    await assert.rejects(db.exec(prepared.sql), /existing_tracker_schema/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT count(*)::integer AS count FROM pg_namespace WHERE nspname='tracker_sync'")).rows[0].count, 1);
  } finally { await db.close(); }
});

test('provision uses confirmed Auth IDs, preview scope, rejects unknown/disabled identities and rolls back the batch', async () => {
  assert.equal(typeof operator.provisionRegistrations, 'function');
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);');
    await db.exec((await operator.runOperator('prepare', review())).sql);
    const query = (sql, params) => db.query(sql, params);
    await assert.rejects(operator.provisionRegistrations(query, review()), /auth_user_not_confirmed/);
    await db.query('INSERT INTO auth.users VALUES($1,NULL)', [uid]);
    await assert.rejects(operator.provisionRegistrations(query, review()), /auth_user_not_confirmed/);
    await db.exec('UPDATE auth.users SET email_confirmed_at=now()');
    assert.deepEqual(await operator.provisionRegistrations(query, review()), { registered: 1 });
    assert.deepEqual(await operator.provisionRegistrations(query, review()), { registered: 1 });
    assert.deepEqual((await db.query('SELECT user_id::text,environment,project_id,device_id::text FROM tracker_sync.sync_devices')).rows, [{ user_id: uid, environment: 'preview', project_id: 'abcdefghijklmnopqrst', device_id: deviceId }]);
    await db.exec("UPDATE tracker_sync.sync_accounts SET status='disabled'");
    await assert.rejects(operator.provisionRegistrations(query, review()), /account_unavailable/);
    await db.exec("UPDATE tracker_sync.sync_accounts SET status='active';UPDATE tracker_sync.sync_devices SET disabled_at=now()");
    await assert.rejects(operator.provisionRegistrations(query, review()), /device_disabled/);
    await db.exec('UPDATE tracker_sync.sync_devices SET disabled_at=NULL');
    const unknown = '22222222-2222-4222-8222-222222222222';
    const batch = review(); batch.registrations.push({ ...batch.registrations[0], uid: unknown });
    await db.exec('DELETE FROM tracker_sync.sync_devices;DELETE FROM tracker_sync.sync_accounts');
    await assert.rejects(operator.provisionRegistrations(query, batch), /auth_user_not_confirmed/);
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM tracker_sync.sync_accounts')).rows[0].count, 0);
  } finally { await db.close(); }
});

test('CLI dry run outputs no secret and rejects secret-bearing CLI arguments', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tracker-operator-'));
  try {
    const path = join(directory, 'review.json'); await writeFile(path, JSON.stringify(review()));
    const cli = fileURLToPath(new URL('../cloud/operator.js', import.meta.url));
    const result = spawnSync(process.execPath, [cli, 'provision', '--review', path], { encoding: 'utf8', env: { ...process.env, TRACKER_OPERATOR_DATABASE_URL: 'SECRET-URL' } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).dryRun, true);
    assert.ok(!`${result.stdout}${result.stderr}`.includes('SECRET-URL'));
    const rejected = spawnSync(process.execPath, [cli, 'provision', '--review', path, '--database-url', 'SECRET-URL'], { encoding: 'utf8' });
    assert.equal(rejected.status, 1);
    assert.ok(!`${rejected.stdout}${rejected.stderr}`.includes('SECRET-URL'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('preexisting browser membership rejects installation atomically and existing admin membership is preserved', async () => {
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  for (const hostile of [true, false]) {
    const db = new PGlite();
    try {
      await db.exec('CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);CREATE ROLE anon;CREATE ROLE tracker_sync_owner NOLOGIN;');
      await db.exec(hostile ? 'GRANT tracker_sync_owner TO anon' : 'GRANT tracker_sync_owner TO postgres');
      const prepared = await operator.runOperator('prepare', review());
      if (hostile) {
        await assert.rejects(db.exec(prepared.sql), /unsafe_tracker_membership/);
        await db.exec('ROLLBACK');
        assert.equal((await db.query("SELECT to_regnamespace('tracker_sync') IS NULL AS absent")).rows[0].absent, true);
        assert.equal((await db.query("SELECT to_regrole('tracker_gateway') IS NULL AS absent")).rows[0].absent, true);
      } else {
        await db.exec(prepared.sql);
        assert.equal((await db.query("SELECT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE parent.rolname='tracker_sync_owner' AND member.rolname='postgres') AS member")).rows[0].member, true);
      }
    } finally { await db.close(); }
  }
});

test('registration API refuses an injected project before opening a transaction', async () => {
  let queries = 0;
  const query = async () => { queries++; return { rows: [] }; };
  await assert.rejects(operator.provisionRegistrations(query, { ...review(), projectId: 'other-project' }), /invalid_operator_review/);
  assert.equal(queries, 0);
});

test('approved catalog inspection is read only, audits grants, and closes its connection on failure', async () => {
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  let closed = false;
  const env = { TRACKER_OPERATOR_APPROVAL: 'inspect:abcdefghijklmnopqrst', TRACKER_OPERATOR_DATABASE_URL: 'postgresql://postgres:SECRET@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=verify-full' };
  try {
    await db.exec('CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;');
    await db.exec((await operator.runOperator('prepare', review())).sql);
    const result = await operator.runOperator('inspect', review(), { execute: true, env, connect: async () => ({ query: (sql, params) => db.query(sql, params), end: async () => { closed = true; } }) });
    assert.equal(closed, true);
    assert.equal(result.catalog[0][0].tracker_schema_exists, true);
    assert.equal(result.catalog[3].length, 6);
    const effective = result.catalog.flat().filter(row => row.rolname === 'anon' && row.relname === 'sync_records');
    assert.equal(effective[0].can_select, false);
    assert.equal(effective[0].can_insert, false);
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM tracker_sync.sync_accounts')).rows[0].count, 0);
    closed = false;
    await assert.rejects(operator.runOperator('inspect', review(), { execute: true, env, connect: async () => ({ query: async sql => { if (sql === 'ROLLBACK') return {}; throw Error('PRIVATE_DATABASE_DETAILS'); }, end: async () => { closed = true; } }) }), /PRIVATE_DATABASE_DETAILS/);
    assert.equal(closed, true);
  } finally { await db.close(); }
});

test('preexisting runtime direct grants are removed before it receives gateway membership', async () => {
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);CREATE ROLE tracker_preview_runtime NOLOGIN;ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO tracker_preview_runtime;ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO tracker_preview_runtime;');
    await db.exec((await operator.runOperator('prepare', review())).sql);
    await db.exec('SET ROLE tracker_preview_runtime');
    await assert.rejects(db.query('SELECT * FROM tracker_sync.sync_accounts'), /permission denied/);
    await assert.rejects(db.query('SELECT tracker_sync.set_scope($1::uuid,$2::text,$3::text)', [uid, 'preview', 'abcdefghijklmnopqrst']), /permission denied/);
  } finally { await db.close(); }
});

test('ownership wrapper works as non-superuser postgres with role creation authority', async () => {
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE qa_admin SUPERUSER LOGIN;SET SESSION AUTHORIZATION qa_admin;ALTER ROLE postgres RENAME TO bootstrap_admin;CREATE ROLE postgres LOGIN CREATEROLE CREATEDB;GRANT CREATE ON DATABASE postgres TO postgres;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);GRANT USAGE ON SCHEMA auth TO postgres;GRANT REFERENCES ON auth.users TO postgres;SET SESSION AUTHORIZATION postgres;');
    await db.exec((await operator.runOperator('prepare', review())).sql);
    assert.equal((await db.query("SELECT rolsuper FROM pg_roles WHERE rolname=current_user")).rows[0].rolsuper, false);
    assert.equal((await db.query("SELECT pg_has_role('postgres','tracker_sync_owner','SET') AS can_set,pg_has_role('postgres','tracker_sync_owner','USAGE') AS can_inherit")).rows[0].can_set, false);
    assert.equal((await db.query("SELECT pg_has_role('postgres','tracker_sync_owner','USAGE') AS can_inherit")).rows[0].can_inherit, false);
    assert.equal((await db.query("SELECT count(*)::integer AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='tracker_sync' AND r.rolname='tracker_sync_owner'")).rows[0].count, 10);
    await db.exec('SET SESSION AUTHORIZATION qa_admin');
    await db.query('INSERT INTO auth.users VALUES($1,now())', [uid]);
    await db.exec('GRANT SELECT ON auth.users TO postgres;SET SESSION AUTHORIZATION postgres');
    const before = (await db.query("SELECT m.* FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid WHERE parent.rolname='tracker_gateway' ORDER BY m.member,m.grantor")).rows;
    assert.deepEqual(await operator.provisionRegistrations((sql, params) => db.query(sql, params), review()), { registered: 1 });
    const after = (await db.query("SELECT m.* FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid WHERE parent.rolname='tracker_gateway' ORDER BY m.member,m.grantor")).rows;
    assert.deepEqual(after, before);
    assert.equal((await db.query("SELECT pg_has_role('postgres','tracker_gateway','SET') AS can_set")).rows[0].can_set, false);
  } finally { await db.close(); }
});

test('NOINHERIT runtime cannot silently pass preparation with unusable gateway membership', async () => {
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);CREATE ROLE tracker_preview_runtime NOLOGIN NOINHERIT;');
    await assert.rejects(db.exec((await operator.runOperator('prepare', review())).sql), /unsafe_runtime_role/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT to_regnamespace('tracker_sync') IS NULL AS absent")).rows[0].absent, true);
  } finally { await db.close(); }
});

test('existing gateway membership is made inheritable without SET or ADMIN authority for runtime', async () => {
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  for (const initiallyCanSet of [false, true]) {
    const db = new PGlite();
    try {
      await db.exec(`CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);CREATE ROLE tracker_gateway NOLOGIN;CREATE ROLE tracker_preview_runtime NOLOGIN INHERIT;GRANT tracker_gateway TO tracker_preview_runtime WITH ADMIN TRUE, INHERIT FALSE, SET ${initiallyCanSet};`);
      await db.exec((await operator.runOperator('prepare', review())).sql);
      const permissions = (await db.query("SELECT pg_has_role('tracker_preview_runtime','tracker_gateway','USAGE') AS can_inherit,pg_has_role('tracker_preview_runtime','tracker_gateway','SET') AS can_set,pg_has_role('tracker_preview_runtime','tracker_sync_owner','MEMBER') AS helper,m.admin_option FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles member ON member.oid=m.member WHERE parent.rolname='tracker_gateway' AND member.rolname='tracker_preview_runtime'")).rows;
      assert.deepEqual(permissions, [{ can_inherit: true, can_set: false, helper: false, admin_option: false }]);
      await db.query('INSERT INTO auth.users VALUES($1,now())', [uid]);
      await db.exec('SET ROLE tracker_preview_runtime');
      const result = await db.query('SELECT tracker_sync.register_account_device($1::uuid,$2::text,$3::text,$4::uuid) AS registration', [uid, 'preview', 'abcdefghijklmnopqrst', deviceId]);
      assert.equal(result.rows[0].registration.registered, true);
    } finally { await db.close(); }
  }
});

test('runtime gateway privileges from another grantor cannot retain ADMIN or SET authority', async () => {
  const { PGlite } = await import('../cloud/node_modules/@electric-sql/pglite/dist/index.js');
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE qa_admin SUPERUSER LOGIN;SET SESSION AUTHORIZATION qa_admin;ALTER ROLE postgres RENAME TO bootstrap_admin;CREATE ROLE postgres LOGIN CREATEROLE CREATEDB;GRANT CREATE ON DATABASE postgres TO postgres;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz);GRANT USAGE ON SCHEMA auth TO postgres;GRANT REFERENCES ON auth.users TO postgres;CREATE ROLE tracker_gateway NOLOGIN;CREATE ROLE tracker_preview_runtime NOLOGIN INHERIT;GRANT tracker_gateway TO tracker_preview_runtime WITH ADMIN TRUE,INHERIT FALSE,SET TRUE;GRANT tracker_gateway TO postgres WITH ADMIN TRUE,INHERIT FALSE,SET FALSE;SET SESSION AUTHORIZATION postgres;');
    await assert.rejects(db.exec((await operator.runOperator('prepare', review())).sql), /unsafe_runtime_role/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT to_regnamespace('tracker_sync') IS NULL AS absent")).rows[0].absent, true);
  } finally { await db.close(); }
});
