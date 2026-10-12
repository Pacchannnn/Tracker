import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { createAccountStore, scopeKey, buildPhotoRequest } from '../js/cloud-store.js';
const photoModule = await import('../js/cloud-photo.js').catch(() => null);
const scope = { uid: '11111111-1111-4111-8111-111111111111', environment: 'test', projectId: 'synthetic' };
const device = '22222222-2222-4222-8222-222222222222';
const image = new Blob([new Uint8Array([255,216,255,217])], { type: 'image/jpeg' });
const record = (id = 'legacy/photo:1', extra = {}) => ({ id, date: '2026-10-11', category: 'daily', pose: '', weight: null, waist: null, note: '', createdAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z', blob: image, thumbnail: image, ...extra });
const prepare = async value => { assert.ok(photoModule?.preparePhoto, 'photo preparation API exists'); return photoModule.preparePhoto(value); };
const rawOpen = (factory, version, upgrade) => new Promise((resolve, reject) => {
  const req = factory.open('tracker-sync', version); req.onupgradeneeded = () => upgrade?.(req.result, req.transaction); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
});
test('additive v2 upgrade retains the exact v1 row, installation and unknown metadata', async () => {
  const indexedDB = new IDBFactory();
  const seed = createAccountStore({ indexedDB, dbName: 'seed', deviceId: device });
  const row = await seed.open(scope); row.outbox = [{ id: 'opaque', request: { ordered: ['b', 'a'] } }]; row.conflicts = [{ local: { untouched: true } }]; seed.seal();
  const old = await rawOpen(indexedDB, 1, db => { db.createObjectStore('workspaces'); db.createObjectStore('metadata'); });
  const tx = old.transaction(['workspaces', 'metadata'], 'readwrite'); tx.objectStore('workspaces').put(row, scopeKey(scope)); tx.objectStore('metadata').put({ deviceId: device }, 'installation'); tx.objectStore('metadata').put({ opaque: true }, 'unknown');
  await new Promise(resolve => { tx.oncomplete = resolve; }); old.close();
  const store = createAccountStore({ indexedDB }); assert.deepEqual(await store.open(scope), row); store.seal();
  const check = await rawOpen(indexedDB, 2); assert.ok(check.objectStoreNames.contains('photoAssets')); assert.ok(check.objectStoreNames.contains('photoJobs'));
  const saved = check.transaction('metadata').objectStore('metadata').get('unknown'); assert.deepEqual(await new Promise(resolve => { saved.onsuccess = () => resolve(saved.result); }), { opaque: true }); check.close();
});
test('photo preparation preserves logical IDs and exact JPEG bytes with independent UUID asset identities', async () => {
  const prepared = await prepare(record());
  assert.equal(prepared.metadata.id, 'legacy/photo:1'); assert.equal(prepared.assets.length, 2);
  assert.notEqual(prepared.assets[0].assetId, prepared.assets[1].assetId);
  for (const asset of prepared.assets) { assert.match(asset.assetId, /^[0-9a-f-]{36}$/); assert.match(asset.sha256, /^[0-9a-f]{64}$/); assert.equal(asset.bytes, 4); assert.deepEqual(await asset.blob.arrayBuffer(), await image.arrayBuffer()); }
  assert.ok(!('blob' in prepared.metadata));
  await assert.rejects(prepare(record('bad', { blob: new Blob(['bad'], { type: 'image/jpeg' }) })), /jpeg/i);
  await assert.rejects(prepare(record('bad', { thumbnail: new Blob([image], { type: 'image/png' }) })), /jpeg/i);
});
test('metadata, both byte assets and durable job commit together and increment only localRevision', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory(), deviceId: device }); const before = await store.open(scope);
  const prepared = await prepare(record()); const saved = await store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0);
  assert.equal(saved.localRevision, 1); const { localRevision, ...other } = saved; const { localRevision: oldRevision, ...prior } = before; assert.deepEqual(other, prior);
  const snapshot = await store.captureSnapshot(scope); assert.equal(snapshot.assets.length, 2); assert.equal(snapshot.jobs.length, 1); assert.deepEqual(snapshot.jobs[0].after, [prepared.metadata]);
  assert.deepEqual(await store.photoSnapshot(scope), [prepared.metadata]); assert.deepEqual((await store.getPhoto(scope, prepared.metadata.id)).blob, image);
  await assert.rejects(store.commitPhoto(scope, { operation: 'put', ...await prepare(record('new')), expectedPhotos: [] }, 0), /stale_revision/); store.seal();
});
test('quota fault after asset writes rolls back workspace, job and bytes', async t => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope); const before = await store.captureSnapshot(scope); const prepared = await prepare(record());
  const put = IDBObjectStore.prototype.put;
  t.mock.method(IDBObjectStore.prototype, 'put', function (...args) { if (this.name === 'photoJobs') throw new DOMException('quota', 'QuotaExceededError'); return put.apply(this, args); });
  await assert.rejects(store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0), { name: 'QuotaExceededError' });
  assert.deepEqual(await store.captureSnapshot(scope), before); store.seal();
});
test('scope isolation, collision, missing photo and removed owner refuse changes', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope); const prepared = await prepare(record());
  await store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0); const before = await store.captureSnapshot(scope);
  await assert.rejects(store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 1), /collision/);
  await assert.rejects(store.commitPhoto(scope, { operation: 'delete', id: 'missing', expectedPhotos: [] }, 1), /missing/);
  await assert.rejects(store.commitPhoto(scope, { operation: 'put', ...await prepare(record('owner', { category: 'food', ownerType: 'food', ownerId: 'absent' })), expectedPhotos: [] }, 1), /owner/);
  const other = { ...scope, uid: device }; await store.open(other); assert.deepEqual(await store.photoSnapshot(other), []); assert.equal(await store.readPhotoAsset(other, prepared.assets[0].assetId), null);
  assert.deepEqual(await store.captureSnapshot(scope), before); store.seal();
});
test('replacement requires exact reviewed set and retains old assets and intents for recovery', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope); const first = await prepare(record('one'));
  await store.commitPhoto(scope, { operation: 'put', ...first, expectedPhotos: [] }, 0);
  const second = await prepare(record('two'));
  await assert.rejects(store.commitPhoto(scope, { operation: 'replace', ...second, selector: { category: 'daily', date: '2026-10-11' }, expectedPhotos: [] }, 1), /review/);
  await store.commitPhoto(scope, { operation: 'replace', ...second, selector: { category: 'daily', date: '2026-10-11' }, expectedPhotos: [first.metadata] }, 1);
  assert.deepEqual(await store.photoSnapshot(scope), [second.metadata]); const snapshot = await store.captureSnapshot(scope); assert.equal(snapshot.assets.length, 4); assert.equal(snapshot.jobs.length, 2); assert.deepEqual(snapshot.jobs[1].dependsOn, [snapshot.jobs[0].id]);
  await assert.rejects(store.commitPhoto(scope, { operation: 'delete', id: 'two', expectedPhotos: [first.metadata] }, 2), /review/);
  await store.commitPhoto(scope, { operation: 'delete', id: 'two', expectedPhotos: [second.metadata] }, 2); assert.deepEqual(await store.photoSnapshot(scope), []); assert.equal((await store.captureSnapshot(scope)).assets.length, 4); store.seal();
});
test('tampering with prepared descriptor or bytes and account epoch rejects before persistence', async () => {
  let current = true; const store = createAccountStore({ indexedDB: new IDBFactory(), isCurrent: () => current }); await store.open(scope);
  const prepared = await prepare(record()); prepared.assets[0].sha256 = '0'.repeat(64);
  await assert.rejects(store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0), /hash|asset/);
  const valid = await prepare(record()); current = false; await assert.rejects(store.commitPhoto(scope, { operation: 'put', ...valid, expectedPhotos: [] }, 0), /stale|sealed/); store.seal();
});
test('detached recovery keeps original identities, uses fresh device, never overwrites active or detached namespace', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory(), deviceId: device }); await store.open(scope); await store.commitPhoto(scope, { operation: 'put', ...await prepare(record()), expectedPhotos: [] }, 0);
  const snapshot = await store.captureSnapshot(scope), id = '33333333-3333-4333-8333-333333333333';
  const recovery = await store.saveDetachedRecovery(snapshot, id); assert.equal(recovery.detached, true); assert.equal(recovery.networkEnabled, false); assert.notEqual(recovery.deviceId, device); assert.deepEqual(recovery.snapshot, snapshot);
  assert.deepEqual(await store.readDetachedRecovery(scope, id), recovery); assert.deepEqual(await store.captureSnapshot(scope), snapshot);
  await assert.rejects(store.saveDetachedRecovery(snapshot, id), /collision/);
  const corrupt = structuredClone(snapshot); corrupt.assets[0].blob = new Blob(['bad'], { type: 'image/jpeg' }); await assert.rejects(store.saveDetachedRecovery(corrupt, crypto.randomUUID()), /jpeg|hash|asset/); store.seal();
});
test('import ledgers are exact account scoped records with revision CAS and immutable source identity', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope);
  const ledger = { id: '44444444-4444-4444-8444-444444444444', scope, deviceId: (await store.read(scope)).deviceId, sourceHashes: { workspace: 'a'.repeat(64) }, mappings: [], receipts: [], unresolved: [] };
  await store.writeImportLedger(scope, ledger, 0); assert.deepEqual(await store.readImportLedger(scope, ledger.id), ledger); assert.deepEqual((await store.captureSnapshot(scope)).ledgers, [ledger]);
  await assert.rejects(store.writeImportLedger(scope, { ...ledger, sourceHashes: { workspace: 'b'.repeat(64) } }, 1), /immutable/); store.seal();
});
test('accepted asset paths reject arbitrary or cross-account paths and cache validates actual hashes', async () => {
  const prepared = await prepare(record()), manifest = '55555555-5555-4555-8555-555555555555';
  const path = `synthetic/test/${scope.uid}/${manifest}/original.jpg`;
  assert.equal(photoModule.validatePhotoAssetPath(path, scope, manifest, 'original'), path);
  assert.throws(() => photoModule.validatePhotoAssetPath(path.replace(scope.uid, device), scope, manifest, 'original'), /path/);
  assert.throws(() => photoModule.validateWirePhoto({ ...prepared.metadata, original: { ...prepared.metadata.original, path: 'https://public.example/photo.jpg' } }), /path/);
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope);
  await store.cachePhotoAsset(scope, prepared.metadata.original, image);
  assert.equal((await store.captureSnapshot(scope)).assets.length, 1); assert.equal((await store.read(scope)).localRevision, 1);
  await assert.rejects(store.cachePhotoAsset(scope, { ...prepared.metadata.original, sha256: '0'.repeat(64) }, image), /hash/);
  assert.equal((await store.captureSnapshot(scope)).assets.length, 1); store.seal();
});
test('job acknowledgement binds frozen request and exact accepted metadata, retaining originals and duplicate receipts', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory(), deviceId: device }); await store.open(scope); const prepared = await prepare(record());
  await store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0);
  const job = (await store.captureSnapshot(scope)).jobs[0];
  const request = buildPhotoRequest(await store.captureSnapshot(scope), job);
  await store.updatePhotoJob(scope, job.id, { request, state: 'sending' }, 1);
  const accepted = { kind: 'photo', recordId: prepared.metadata.id, revision: '1', commitSequence: '1', position: '0', payloadSchema: 8, payload: prepared.metadata, deleted: false, phase: null, deviceId: null, sourceSessionId: null };
  const result = { status: 'applied', operationId: job.id, commitSequence: '1', records: [accepted] };
  await assert.rejects(store.ackPhotoJob(scope, job.id, { ...result, records: [{ ...accepted, payload: { ...prepared.metadata, note: 'forged' } }] }, 2), /acknowledgement/);
  const applied = await store.ackPhotoJob(scope, job.id, result, 2); assert.deepEqual(applied.shadow, [accepted]); assert.equal(applied.outbox.length, 0);
  const snapshot = await store.captureSnapshot(scope); assert.equal(snapshot.jobs[0].state, 'applied'); assert.deepEqual(snapshot.jobs[0].request, request); assert.deepEqual(snapshot.jobs[0].receipt, result);
  assert.deepEqual(await store.ackPhotoJob(scope, job.id, result, 3), applied); store.seal();
});
test('metadata edit retains assets and stale reviewed metadata rejects even with current workspace revision', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope); const prepared = await prepare(record()); await store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0);
  const edited = { ...prepared.metadata, note: 'saved note', updatedAt: '2026-10-11T01:00:00Z' };
  await store.commitPhoto(scope, { operation: 'update', metadata: edited, assets: [], expectedPhotos: [prepared.metadata] }, 1);
  assert.deepEqual(await store.photoSnapshot(scope), [edited]); assert.equal((await store.captureSnapshot(scope)).assets.length, 2);
  await assert.rejects(store.commitPhoto(scope, { operation: 'update', metadata: { ...edited, note: 'stale' }, assets: [], expectedPhotos: [prepared.metadata] }, 2), /review/); store.seal();
});
test('detached restore quota failure leaves active and detached stores unchanged', async t => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope); const snapshot = await store.captureSnapshot(scope), id = crypto.randomUUID();
  const add = IDBObjectStore.prototype.add;
  t.mock.method(IDBObjectStore.prototype, 'add', function (...args) { if (this.name === 'recoveryWorkspaces') throw new DOMException('quota', 'QuotaExceededError'); return add.apply(this, args); });
  await assert.rejects(store.saveDetachedRecovery(snapshot, id), { name: 'QuotaExceededError' }); assert.equal(await store.readDetachedRecovery(scope, id), null); assert.deepEqual(await store.captureSnapshot(scope), snapshot); store.seal();
});
test('versionchange seals connected stores and blocked upgrades never write the new schema', async () => {
  const indexedDB = new IDBFactory(), store = createAccountStore({ indexedDB }); await store.open(scope);
  const upgraded = await rawOpen(indexedDB, 3); await assert.rejects(store.read(scope), /sealed/); upgraded.close();
  const factory = new IDBFactory(), old = await rawOpen(factory, 1, db => { db.createObjectStore('workspaces'); db.createObjectStore('metadata'); });
  const blocked = createAccountStore({ indexedDB: factory }); await assert.rejects(blocked.open(scope), /blocked/); old.close();
  await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve));
  const unchanged = await rawOpen(factory, 1); assert.equal(unchanged.version, 1); assert.ok(!unchanged.objectStoreNames.contains('photoAssets')); unchanged.close(); blocked.seal();
});
test('legacy photo facade edits and deletes Blob records without placing binary fields in metadata jobs', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope); const facade = photoModule.createAccountPhotos({ store, scope });
  await facade.put(record()); const previous = await facade.get(record().id); assert.ok(previous.thumbnail instanceof Blob);
  await facade.update(previous, { ...record(), note: 'edited' }, '2026-10-11T01:00:00Z');
  const metadata = await facade.listMetadata(); assert.equal(metadata[0].note, 'edited'); assert.ok(!('blob' in metadata[0])); assert.equal((await facade.getThumbnail(record().id)).size, 4);
  await assert.rejects(facade.delete(previous), /review/); await facade.delete(await facade.get(record().id)); assert.deepEqual(await facade.listMetadata(), []); store.seal();
});
test('frozen manifest identity is immutable and acknowledged paths bind its scope and UUID', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory(), deviceId: device }); await store.open(scope); const prepared = await prepare(record()); await store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0);
  const job = (await store.captureSnapshot(scope)).jobs[0], manifestId = '55555555-5555-4555-8555-555555555555';
  const request = buildPhotoRequest(await store.captureSnapshot(scope), job);
  await store.updatePhotoJob(scope, job.id, { request, manifestId, state: 'staged' }, 1);
  await assert.rejects(store.updatePhotoJob(scope, job.id, { manifestId: crypto.randomUUID() }, 2), /immutable/);
  const payload = structuredClone(prepared.metadata); for (const kind of ['original', 'thumbnail']) payload[kind].path = `synthetic/test/${scope.uid}/${manifestId}/${kind}.jpg`;
  const accepted = { kind: 'photo', recordId: payload.id, revision: '1', commitSequence: '1', position: '0', payloadSchema: 8, payload, deleted: false, phase: null, deviceId: null, sourceSessionId: null };
  const response = { status: 'applied', operationId: job.id, commitSequence: '1', records: [accepted] };
  const forged = structuredClone(response); forged.records[0].payload.original.path = forged.records[0].payload.original.path.replace(manifestId, crypto.randomUUID());
  await assert.rejects(store.ackPhotoJob(scope, job.id, forged, 2), /acknowledgement/); await store.ackPhotoJob(scope, job.id, response, 2); assert.deepEqual(await store.photoSnapshot(scope), [payload]); store.seal();
});
test('account commits reject foreign paths before writing candidate or bytes', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); const before = await store.open(scope), prepared = await prepare(record());
  const path = `synthetic/test/${device}/55555555-5555-4555-8555-555555555555/original.jpg`;
  prepared.metadata.original.path = path; prepared.assets[0].path = path;
  await assert.rejects(store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0), /path/);
  assert.deepEqual(await store.read(scope), before); store.seal();
});
test('ledgers cannot serialize binary values into JSON rows', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); const before = await store.open(scope);
  const ledger = { id: crypto.randomUUID(), scope, deviceId: before.deviceId, sourceHashes: { workspace: 'a'.repeat(64) }, hidden: { bytes: image } };
  await assert.rejects(store.writeImportLedger(scope, ledger, 0), /json/); assert.deepEqual(await store.read(scope), before); store.seal();
});
test('recovery validates retained historical byte references before allocating a detached namespace', async () => {
  const store = createAccountStore({ indexedDB: new IDBFactory() }); await store.open(scope); const prepared = await prepare(record());
  await store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0); await store.commitPhoto(scope, { operation: 'delete', id: prepared.metadata.id, expectedPhotos: [prepared.metadata] }, 1);
  const snapshot = await store.captureSnapshot(scope), corrupt = structuredClone(snapshot); corrupt.assets = [];
  await assert.rejects(store.saveDetachedRecovery(corrupt, crypto.randomUUID()), /bytes_missing/); assert.deepEqual(await store.captureSnapshot(scope), snapshot); store.seal();
});
test('conflict jobs retain exact review candidates across reopen without changing immutable requests', async () => {
  const indexedDB = new IDBFactory(); let store = createAccountStore({ indexedDB, deviceId: device }); await store.open(scope); const prepared = await prepare(record()); await store.commitPhoto(scope, { operation: 'put', ...prepared, expectedPhotos: [] }, 0);
  const job = (await store.captureSnapshot(scope)).jobs[0], request = buildPhotoRequest(await store.captureSnapshot(scope), job);
  await store.updatePhotoJob(scope, job.id, { request, state: 'sending' }, 1); const conflict = { base: [], local: [prepared.metadata], remote: [] };
  await store.updatePhotoJob(scope, job.id, { state: 'conflict', error: 'owner_changed', conflict }, 2); store.seal();
  store = createAccountStore({ indexedDB }); const captured = await store.captureSnapshot(scope); assert.deepEqual(captured.jobs[0].conflict, conflict); assert.deepEqual(captured.jobs[0].request, request);
  await assert.rejects(store.updatePhotoJob(scope, job.id, { conflict: { ...conflict, local: [] } }, 3), /immutable/); store.seal();
});
