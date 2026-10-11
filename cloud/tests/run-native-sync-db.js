import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createSqlStore, operationFingerprint, validateOperation, validateProjection } from '../gateway.js';
import { assertGatewayConnection } from '../server.js';

// LOCAL CODE ONLY until a separately approved preview run supplies both env vars.
// Prerequisites: migrations 001 + 002 already installed; two dedicated synthetic
// Auth UIDs, active preview accounts, and both device IDs registered on both UIDs.
// Operator provisions those fixtures separately. This runner never provisions,
// migrates, resets or cleans up. Every record ID is native-qa:<fresh run UUID>:*.
// TRACKER_NATIVE_REVIEWED_SCOPE JSON fields are demonstrated in the local tests.
// approval must be preview-synthetic-sql-writes, syntheticRegisteredFixtures true,
// expiresAt within 24 hours, environment preview; projectId is the Supabase ref.
// TRACKER_NATIVE_DATABASE_URL must use the reviewed restricted login, direct
// db.<projectId>.supabase.co:5432/postgres, sslmode=verify-full (no other options).
// Both accounts must contain only native-qa records and have no other writers.
// TLS uses the runtime trust store. No connection strings or SQL errors printed.
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const requireValue = value => { if (!value) throw Error('invalid_reviewed_scope'); };

