import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { representativeState } from './fixtures/representative-state.js';
import { emptyData, loadData, saveData, updateData, createBackup, parseBackup, restoreBackupData, STORAGE_KEY } from '../js/data.js';
import { putPhoto, listPhotos, addMissingPhotos, orphanPhotoOwners } from '../js/photo-store.js';
import { createPhotoBackup, parsePhotoBackup } from '../js/photo-backup.js';
import { plannerPayload, recoverPlannerResult, createDraftStore, reviewedBuilderDay } from '../js/planning-draft.js';

const storageFor = data => { const map = new Map([[STORAGE_KEY, JSON.stringify(data)]]); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; };
const locks = { request: (_, work) => work() };

test('representative schema7 data roundtrips every domain into fresh storage', async () => {
  const original = representativeState(), exported = createBackup(original), parsed = parseBackup(exported);
  const storage = storageFor(emptyData()), baseline = JSON.stringify(loadData(storage));
  await updateData(storage, locks, next => restoreBackupData(next, parsed.data, baseline));
  assert.deepEqual(loadData(storage), original);
  assert.equal(loadData(storage).entries[0].food.calories, 100);
  assert.equal(loadData(storage).foods[0].calories, 200);
  assert.equal(parsed.counts.planningDrafts, 2);
  assert.deepEqual(recoverPlannerResult(original.planningDraft.planner.payload, original), original.planningDraft.planner.payload.result);
});

test('planner result persists but changed request and missing library prevent stale acceptance', async () => {
  let data = representativeState(); const storage = storageFor(data);
  const store = createDraftStore({ getData: () => data, write: async change => data = await updateData(storage, locks, change) });
  const previous = data.planningDraft.planner.payload;
  await store.save('planner', plannerPayload({ ...previous.preferences, count: '2' }, previous.result, previous.preferences));
  assert.equal(loadData(storage).planningDraft.planner.payload.result, null);
  const bad = structuredClone(previous); bad.result.workout.exercises[0].exerciseId = 'removed';
  assert.throws(() => recoverPlannerResult(bad, data));
  const missing = data.planningDraft.builder.payload; missing.day.exercises[0].exerciseId = 'removed';
  assert.throws(() => reviewedBuilderDay(missing, data), /không còn/);
});

test('invalid restore, stale preview and failing write preserve previous persisted state', async () => {
  const original = representativeState(), storage = storageFor(original), before = storage.getItem(STORAGE_KEY);
  const invalid = { ...original, planningDraft: { revision: -1, builder: null, planner: null } };
  await assert.rejects(updateData(storage, locks, next => restoreBackupData(next, invalid, JSON.stringify(original))));
  await assert.rejects(updateData(storage, locks, next => restoreBackupData(next, emptyData(), 'stale')));
  assert.equal(storage.getItem(STORAGE_KEY), before);
  const broken = { getItem: storage.getItem, setItem() { throw new Error('quota'); } };
  await assert.rejects(updateData(broken, locks, next => restoreBackupData(next, emptyData(), JSON.stringify(original))), /Không thể lưu/);
  assert.equal(storage.getItem(STORAGE_KEY), before);
});

test('photo export and fresh IndexedDB import preserve IDs metadata owners and bytes; duplicate skips', async () => {
  globalThis.indexedDB = new IDBFactory();
  const now = '2026-10-04T10:00:00.000Z', image = new Blob([new Uint8Array([255,216,1,2,255,217])], { type: 'image/jpeg' });
  const record = id => ({ id, date: '2026-10-04', category: 'food', pose: '', weight: null, waist: null, note: 'fixture', ownerType: 'food', ownerId: id === 'orphan' ? 'missing-food' : 'fixture-food', createdAt: now, updatedAt: now, blob: image, thumbnail: image });
  for (const id of ['food-photo', 'orphan']) await putPhoto(record(id));
  const photos = await listPhotos(), packed = await createPhotoBackup(photos), parsed = parsePhotoBackup(packed);
  globalThis.indexedDB = new IDBFactory();
  assert.deepEqual(await addMissingPhotos(parsed.photos), { added: 2, skipped: 0 });
  const restored = await listPhotos();
  assert.equal(orphanPhotoOwners(restored, representativeState()).length, 1);
  for (let i = 0; i < photos.length; i++) {
    assert.deepEqual({ ...restored[i], blob: null, thumbnail: null }, { ...photos[i], blob: null, thumbnail: null });
    assert.deepEqual(await restored[i].blob.arrayBuffer(), await photos[i].blob.arrayBuffer());
    assert.deepEqual(await restored[i].thumbnail.arrayBuffer(), await photos[i].thumbnail.arrayBuffer());
  }
  assert.deepEqual(await addMissingPhotos(parsed.photos), { added: 0, skipped: 2 });
  const invalid = JSON.parse(packed); invalid.photos.push(invalid.photos[0]);
  assert.throws(() => parsePhotoBackup(JSON.stringify(invalid)), /ID ảnh/);
  assert.equal((await listPhotos()).length, 2);
});

test('failed photo batch aborts previously queued additions without damaging existing photos', async () => {
  globalThis.indexedDB = new IDBFactory();
  await putPhoto({ id: 'existing', note: 'keep' });
  const original = IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add = function(record) { if (record.id === 'fail') throw new DOMException('quota', 'QuotaExceededError'); return original.call(this, record); };
  try { await assert.rejects(addMissingPhotos([{ id: 'first' }, { id: 'fail' }])); }
  finally { IDBObjectStore.prototype.add = original; }
  assert.deepEqual(await listPhotos(), [{ id: 'existing', note: 'keep' }]);
});

test('representative V6 backup migration preserves every existing domain, wrapped and raw', () => {
  const old = representativeState(); old.schemaVersion = 6; delete old.planningDraft;
  const storage = storageFor(old), before = storage.getItem(STORAGE_KEY);
  const migrated = loadData(storage);
  for (const key of Object.keys(old).filter(key => key !== 'schemaVersion')) assert.deepEqual(migrated[key], old[key]);
  assert.equal(migrated.schemaVersion, 7);
  assert.deepEqual(migrated.planningDraft, { revision: 0, builder: null, planner: null });
  assert.deepEqual(parseBackup(JSON.stringify(old)).data, migrated);
  assert.deepEqual(parseBackup(JSON.stringify({ schemaVersion: 6, exportedAt: '2026-10-04T10:00:00Z', data: old })).data, migrated);
  assert.equal(storage.getItem(STORAGE_KEY), before);
});
