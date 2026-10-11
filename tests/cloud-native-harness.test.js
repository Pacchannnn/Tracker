import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { PGlite } from '../cloud/node_modules/@electric-sql/pglite/dist/index.js';
import { createSqlStore } from '../cloud/gateway.js';

import * as harness from '../cloud/tests/run-native-sync-db.js';
const uids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
const deviceIds = ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'];
const reviewed = () => ({ approval: 'preview-synthetic-sql-writes', syntheticRegisteredFixtures: true,
  environment: 'preview', projectId: 'abcdefghijklmnopqrst', databaseUser: 'tracker_qa_login',
  uids, deviceIds, runId: '55555555-5555-4555-8555-555555555555', expiresAt: '2026-10-11T01:00:00Z' });
const now = Date.parse('2026-10-11T00:00:00Z');
const environment = patch => ({ TRACKER_NATIVE_REVIEWED_SCOPE: JSON.stringify({ ...reviewed(), ...patch }),
  TRACKER_NATIVE_DATABASE_URL: 'postgresql://tracker_qa_login:synthetic@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=verify-full' });

test('native runner defaults to no connection before any approval or URL is inspected', async () => {
  let calls = 0;
  assert.deepEqual(await harness.runNative({ env: { DATABASE_URL: 'do-not-use' }, connect: () => { calls++; throw Error('network forbidden'); } }), { status: 'not_verified', reason: 'approval_required' });
  assert.equal(calls, 0);
});

test('reviewed native scope is exact, expiring, preview-only and TLS restricted', () => {
  const config = harness.reviewedNativeConfig(environment(), now);
  assert.equal(config.scope.environment, 'preview');
  assert.deepEqual(config.uids, uids);
  assert.deepEqual(config.deviceIds, deviceIds);
  assert.equal(config.client.ssl.rejectUnauthorized, true);
  assert.equal(new URL(config.client.connectionString).search, '');
  for (const patch of [{ approval: '' }, { syntheticRegisteredFixtures: false }, { environment: 'production' },
    { uids: [uids[0], uids[0]] }, { deviceIds: [deviceIds[0]] }, { runId: '../outside' },
    { expiresAt: '2026-10-10T00:00:00Z' }, { expiresAt: '2026-10-14T00:00:00Z' }, { databaseUser: 'postgres' }]) {
    assert.throws(() => harness.reviewedNativeConfig(environment(patch), now));
  }
  for (const value of ['postgresql://tracker_qa_login:synthetic@db.otherproject.supabase.co:5432/postgres?sslmode=verify-full',
    'postgresql://tracker_qa_login:synthetic@db.abcdefghijklmnopqrst.supabase.co:6543/postgres?sslmode=verify-full',
    'postgresql://postgres:synthetic@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=verify-full',
    environment().TRACKER_NATIVE_DATABASE_URL.replace('verify-full', 'require'),
    environment().TRACKER_NATIVE_DATABASE_URL + '&sslmode=disable', environment().TRACKER_NATIVE_DATABASE_URL + '&options=-c%20role%3Dpostgres']) {
    assert.throws(() => harness.reviewedNativeConfig({ ...environment(), TRACKER_NATIVE_DATABASE_URL: value }, now));
  }
  assert.throws(() => harness.reviewedNativeConfig({ ...environment(), NODE_TLS_REJECT_UNAUTHORIZED: '0' }, now));
});

test('invalid reviewed native approval stops before connecting and does not return credentials', async () => {
  let calls = 0;
  const result = await harness.runNative({ env: environment({ environment: 'production' }), now,
    connect: () => { calls++; throw Error('synthetic secret'); } });
  assert.deepEqual(result, { status: 'not_verified', reason: 'invalid_reviewed_scope' });
  assert.equal(calls, 0);
});

test('native protocol scenario exercises real local SQL rollback, retry, fixed H and UID isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
    for (const file of ['001_foundation.sql', '002_sync_counts.sql']) await db.exec(await readFile(new URL('../cloud/migrations/' + file, import.meta.url), 'utf8'));
    await db.query('INSERT INTO auth.users(id) VALUES($1),($2)', uids);
    for (const uid of uids) for (const device of deviceIds) await db.query('SELECT tracker_sync.register_account_device($1::uuid,$2::text,$3::text,$4::uuid)', [uid, 'preview', reviewed().projectId, device]);
    await db.exec('SET ROLE tracker_gateway');
    const store = createSqlStore((sql, args) => db.query(sql, args));
    const config = harness.reviewedNativeConfig(environment(), now);
    const result = await harness.runProtocolAcceptance({ config, stores: [store, store],
      // PGlite serial interleaving checks protocol outcomes, never native contention.
      contend: async tasks => [await tasks[0](), await tasks[1]()] });
    assert.equal(result.status, 'passed');
    assert.equal(result.nativeConcurrencyVerified, false);
    const state = await store.readState({ uid: uids[0], environment: 'preview', projectId: reviewed().projectId });
    assert.equal(state.records.filter(r => !r.deleted).length, 3);
    assert.equal(state.records.some(r => r.recordId.endsWith(':rollback-created')), false);
    const other = await store.readState({ uid: uids[1], environment: 'preview', projectId: reviewed().projectId });
    assert.equal(other.records.length, 1);
    await assert.rejects(() => harness.runProtocolAcceptance({ config, stores: [store, store], contend: async () => [] }), /run_id_already_used/);
  } finally { await db.close(); }
});

test('native CLI exits safely with ambient DATABASE_URL and no reviewed approval', () => {
  const env = { ...process.env, DATABASE_URL: 'postgresql://secret:private@unapproved.invalid:5432/postgres' };
  delete env.TRACKER_NATIVE_REVIEWED_SCOPE;
  const result = spawnSync(process.execPath, ['cloud/tests/run-native-sync-db.js'], { cwd: new URL('..', import.meta.url), env, encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /NOT VERIFIED: approval_required/);
  assert.equal(result.stderr, '');
  assert.ok(!result.stdout.includes('secret'));
});

test('native runner rejects privileged sessions before fixture calls and closes them', async () => {
  let ended = 0, calls = 0;
  const result = await harness.runNative({ env: environment(), now, connect: async () => ({
    async query(sql) {
      calls++;
      assert.match(sql, /pg_catalog\.pg_roles/);
      return { rows: [{ permitted: false }] };
    }, async end() { ended++; }
  }) });
  assert.deepEqual(result, { status: 'failed', reason: 'native_acceptance_failed' });
  assert.equal(calls, 1);
  assert.equal(ended, 1);
});
