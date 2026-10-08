import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOperation, validateProjection, operationFingerprint, createGateway, createSqlStore, createIdentityVerifier } from '../cloud/gateway.js';

const uid = '11111111-1111-4111-8111-111111111111';
const device = '22222222-2222-4222-8222-222222222222';
const opId = '33333333-3333-4333-8333-333333333333';
const food = { id: 'legacy:food-1', name: 'Synthetic rice', serving: 'portion', calories: 100, protein: 2, carbs: 20, fat: 1, notes: '' };
const operation = () => ({ protocolVersion: 1, commandType: 'import-records', deviceId: device, operationId: opId, dependencies: [], changes: [{ kind: 'food', recordId: food.id, action: 'create', baseRevision: null, payloadSchema: 8, payload: food }] });

test('gateway strict envelope accepts legacy IDs and rejects client identity, trusted fields and unsupported versions', () => {
  assert.deepEqual(validateOperation(operation()), operation());
  for (const patch of [{ uid }, { validatedHead: '0' }, { protocolVersion: 2 }, { dependencies: ['other'] }]) assert.throws(() => validateOperation({ ...operation(), ...patch }));
  for (const patch of [{ payloadSchema: 9 }, { baseRevision: '01' }, { action: 'create', baseRevision: '1' }, { recordId: 'mismatch' }]) assert.throws(() => validateProjection({ headSequence: '0', records: [] }, { ...operation(), changes: [{ ...operation().changes[0], ...patch }] }));
});
test('gateway rejects invalid payload, duplicate changes and secrets without returning private values', () => {
  assert.throws(() => validateOperation({ ...operation(), changes: Array(101).fill(operation().changes[0]) }));
  assert.throws(() => validateOperation({ ...operation(), changes: [operation().changes[0], operation().changes[0]] }));
  assert.throws(() => validateProjection({ headSequence: '0', records: [] }, { ...operation(), changes: [{ ...operation().changes[0], payload: { ...food, calories: -1 } }] }));
  assert.throws(() => validateOperation({ ...operation(), changes: [{ ...operation().changes[0], payload: { ...food, access_token: 'PRIVATE' } }] }), /invalid_payload/);
});
test('canonical fingerprint is key-order independent but array-order sensitive', () => {
  assert.equal(operationFingerprint({ a: 1, b: 2 }), operationFingerprint({ b: 2, a: 1 }));
  assert.notEqual(operationFingerprint({ a: [1, 2] }), operationFingerprint({ a: [2, 1] }));
});
test('shared live workout cannot carry a device history-edit baseline', () => {
  const session = { id: 'session', workout: 'A', date: '2026-10-08', week: 1, sets: [] };
  const request = { ...operation(), changes: [{ kind: 'workout', recordId: session.id, action: 'create', baseRevision: null, payloadSchema: 8, phase: 'live', payload: { ...session, historyEditBase: session } }] };
  assert.throws(() => validateProjection({ headSequence: '0', records: [] }, request), /history_baseline_device_only/);
});
test('gateway verifies account scope before SQL, writes disabled by default', async () => {
  let calls = 0;
  const gateway = createGateway({ verifyIdentity: async () => ({ uid }), store: { push() { calls++; } }, environment: 'test', projectId: 'synthetic' });
  assert.equal((await gateway.handle({ route: 'push', authorization: 'Bearer opaque', body: operation() })).code, 'writes_disabled');
  assert.equal(calls, 0);
});
test('gateway authenticates every read and ignores frontend supplied UID', async () => {
  let called = false;
  const gateway = createGateway({ verifyIdentity: async () => { throw Error('PRIVATE PROVIDER RESPONSE'); }, store: { pull() { called = true; } }, environment: 'test', projectId: 'synthetic' });
  assert.deepEqual(await gateway.handle({ route: 'pull', authorization: '', body: { afterSequence: '0', limit: 1 } }), { status: 'error', code: 'unauthorized' });
  assert.equal(called, false);
});
test('retry checks persisted receipt before changed projection and detects operation reuse', async () => {
  let reads = 0; const request = operation(); const receipt = { status: 'applied', commitSequence: '1' };
  const gateway = createGateway({ verifyIdentity: async () => ({ uid }), environment: 'test', projectId: 'synthetic', allowWrites: true,
    store: { async lookupReceipt() { return receipt; }, async readState() { reads++; }, async push(scope, op, fingerprint) { assert.equal(scope.uid, uid); assert.equal(fingerprint, operationFingerprint(request)); return receipt; } } });
  assert.deepEqual(await gateway.handle({ route: 'push', authorization: 'Bearer opaque', body: request }), receipt);
  assert.equal(reads, 0);
});
test('gateway derives head/read set from current state rather than browser', async () => {
  const gateway = createGateway({ verifyIdentity: async () => ({ uid }), environment: 'test', projectId: 'synthetic', allowWrites: true,
    store: { async lookupReceipt() { return null; }, async readState() { return { headSequence: '0', records: [] }; }, async push(scope, op) { assert.equal(op.validatedHead, '0'); assert.deepEqual(op.readSet, []); return { status: 'applied' }; } } });
  assert.equal((await gateway.handle({ route: 'push', authorization: 'Bearer opaque', body: operation() })).status, 'applied');
});
test('SQL store uses only fixed SQL texts and parameter values', async () => {
  const queries = []; const store = createSqlStore(async (sql, params) => { queries.push({ sql, params }); return { rows: [{ result: { ok: true } }] }; });
  const scope = { uid, environment: 'test', projectId: "x');DROP TABLE private;--" };
  await store.pull(scope, '0', 2); await store.bootstrap(scope, null, null, 2); await store.push(scope, operation(), 'fingerprint');
  assert.ok(queries.every(q => !q.sql.includes(scope.projectId) && q.params.includes(scope.projectId)));
  assert.ok(queries.every(q => /^SELECT tracker_sync\./.test(q.sql)));
});
test('identity verifier rejects missing/expired/wrong issuer before authoritative fixed-project lookup', async () => {
  let calls = 0; const projectUrl = 'https://syntheticproject.supabase.co';
  const verify = createIdentityVerifier({ projectUrl, publishableKey: 'sb_publishable_test', now: () => 100000, fetchImpl: async (url, options) => { calls++; assert.equal(url, projectUrl + '/auth/v1/user'); assert.equal(options.redirect, 'error'); return { ok: true, json: async () => ({ id: uid, role: 'authenticated', aud: 'authenticated', email_confirmed_at: 'synthetic' }) }; } });
  const token = patch => 'header.' + Buffer.from(JSON.stringify({ iss: projectUrl + '/auth/v1', aud: 'authenticated', exp: 200, sub: uid, ...patch })).toString('base64url') + '.signature';
  for (const authorization of ['', 'Bearer ' + token({ exp: 50 }), 'Bearer ' + token({ iss: 'https://other.supabase.co/auth/v1' })]) await assert.rejects(() => verify(authorization));
  assert.equal(calls, 0); assert.equal((await verify('Bearer ' + token({}))).uid, uid); assert.equal(calls, 1);
});
test('identity verifier requires authoritative UID matching untrusted JWT subject', async () => {
  const url = 'https://syntheticproject.supabase.co';
  const verify = createIdentityVerifier({ projectUrl: url, publishableKey: 'sb_publishable_test', now: () => 100000, fetchImpl: async () => ({ ok: true, json: async () => ({ id: device }) }) });
  const token = 'h.' + Buffer.from(JSON.stringify({ iss: url + '/auth/v1', aud: 'authenticated', exp: 200, sub: uid })).toString('base64url') + '.s';
  await assert.rejects(() => verify('Bearer ' + token));
});