export function reviewedNativeConfig(env, now = Date.now()) {
  const review = JSON.parse(env.TRACKER_NATIVE_REVIEWED_SCOPE);
  requireValue(review?.approval === 'preview-synthetic-sql-writes' && review.syntheticRegisteredFixtures === true && review.environment === 'preview');
  requireValue(/^[a-z]{20}$/.test(review.projectId) && /^[a-z][a-z0-9_]{2,62}$/.test(review.databaseUser)
    && !/^(postgres|supabase|service_role|tracker_sync_owner|anon|authenticated)$/.test(review.databaseUser));
  requireValue([review.uids, review.deviceIds].every(values => Array.isArray(values) && values.length === 2 && values.every(uuid) && new Set(values.map(v => v.toLowerCase())).size === 2));
  requireValue(uuid(review.runId));
  const expiry = Date.parse(review.expiresAt);
  requireValue(Number.isFinite(expiry) && expiry > now && expiry - now <= 24 * 60 * 60 * 1000);
  requireValue(env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0');
  const url = new URL(env.TRACKER_NATIVE_DATABASE_URL);
  requireValue(['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname === `db.${review.projectId}.supabase.co`
    && url.port === '5432' && url.pathname === '/postgres' && !url.hash && decodeURIComponent(url.username) === review.databaseUser && url.password.length > 0
    && [...url.searchParams].length === 1 && url.searchParams.get('sslmode') === 'verify-full');
  // Explicit verified TLS avoids pg connection-string SSL option overrides.
  url.search = '';
  return { scope: { environment: 'preview', projectId: review.projectId }, uids: review.uids.map(v => v.toLowerCase()),
    deviceIds: review.deviceIds.map(v => v.toLowerCase()), runId: review.runId.toLowerCase(),
    client: { connectionString: url.href, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10000,
      statement_timeout: 15000, query_timeout: 20000, application_name: 'tracker-native-qa' } };
}

const food = (id, name = 'Synthetic native QA') => ({ id, name, serving: 'portion', notes: '', calories: 100, protein: 2, carbs: 20, fat: 1 });
const change = (payload, action = 'create', baseRevision = null) => ({ kind: 'food', recordId: payload.id, action, baseRevision, payloadSchema: 8, payload });

export async function runProtocolAcceptance({ config, stores, contend, nativeConcurrencyVerified = false }) {
  const [a, b] = stores, scope = { ...config.scope, uid: config.uids[0] }, other = { ...config.scope, uid: config.uids[1] };
  const prefix = `native-qa:${config.runId}:`;
  const [initial, initialOther] = await Promise.all([a.readState(scope), b.readState(other)]);
  for (const state of [initial, initialOther]) {
    assert.ok(state.records.length <= 200 && state.records.every(r => r.recordId.startsWith('native-qa:')), 'dedicated_synthetic_accounts_required');
    assert.ok(!state.records.some(r => r.recordId.startsWith(prefix)), 'run_id_already_used');
  }
  const operation = (commandType, changes, deviceId = config.deviceIds[0]) => ({ protocolVersion: 1, operationId: randomUUID(), deviceId, commandType, dependencies: [], changes });
  const prepared = async (op, store = a, target = scope) => validateProjection(await store.readState(target), validateOperation(op));
  // Fingerprint binds the public intent, excluding the gateway-derived read set.
  const submit = (store, target, op) => {
    const { validatedHead, readSet, ...intent } = op;
    return store.push(target, op, operationFingerprint(intent));
  };
  const seed = await prepared(operation('import-records', [change(food(prefix + 'shared')), change(food(prefix + 'anchor'))]));
  const [receiptA, receiptB] = await contend([() => submit(a, scope, seed), () => submit(b, scope, seed)]);
  assert.equal(receiptA.status, 'applied'); assert.deepEqual(receiptB, receiptA, 'concurrent exact retry must share receipt');
  assert.equal(receiptA.commitSequence, (BigInt(initial.headSequence) + 1n).toString());
  assert.deepEqual(await b.lookupReceipt(scope, seed.operationId), receiptA);
  assert.deepEqual(await submit(b, scope, seed), receiptA, 'lost acknowledgement retry');
  const changedIntent = structuredClone(seed); changedIntent.changes[0].payload.calories++;
  assert.equal((await submit(b, scope, changedIntent)).code, 'operation_id_reused');

  const shared = food(prefix + 'shared');
  const candidates = await Promise.all(config.deviceIds.map((id, i) => prepared(operation('update-records', [change({ ...shared, name: `Synthetic writer ${i}` }, 'update', '1')], id), stores[i])));
  const outcomes = await contend(candidates.map((op, i) => () => submit(stores[i], scope, op)));
  assert.deepEqual(outcomes.map(r => r.status).sort(), ['applied', 'conflict'], 'only one CAS writer commits');
  const loser = outcomes.findIndex(r => r.status === 'conflict');
  assert.equal(outcomes[loser].code, 'stale_validation');
  assert.deepEqual(await submit(b, scope, candidates[loser]), outcomes[loser], 'conflict receipt retry');
  const afterRace = await a.readState(scope);
  assert.equal(afterRace.headSequence, (BigInt(receiptA.commitSequence) + 1n).toString());
  assert.equal(afterRace.records.find(r => r.recordId === shared.id).revision, '2');

  // A current head/read set cannot authorize a stale record revision either.
  const staleRevision = { ...operation('update-records', [change(shared, 'update', '1')], config.deviceIds[1]),
    validatedHead: afterRace.headSequence, readSet: afterRace.records.map(r => ({ kind: r.kind, recordId: r.recordId, revision: r.revision })) };
  const staleReceipt = await submit(b, scope, staleRevision);
  assert.equal(staleReceipt.status, 'conflict'); assert.equal(staleReceipt.code, 'revision_conflict');
  assert.deepEqual(await submit(a, scope, staleRevision), staleReceipt);
  assert.deepEqual(await a.readState(scope), afterRace);

  // Deliberately bypass projection validation for one SQL fault: the first change
  // would write, then the second collides. SQL must roll back records/versions/head
  // while retaining only the terminal conflict receipt for this operation.
  const fault = { ...operation('import-records', [change(food(prefix + 'rollback-created')), change(shared)]),
    validatedHead: afterRace.headSequence, readSet: afterRace.records.map(r => ({ kind: r.kind, recordId: r.recordId, revision: r.revision })) };
  const rejected = await submit(a, scope, fault);
  assert.equal(rejected.status, 'conflict'); assert.equal(rejected.code, 'create_collision');
  assert.deepEqual(await b.readState(scope), afterRace, 'compound failure leaves all current records and head unchanged');
  assert.deepEqual(await b.lookupReceipt(scope, fault.operationId), rejected);
  assert.deepEqual(await submit(b, scope, fault), rejected);
  assert.deepEqual((await a.pull(scope, afterRace.headSequence, 100)).groups, [], 'no versions/feed commit from rollback');

  const snapshot = await a.bootstrap(scope, null, null, 1), H = snapshot.headSequence;
  const expectedSnapshot = afterRace.records.slice().sort((x, y) => x.kind.localeCompare(y.kind) || x.recordId.localeCompare(y.recordId));
  const updated = await prepared(operation('update-records', [change({ ...shared, name: 'Synthetic after H' }, 'update', '2')], config.deviceIds[1]), b);
  assert.equal((await submit(b, scope, updated)).status, 'applied');
  const late = await prepared(operation('import-records', [change(food(prefix + 'after-head'))]), b);
  assert.equal((await submit(b, scope, late)).status, 'applied');
  let page = snapshot, fixed = [...page.records], pages = 0;
  while (page.hasMore) {
    assert.ok(++pages <= 201, 'bounded_snapshot');
    page = await a.bootstrap(scope, H, page.cursor, 1);
    assert.equal(page.headSequence, H); assert.equal(page.snapshotRecordCount, snapshot.snapshotRecordCount);
    fixed.push(...page.records);
  }
  assert.equal(fixed.length, snapshot.snapshotRecordCount); assert.deepEqual(fixed, expectedSnapshot, 'snapshot remains exact at H');
  const feed = await a.pull(scope, H, 100);
  assert.deepEqual(feed.groups.map(g => g.commitSequence), [(BigInt(H) + 1n).toString(), (BigInt(H) + 2n).toString()]);
  assert.deepEqual(feed.groups.map(g => g.operationId), [updated.operationId, late.operationId]);
  assert.ok(feed.groups.every(g => g.recordCount === g.records.length));
  assert.ok(!feed.groups.some(g => g.operationId === fault.operationId));
  assert.ok(!feed.groups.flatMap(g => g.records).some(r => r.recordId === prefix + 'rollback-created'), 'no leaked rollback version in later commits');

  const isolated = await prepared(operation('import-records', [change(food(prefix + 'other-uid'))], config.deviceIds[1]), b, other);
  const isolatedReceipt = await submit(b, other, isolated);
  assert.equal(isolatedReceipt.status, 'applied');
  assert.equal(isolatedReceipt.commitSequence, (BigInt(initialOther.headSequence) + 1n).toString());
  assert.equal(await b.lookupReceipt(other, seed.operationId), null);
  assert.equal(await a.lookupReceipt(scope, isolated.operationId), null);
  assert.deepEqual((await b.readState(other)).records.filter(r => r.recordId.startsWith(prefix)).map(r => r.recordId), [prefix + 'other-uid']);
  assert.ok(!(await a.readState(scope)).records.some(r => r.recordId === prefix + 'other-uid'));
  return { status: 'passed', nativeConcurrencyVerified };
}

// Observe actual server lock waiting while session A retains the account lock.
// Distinct backend PIDs + wait_event_type=Lock are required, not inferred from
// Promise.all or timing. Only direct connections are accepted by configuration.
async function nativeContend(clients, backendB, tasks) {
  await clients[0].query('BEGIN');
  let pending;
  try {
    const first = await tasks[0]();
    pending = tasks[1]();
    // Attach immediately so a query failure cannot become an unhandled rejection.
    pending.catch(() => {});
    let waiting = false;
    for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
      await clients[0].query('SELECT pg_catalog.pg_stat_clear_snapshot()');
      const result = await clients[0].query("SELECT wait_event_type = 'Lock' AS waiting FROM pg_catalog.pg_stat_activity WHERE pid=$1::integer", [backendB]);
      waiting = result.rows[0]?.waiting === true;
      if (!waiting) await delay(20);
    }
    assert.ok(waiting, 'native_lock_contention_not_observed');
    await clients[0].query('COMMIT');
    return [first, await pending];
  } catch (error) {
    await clients[0].query('ROLLBACK').catch(() => {});
    await pending?.catch(() => {});
    throw error;
  }
}

export async function runNative({ env = process.env, now = Date.now(), connect } = {}) {
  if (!env.TRACKER_NATIVE_REVIEWED_SCOPE) return { status: 'not_verified', reason: 'approval_required' };
  let config;
  try { config = reviewedNativeConfig(env, now); } catch { return { status: 'not_verified', reason: 'invalid_reviewed_scope' }; }
  const clients = [];
  try {
    if (!connect) {
      const { Client } = await import('pg');
      connect = async options => { const client = new Client(options); try { await client.connect(); return client; } catch (error) { await client.end().catch(() => {}); throw error; } };
    }
    for (let i = 0; i < 2; i++) {
      const client = await connect(config.client); clients.push(client);
      await assertGatewayConnection((sql, args) => client.query(sql, args));
    }
    const pids = await Promise.all(clients.map(client => client.query('SELECT pg_catalog.pg_backend_pid() AS pid')));
    assert.notEqual(pids[0].rows[0].pid, pids[1].rows[0].pid, 'independent_native_sessions_required');
    return await runProtocolAcceptance({ config, stores: clients.map(client => createSqlStore((sql, args) => client.query(sql, args))),
      nativeConcurrencyVerified: true, contend: tasks => nativeContend(clients, pids[1].rows[0].pid, tasks) });
  } catch { return { status: 'failed', reason: 'native_acceptance_failed' }; }
  finally { await Promise.allSettled(clients.map(client => client.end())); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runNative();
  process.stdout.write(result.status === 'passed' ? 'PASS native two-connection SQL acceptance. Synthetic fixtures retained.\n'
    : `Native SQL NOT VERIFIED: ${result.reason}. No credentials or query details printed.\n`);
  if (result.status === 'failed') process.exitCode = 1;
}
