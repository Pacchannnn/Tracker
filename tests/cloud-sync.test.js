import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../js/data.js';
import { IDBFactory } from 'fake-indexeddb';
import { createAccountStore } from '../js/cloud-store.js';
import { createSyncEngine } from '../js/cloud-sync.js';
const uid = '11111111-1111-4111-8111-111111111111';
const device = '22222222-2222-4222-8222-222222222222';
const opId = '33333333-3333-4333-8333-333333333333';
const nextId = '44444444-4444-4444-8444-444444444444';
const scope = { uid, environment: 'test', projectId: 'synthetic' };
const food = name => ({ id: 'food', name, serving: 'portion', calories: 100, protein: 2, carbs: 20, fat: 1, notes: '' });
const record = (name, revision = '1', commitSequence = revision, deleted = false) => ({ kind: 'food', recordId: 'food', revision, commitSequence, position: '0', payloadSchema: 8, payload: food(name), phase: null, deviceId: null, sourceSessionId: null, deleted });
const secondRecord = () => ({ ...record('other'), recordId: 'food-2', position: '1', payload: { ...food('other'), id: 'food-2' } });
const intent = (name = 'local', id = opId, before = null) => ({ id, commandType: before ? 'update-records' : 'import-records', state: 'queued', request: null, dependsOn: [], changes: [{ kind: 'food', recordId: 'food', action: before ? 'update' : 'create', payloadSchema: 8, payload: food(name), before, after: { kind: 'food', recordId: 'food', payloadSchema: 8, payload: food(name) } }] });
function memoryStore({ initialized = true, shadow = [], outbox = [], cursor = '0' } = {}) {
  let state = { version: 1, scope, deviceId: device, schema: 8, localRevision: 0, data: emptyData(), shadow, outbox, conflicts: [], cursor, initialized, bootstrap: null, selectedLiveId: null };
  let sealed = false;
  return {
    async read() { if (sealed) throw Error('workspace_sealed'); return structuredClone(state); },
    async transact(_scope, revision, fn) { if (sealed) throw Error('workspace_sealed'); if (revision !== state.localRevision) throw Error('workspace_changed'); const copy = structuredClone(state); fn(copy); if (sealed) throw Error('workspace_sealed'); copy.localRevision++; state = copy; return structuredClone(state); },
    seal() { sealed = true; },
    peek() { return structuredClone(state); }
  };
}
function engine(store, call, options = {}) {
  assert.equal(typeof createSyncEngine, 'function', 'sync engine must exist');
  const { rawProtocol = false, ...settings } = options;
  return createSyncEngine({ store, scope, transport: { call: rawProtocol ? call : counted(call) }, isCurrent: () => true, ...settings });
}
const emptyPull = cursor => ({ headSequence: cursor, afterSequence: cursor, groups: [], hasMore: false });
function counted(call) {
  return async (...args) => {
    const response = await call(...args);
    if (response?.groups) for (const group of response.groups) group.recordCount ??= group.records?.length;
    if (args[0] === 'bootstrap' && response?.records) response.snapshotRecordCount ??= 2;
    return response;
  };
}

