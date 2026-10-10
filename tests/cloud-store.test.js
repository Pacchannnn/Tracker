import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { createAccountStore } from '../js/cloud-store.js';
const scope = { uid: '11111111-1111-4111-8111-111111111111', environment: 'test', projectId: 'synthetic' };
const device = '22222222-2222-4222-8222-222222222222';
test('account workspace survives reopen with stable installation device and isolated account/project/environment rows', async () => {
  const indexedDB = new IDBFactory(); let store = createAccountStore({ indexedDB, deviceId: device });
  const opened = await store.open(scope); assert.equal(opened.deviceId, device); assert.equal(opened.version, 1);
  await store.commit(scope, data => { data.settings.week = 2; }); store.seal();
  store = createAccountStore({ indexedDB });
  assert.equal((await store.open(scope)).data.settings.week, 2);
  for (const patch of [{ uid: device }, { environment: 'preview' }, { projectId: 'other' }]) assert.equal((await store.open({ ...scope, ...patch })).data.settings.week, 1);
  store.seal();
});
test('projection and outbox commit atomically; failed validation and stale revision preserve previous state', async () => {
  const indexedDB = new IDBFactory(), a = createAccountStore({ indexedDB }), b = createAccountStore({ indexedDB });
  const start = await a.open(scope); await b.open(scope);
  const saved = await a.commit(scope, data => { data.settings.week = 2; }, start.data);
  assert.equal(saved.localRevision, 1); assert.equal(saved.outbox.length, 1);
  await assert.rejects(b.transact(scope, 0, row => { row.data.settings.week = 3; }), /stale/);
  await assert.rejects(a.commit(scope, data => { data.settings.week = 13; }));
  assert.deepEqual(await a.read(scope), saved);
  const noOp = await a.commit(scope, () => {}); assert.deepEqual(noOp, saved);
  a.seal(); b.seal();
});
test('seal and epoch rejection abort writes and prevent stale reads; new instance preserves previous row', async () => {
  const indexedDB = new IDBFactory(); let current = true;
  const store = createAccountStore({ indexedDB, isCurrent: () => current }); await store.open(scope);
  await assert.rejects(store.transact(scope, 0, row => { row.data.settings.week = 2; store.seal(); }), /sealed|abort/i);
  const reopened = createAccountStore({ indexedDB }); assert.equal((await reopened.open(scope)).data.settings.week, 1); reopened.seal();
  const stale = createAccountStore({ indexedDB, isCurrent: () => current }); await stale.open(scope); current = false;
  await assert.rejects(stale.read(scope), /stale|sealed/); stale.seal();
});
test('transaction does not allow asynchronous mutation or malformed scope to leak writes', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope);
  await assert.rejects(store.transact(scope, 0, async row => { row.data.settings.week = 2; }), /synchronous/);
  await assert.rejects(store.open({ ...scope, uid: 'email@example.com' }), /scope/);
  assert.equal((await store.read(scope)).data.settings.week, 1); store.seal();
});
test('scope listing contains only existing rows and never creates anonymous or other account workspaces', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() });
  assert.deepEqual(await store.listScopes(), []);
  await store.open(scope); assert.deepEqual(await store.listScopes(), [scope]);
  await assert.rejects(store.read({ ...scope, uid: device }), /not_open/);
  assert.deepEqual(await store.listScopes(), [scope]); store.seal();
});
test('throwing after editing both projection and queue aborts the entire readwrite transaction', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); const before = await store.open(scope);
  await assert.rejects(store.transact(scope, 0, row => { row.data.settings.week = 2; row.outbox.push({ id: 'partial' }); throw Error('synthetic failure'); }), /synthetic failure/);
  assert.deepEqual(await store.read(scope), before); store.seal();
});
test('serialized latest-row mutations in two tabs keep both independent edits and outbox intents', async () => {
  const indexedDB = new IDBFactory(), a = createAccountStore({ indexedDB }), b = createAccountStore({ indexedDB }); await a.open(scope); await b.open(scope);
  await Promise.all([a.commit(scope, data => { data.settings.week = 2; }), b.commit(scope, data => { data.settings.protein = 130; })]);
  const saved = await a.read(scope); assert.equal(saved.data.settings.week, 2); assert.equal(saved.data.settings.protein, 130);
  assert.equal(saved.outbox.length, 2); assert.deepEqual(saved.outbox[1].dependsOn, [saved.outbox[0].id]);
  assert.equal(saved.localRevision, 2); a.seal(); b.seal();
});
test('simulated IndexedDB quota failure retains prior projection and outbox together', async t => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); const before = await store.open(scope);
  const put = IDBObjectStore.prototype.put;
  t.mock.method(IDBObjectStore.prototype, 'put', function (...args) {
    if (this.name === 'workspaces') throw new DOMException('synthetic quota failure', 'QuotaExceededError');
    return put.apply(this, args);
  });
  await assert.rejects(store.commit(scope, data => { data.settings.week = 2; }), { name: 'QuotaExceededError' });
  assert.deepEqual(await store.read(scope), before); store.seal();
});