test('bootstrap stages fixed-H pages durably and publishes only a complete validated snapshot', async () => {
  const store = memoryStore({ initialized: false }); let page = 0;
  const sync = engine(store, async (route, body) => {
    if (route === 'pull') return emptyPull('2');
    assert.equal(route, 'bootstrap');
    if (++page === 1) { assert.equal(body.headSequence, null); return { headSequence: '2', records: [record('remote')], cursor: { kind: 'food', recordId: 'food' }, hasMore: true }; }
    assert.equal(body.headSequence, '2'); assert.equal(store.peek().initialized, false); assert.deepEqual(store.peek().data.foods, []);
    return { headSequence: '2', records: [secondRecord()], cursor: null, hasMore: false };
  });
  await sync.sync(); assert.equal(store.peek().initialized, true); assert.equal(store.peek().cursor, '2'); assert.equal(store.peek().data.foods[0].name, 'remote'); assert.equal((await sync.status()).status, 'synced');
});
test('interrupted bootstrap resumes its exact persisted head and cursor after reload', async () => {
  const store = memoryStore({ initialized: false }); let calls = 0;
  await engine(store, async () => { if (++calls === 1) return { headSequence: '2', records: [record('remote')], cursor: { kind: 'food', recordId: 'food' }, hasMore: true }; throw Error('offline'); }).sync();
  assert.equal(store.peek().initialized, false); assert.equal(store.peek().bootstrap.headSequence, '2');
  await engine(store, async (route, body) => { if (route === 'pull') return emptyPull('2'); assert.equal(body.headSequence, '2'); assert.deepEqual(body.cursor, { kind: 'food', recordId: 'food' }); return { headSequence: '2', records: [secondRecord()], cursor: null, hasMore: false }; }).sync();
  assert.equal(store.peek().data.foods[0].name, 'remote');
});
test('lost acknowledgement retains exact frozen wire request across reload and retires via validated receipt', async () => {
  const store = memoryStore({ outbox: [intent()] }); let sent;
  await engine(store, async (route, body) => { if (route === 'pull') return emptyPull('0'); sent = structuredClone(body); throw Error('offline'); }).sync();
  assert.equal(store.peek().outbox.length, 1); assert.deepEqual(store.peek().outbox[0].request, sent);
  let retried;
  await engine(store, async (route, body) => { if (route === 'pull') return emptyPull('0'); retried = body; return { status: 'applied', operationId: opId, commitSequence: '1', records: [record('local')] }; }).sync();
  assert.deepEqual(retried, sent); assert.equal(store.peek().outbox.length, 0); assert.equal(store.peek().shadow[0].payload.name, 'local');
});
test('partial acknowledgement cannot retire any intent or publish any accepted state', async () => {
  const store = memoryStore({ outbox: [intent()] });
  await engine(store, async route => route === 'pull' ? emptyPull('0') : { status: 'applied', operationId: opId, commitSequence: '1', records: [] }).sync();
  assert.equal(store.peek().outbox.length, 1); assert.deepEqual(store.peek().shadow, []); assert.equal((await engine(store, async () => {}).status()).status, 'error');
});
test('forged acknowledgement identity, revision, payload and deleted flag fail closed', async () => {
  for (const patch of [{ operationId: nextId }, { records: [record('local', '3')] }, { records: [record('wrong')] }, { records: [record('local', '1', '1', true)] }]) {
    const store = memoryStore({ outbox: [intent()] });
    await engine(store, async route => route === 'pull' ? emptyPull('0') : { status: 'applied', operationId: opId, commitSequence: '1', records: [record('local')], ...patch }).sync();
    assert.equal(store.peek().outbox.length, 1); assert.deepEqual(store.peek().shadow, []);
  }
});
test('an old acknowledgement preserves a newer queued local candidate and binds successor after receipt', async () => {
  const first = intent('first'); const second = intent('second', nextId, { kind: 'food', recordId: 'food', payload: food('first') }); second.dependsOn = [opId];
  const store = memoryStore({ outbox: [first, second] }); let calls = 0;
  await engine(store, async (route, body) => {
    if (route === 'pull') return emptyPull('0');
    if (++calls === 1) return { status: 'applied', operationId: opId, commitSequence: '1', records: [record('first')] };
    assert.equal(store.peek().data.foods[0].name, 'second'); assert.equal(body.changes[0].baseRevision, '1'); assert.deepEqual(body.dependencies, []);
    return { status: 'applied', operationId: nextId, commitSequence: '2', records: [record('second', '2')] };
  }).sync();
  assert.equal(store.peek().data.foods[0].name, 'second'); assert.equal(store.peek().outbox.length, 0);
});
test('own operation in complete pull group recovers lost acknowledgement without resending', async () => {
  const request = { protocolVersion: 1, commandType: 'import-records', deviceId: device, operationId: opId, dependencies: [], changes: [{ kind: 'food', recordId: 'food', action: 'create', baseRevision: null, payloadSchema: 8, payload: food('local') }] };
  const queued = intent(); queued.request = request; queued.requestBase = [null];
  const store = memoryStore({ outbox: [queued] });
  await engine(store, async route => { assert.equal(route, 'pull'); return { headSequence: '1', afterSequence: '1', groups: [{ operationId: opId, commitSequence: '1', records: [record('local')] }], hasMore: false }; }).sync();
  assert.equal(store.peek().outbox.length, 0); assert.equal(store.peek().cursor, '1');
});
test('malformed or noncontiguous pull groups advance no cursor and commit no partial records', async () => {
  for (const response of [
    { headSequence: '2', afterSequence: '2', groups: [{ operationId: opId, commitSequence: '2', records: [record('remote', '1', '2')] }], hasMore: false },
    { headSequence: '1', afterSequence: '1', groups: [{ operationId: opId, commitSequence: '1', records: [{ ...record('remote'), payloadSchema: 9 }] }], hasMore: false }
  ]) {
    const store = memoryStore(); await engine(store, async () => response).sync();
    assert.equal(store.peek().cursor, '0'); assert.deepEqual(store.peek().shadow, []);
  }
});
test('conflict preserves base, local, remote and descendants durably; review remote archives entire reviewed chain', async () => {
  const first = intent('local', opId, record('base')); const second = intent('newer', nextId, { kind: 'food', recordId: 'food', payload: food('local') }); second.dependsOn = [opId];
  const store = memoryStore({ shadow: [record('base')], cursor: '1', outbox: [first, second] });
  const sync = engine(store, async route => route === 'pull' ? { headSequence: '2', afterSequence: '2', groups: [{ operationId: '55555555-5555-4555-8555-555555555555', commitSequence: '2', records: [record('remote', '2')] }], hasMore: false } : { status: 'conflict', operationId: opId, code: 'revision_conflict' });
  await sync.sync(); assert.equal(store.peek().outbox.length, 2); const conflict = store.peek().conflicts[0];
  assert.equal(conflict.base[0].payload.name, 'base'); assert.equal(conflict.local[0].payload.name, 'newer'); assert.equal(conflict.remote[0].payload.name, 'remote');
  assert.equal((await sync.status()).status, 'conflict');
  const review = await sync.readConflict(conflict.id); assert.equal((await sync.resolveConflict(conflict.id, 'remote', review.reviewToken)).applied, true);
  assert.equal(store.peek().outbox.length, 0); assert.equal(store.peek().data.foods[0].name, 'remote'); assert.equal(store.peek().conflicts[0].local[0].payload.name, 'newer');
});
test('explicit local conflict resolution creates new intent on reviewed current revision', async () => {
  const store = memoryStore({ shadow: [record('remote', '2')], cursor: '2', outbox: [intent('local', opId, record('base'))] });
  const sync = engine(store, async route => route === 'pull' ? emptyPull('2') : { status: 'conflict', operationId: opId, code: 'revision_conflict' });
  await sync.sync(); const review = await sync.readConflict(store.peek().conflicts[0].id);
  assert.equal((await sync.resolveConflict(review.id, 'local', review.reviewToken)).applied, true);
  assert.notEqual(store.peek().outbox[0].id, opId); assert.equal(store.peek().outbox[0].changes[0].before.revision, '2');
});
test('edit versus tombstone remains reviewable and cannot resurrect the original key', async () => {
  const store = memoryStore({ shadow: [record('base', '2', '2', true)], cursor: '2', outbox: [intent('local', opId, record('base'))] });
  const sync = engine(store, async route => route === 'pull' ? emptyPull('2') : { status: 'conflict', operationId: opId, code: 'revision_conflict' });
  await sync.sync(); const review = await sync.readConflict(store.peek().conflicts[0].id);
  assert.deepEqual(await sync.resolveConflict(review.id, 'local', review.reviewToken), { applied: false, code: 'copy_required' });
  assert.equal(store.peek().outbox[0].id, opId); assert.equal(store.peek().conflicts[0].status, 'unresolved');
});
test('pausing or changing identity during network callback forbids writes', async () => {
  for (const reason of ['pause', 'identity']) {
    const store = memoryStore(); let current = true, finish;
    const sync = engine(store, () => new Promise(resolve => { finish = resolve; }), { isCurrent: () => current });
    const pending = sync.sync(); while (!finish) await new Promise(resolve => setImmediate(resolve));
    if (reason === 'pause') sync.pause('auth'); else current = false;
    finish({ headSequence: '1', afterSequence: '1', groups: [{ operationId: opId, commitSequence: '1', records: [record('remote')] }], hasMore: false }); await pending;
    assert.equal(store.peek().cursor, '0'); assert.deepEqual(store.peek().shadow, []);
  }
});
test('real IndexedDB account intent binds acknowledged shadow base instead of local projection metadata', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory(), deviceId: device }); await store.open(scope);
  await store.transact(scope, 0, row => { row.initialized = true; row.cursor = '1'; row.shadow = [record('base')]; row.data.foods = [food('base')]; });
  await store.commit(scope, data => { data.foods[0].name = 'local'; }); let sent = false;
  await engine(store, async (route, body) => { if (route === 'pull') return emptyPull('1'); sent = true; assert.equal(body.changes[0].baseRevision, '1'); return { status: 'applied', operationId: body.operationId, commitSequence: '2', records: [record('local', '2')] }; }).sync();
  assert.equal(sent, true); assert.equal((await store.read(scope)).outbox.length, 0); store.seal();
});
test('initial account settings mutation uses create against empty accepted shadow', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory(), deviceId: device }); await store.open(scope);
  await store.transact(scope, 0, row => { row.initialized = true; });
  await store.commit(scope, data => { data.settings.week = 2; });
  let wire;
  await engine(store, async (route, body) => { if (route === 'pull') return emptyPull('0'); wire = body; throw Error('offline'); }).sync();
  assert.equal(wire?.changes[0].action, 'create'); assert.equal(wire.changes[0].baseRevision, null); store.seal();
});
test('account row stale revision retries transaction against latest without losing concurrent local intent', async () => {
  const store = memoryStore(); let failed = false; const transact = store.transact;
  store.transact = (...args) => { if (!failed) { failed = true; return Promise.reject(Error('stale_revision')); } return transact(...args); };
  await engine(store, async () => ({ headSequence: '1', afterSequence: '1', groups: [{ operationId: opId, commitSequence: '1', records: [record('remote')] }], hasMore: false })).sync();
  assert.equal(store.peek().cursor, '1'); assert.equal(store.peek().data.foods[0].name, 'remote');
});
test('malformed foreign payload rolls back its entire group and cursor', async () => {
  const store = memoryStore();
  await engine(store, async () => ({ headSequence: '1', afterSequence: '1', groups: [{ operationId: opId, commitSequence: '1', records: [{ ...record('invalid'), payload: { ...food('invalid'), calories: -1 } }] }], hasMore: false })).sync();
  assert.equal(store.peek().cursor, '0'); assert.deepEqual(store.peek().shadow, []); assert.deepEqual(store.peek().data.foods, []);
});
test('a changed remote baseline during conflict review forbids abandoning either candidate', async () => {
  const store = memoryStore({ shadow: [record('base')], cursor: '1', outbox: [intent('local', opId, record('base'))] });
  const sync = engine(store, async route => route === 'pull' ? emptyPull('1') : { status: 'conflict', operationId: opId, code: 'semantic_conflict' });
  await sync.sync(); const review = await sync.readConflict(store.peek().conflicts[0].id);
  const before = store.peek(); await store.transact(scope, before.localRevision, next => { next.shadow = [record('changed', '2')]; });
  assert.deepEqual(await sync.resolveConflict(review.id, 'remote', review.reviewToken), { applied: false, code: 'review_changed' });
  assert.equal(store.peek().outbox.length, 1); assert.equal(store.peek().conflicts[0].status, 'unresolved');
});
test('real durable outbox survives offline reload without acknowledging local success', async () => {
  const indexedDB = new IDBFactory(); let store = createAccountStore({ indexedDB, deviceId: device }); await store.open(scope);
  await store.commit(scope, data => { data.foods.push(food('offline')); });
  await engine(store, async () => { throw Error('offline'); }).sync(); const pending = (await store.read(scope)).outbox[0].id; store.seal();
  store = createAccountStore({ indexedDB }); await store.open(scope); const reopened = await store.read(scope);
  assert.equal(reopened.data.foods[0].name, 'offline'); assert.equal(reopened.outbox[0].id, pending); assert.equal((await engine(store, async () => {}).status()).status, 'offline'); store.seal();
});
test('resume waits for cancelled attempt then runs a fresh guarded synchronization', async () => {
  const store = memoryStore(); let finish, calls = 0;
  const sync = engine(store, async () => { if (++calls === 1) return new Promise(resolve => { finish = resolve; }); return emptyPull('0'); });
  const first = sync.sync(); while (!finish) await new Promise(resolve => setImmediate(resolve));
  sync.pause(); const resumed = sync.resume(); finish(emptyPull('0')); await Promise.all([first, resumed]); assert.equal(calls, 2); assert.equal((await sync.status()).status, 'synced');
});
test('new local descendants added after a conflict must be included by a fresh explicit review', async () => {
  const first = intent('local', opId, record('base')), store = memoryStore({ shadow: [record('remote', '2')], cursor: '2', outbox: [first] });
  const sync = engine(store, async route => route === 'pull' ? emptyPull('2') : { status: 'conflict', operationId: opId, code: 'revision_conflict' }); await sync.sync();
  const old = await sync.readConflict(store.peek().conflicts[0].id), next = intent('newest', nextId, { kind: 'food', recordId: 'food', payload: food('local') }); next.dependsOn = [opId];
  await store.transact(scope, store.peek().localRevision, row => { row.outbox.push(next); });
  assert.equal((await sync.resolveConflict(old.id, 'remote', old.reviewToken)).applied, false);
  const reviewed = await sync.readConflict(old.id); assert.equal(reviewed.local[0].payload.name, 'newest'); assert.deepEqual(reviewed.intentIds, [opId, nextId]);
  assert.equal((await sync.resolveConflict(old.id, 'remote', reviewed.reviewToken)).applied, true); assert.equal(store.peek().outbox.length, 0);
});
test('foreign compound groups require expected cardinality before cursor advancement', async () => {
  for (const recordCount of [undefined, 2, null, '1']) {
    const store = memoryStore();
    await engine(store, async () => ({ headSequence: '1', afterSequence: '1', groups: [{ operationId: opId, commitSequence: '1', recordCount, records: [record('remote')] }], hasMore: false }), { rawProtocol: true }).sync();
    assert.equal(store.peek().cursor, '0'); assert.deepEqual(store.peek().shadow, []);
  }
});
test('bootstrap snapshot cardinality is fixed across pages and exact before publish', async () => {
  for (const finalCount of [1, 3, undefined]) {
    const store = memoryStore({ initialized: false }); let calls = 0;
    await engine(store, async () => ++calls === 1
      ? { headSequence: '2', snapshotRecordCount: 2, records: [record('remote')], cursor: { kind: 'food', recordId: 'food' }, hasMore: true }
      : { headSequence: '2', snapshotRecordCount: finalCount, records: [], cursor: null, hasMore: false }, { rawProtocol: true }).sync();
    assert.equal(store.peek().initialized, false); assert.deepEqual(store.peek().data.foods, []); assert.equal(store.peek().cursor, '0');
  }
});
test('dependent edits cannot silently bind a newer remote revision even when payload reverted to identical bytes', async () => {
  const queued = intent('next', nextId, { kind: 'food', recordId: 'food', payload: food('first') }); queued.dependsOn = [opId];
  const store = memoryStore({ shadow: [record('first', '3')], cursor: '3', outbox: [queued] });
  await store.transact(scope, 0, next => { next.receipts = [{ operationId: opId, records: [record('first')] }]; });
  let sent = false; await engine(store, async route => { if (route === 'pull') return emptyPull('3'); sent = true; throw Error('offline'); }).sync();
  assert.equal(sent, false); assert.equal(store.peek().outbox.length, 1); assert.equal(store.peek().conflicts[0].status, 'unresolved');
});
test('create/update descendants can be explicitly reviewed into a single current-revision local proposal', async () => {
  const created = intent('created'), edited = intent('latest', nextId, { kind: 'food', recordId: 'food', payload: food('created') }); edited.dependsOn = [opId];
  const store = memoryStore({ shadow: [record('remote')], cursor: '1', outbox: [created, edited] });
  const sync = engine(store, async () => emptyPull('1')); await sync.sync();
  const reviewed = await sync.readConflict(store.peek().conflicts[0].id);
  assert.equal((await sync.resolveConflict(reviewed.id, 'local', reviewed.reviewToken)).applied, true);
  assert.equal(store.peek().outbox.length, 1); assert.equal(store.peek().outbox[0].changes[0].payload.name, 'latest'); assert.equal(store.peek().outbox[0].changes[0].before.revision, '1');
});
test('tombstone propagation removes definition from projection while preserving accepted tombstone envelope', async () => {
  const store = memoryStore({ shadow: [record('base')], cursor: '1' });
  await engine(store, async () => ({ headSequence: '2', afterSequence: '2', groups: [{ operationId: opId, commitSequence: '2', records: [record('base', '2', '2', true)] }], hasMore: false })).sync();
  assert.deepEqual(store.peek().data.foods, []); assert.equal(store.peek().shadow[0].deleted, true); assert.equal(store.peek().cursor, '2');
});
test('a dependency on one record cannot authorize rebasing a different new key onto remote content', async () => {
  const queued = intent('next', nextId, { kind: 'food', recordId: 'food', payload: food('first') }); queued.dependsOn = [opId];
  const remoteOther = secondRecord(), localOther = { ...remoteOther, payload: { ...remoteOther.payload, name: 'local-other' } };
  queued.changes.push({ kind: 'food', recordId: remoteOther.recordId, action: 'create', payloadSchema: 8, before: null, after: localOther, payload: localOther.payload });
  const store = memoryStore({ shadow: [record('first'), remoteOther], cursor: '1', outbox: [queued] });
  await store.transact(scope, 0, next => { next.receipts = [{ operationId: opId, records: [record('first')] }]; });
  let sent = false; await engine(store, async route => { if (route === 'pull') return emptyPull('1'); sent = true; throw Error('offline'); }).sync();
  assert.equal(sent, false); assert.equal(store.peek().conflicts[0].status, 'unresolved');
});
test('acknowledgement cannot rewrite accepted record order or invent source ownership metadata', async () => {
  for (const patch of [{ position: '99' }, { sourceSessionId: 'unrelated-session' }]) {
    const store = memoryStore({ shadow: [record('base')], cursor: '1', outbox: [intent('local', opId, record('base'))] });
    await engine(store, async route => route === 'pull' ? emptyPull('1') : { status: 'applied', operationId: opId, commitSequence: '2', records: [{ ...record('local', '2'), ...patch }] }).sync();
    assert.equal(store.peek().outbox.length, 1); assert.equal(store.peek().shadow[0].payload.name, 'base');
  }
});
