import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { representativeState } from './fixtures/representative-state.js';
import { emptyData, loadData, updateData, createBackup, parseBackup, restoreBackupData, STORAGE_KEY } from '../js/data.js';
import { materializeLegacySession } from '../js/session-identity.js';
import { putPhoto, listPhotos, getPhoto, listPhotoMetadata, getPhotoThumbnail, addMissingPhotos, orphanPhotoOwners } from '../js/photo-store.js';
import { createPhotoBackup, parsePhotoBackup, photoBackupSummary } from '../js/photo-backup.js';

const locks = { request: (_, change) => change() };
const now = '2026-10-08T10:00:00.000Z';
function storageFor(data) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(data)]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
// Signature-valid binary fixtures exercise transport, not browser JPEG decoding.
function image(size, seed) {
  const bytes = Uint8Array.from({ length: size }, (_, index) => (index + seed) % 256);
  bytes.set([255, 216]); bytes.set([255, 217], size - 2);
  return new Blob([bytes], { type: 'image/jpeg' });
}
function photo(id, owner = {}) {
  return { id, date: '2026-10-08', category: owner.ownerType ? 'food' : 'progress', pose: 'side',
    weight: 70.5, waist: null, note: 'Ảnh thử nghiệm tổng hợp', createdAt: now, updatedAt: now,
    blob: image(37, 1), thumbnail: image(13, 2), ...owner };
}
async function assertPhotoEqual(actual, expected) {
  assert.deepEqual({ ...actual, blob: null, thumbnail: null }, { ...expected, blob: null, thumbnail: null });
  for (const key of ['blob', 'thumbnail']) {
    assert.equal(actual[key].type, 'image/jpeg');
    assert.deepEqual(new Uint8Array(await actual[key].arrayBuffer()), new Uint8Array(await expected[key].arrayBuffer()));
  }
}

test('empty JSON backup restores zero records without initializing a photo database', async () => {
  globalThis.indexedDB = new IDBFactory();
  const incoming = emptyData(), storage = storageFor(representativeState());
  const parsed = parseBackup(createBackup(incoming, new Date(now)));
  assert.equal(parsed.exportedAt, now);
  assert.ok(Object.values(parsed.counts).every(count => count === 0));
  await updateData(storage, locks, next => restoreBackupData(next, parsed.data, JSON.stringify(loadData(storage))));
  assert.deepEqual(loadData(storage), incoming);
  assert.deepEqual(await indexedDB.databases(), []);
});

test('empty photo backup produces a valid preview without creating IndexedDB', async () => {
  globalThis.indexedDB = new IDBFactory();
  const packed = await createPhotoBackup(await listPhotos()), parsed = parsePhotoBackup(packed);
  assert.deepEqual(parsed.photos, []);
  assert.equal(parsed.bytes, 0);
  assert.deepEqual(photoBackupSummary(parsed.photos), { count: 0, bytes: 0 });
  assert.deepEqual(await indexedDB.databases(), []);
});

test('bounded JSON fixture restores 256 structured sessions and 512 historical meal snapshots exactly after reload', async () => {
  const source = representativeState(), template = materializeLegacySession(source.sessions[0]).session;
  source.sessions = Array.from({ length: 256 }, (_, index) => {
    const session = structuredClone(template);
    session.id = `session-${index}`; session.sets[0].id = `set-${index}`;
    session.sets[0].weight += index; session.sessionStructure.order.reverse();
    return session;
  });
  source.entries = Array.from({ length: 512 }, (_, index) => ({ ...structuredClone(source.entries[0]), id: `entry-${index}` }));
  source.draft = { ...structuredClone(source.sessions[0]), historyEditBase: structuredClone(source.sessions[0]), notes: 'pending history edit' };
  source.foods[0].name = 'Changed current library'; source.foods[0].calories = 999;
  source.plans[0].days[0].exercises[0].name = 'Changed current plan';
  const packed = createBackup(source, new Date(now)), parsed = parseBackup(packed);
  assert.equal(parsed.counts.sessions, 256); assert.equal(parsed.counts.sets, 256); assert.equal(parsed.counts.entries, 512);
  const storage = storageFor(emptyData()), baseline = JSON.stringify(loadData(storage));
  await updateData(storage, locks, next => restoreBackupData(next, parsed.data, baseline));
  const reloaded = loadData(storage);
  assert.deepEqual(reloaded, source);
  assert.equal(reloaded.sessions[255].sets[0].id, 'set-255');
  assert.equal(reloaded.sessions[255].sets[0].slotId, 'legacy-slot:0');
  assert.equal(reloaded.entries[511].food.calories, 100);
  assert.equal(reloaded.savedMeals[0].items[0].food.calories, 100);
  assert.deepEqual(reloaded.draft.historyEditBase, source.sessions[0]);
  assert.notEqual(reloaded.sessions[0].workoutSnapshot.exercises[0].name, reloaded.plans[0].days[0].exercises[0].name);
});

test('32-photo fixture roundtrips 8912896 binary bytes and all ownership metadata through fresh IndexedDB', async () => {
  globalThis.indexedDB = new IDBFactory();
  const source = Array.from({ length: 32 }, (_, index) => ({
    ...photo(`photo-${String(index).padStart(2, '0')}`, index % 3 === 0 ? { ownerType: 'food', ownerId: 'fixture-food' } :
      index % 3 === 1 ? { ownerType: 'recipe', ownerId: 'fixture-recipe' } : {}),
    blob: image(262144, index), thumbnail: image(16384, index + 100)
  }));
  for (const item of source) await putPhoto(item);
  const packed = await createPhotoBackup(await listPhotos()), parsed = parsePhotoBackup(packed);
  assert.equal(parsed.photos.length, 32); assert.equal(parsed.bytes, 8912896);
  globalThis.indexedDB = new IDBFactory();
  assert.deepEqual(await addMissingPhotos(parsed.photos), { added: 32, skipped: 0 });
  const restored = await listPhotos();
  assert.equal(restored.length, 32);
  for (let index = 0; index < source.length; index++) await assertPhotoEqual(restored[index], source[index]);
  assert.deepEqual(orphanPhotoOwners(restored, representativeState()), []);
  assert.deepEqual(await addMissingPhotos(parsed.photos), { added: 0, skipped: 32 });
  await assertPhotoEqual(await getPhoto('photo-31'), source[31]);
});

test('same-ID different-byte photo restore skips the collision and preserves existing ownership and both blobs', async () => {
  globalThis.indexedDB = new IDBFactory();
  const existing = photo('collision', { ownerType: 'food', ownerId: 'fixture-food' });
  await putPhoto(existing);
  const incoming = { ...photo('collision', { ownerType: 'recipe', ownerId: 'fixture-recipe' }),
    note: 'different incoming metadata', blob: image(91, 33), thumbnail: image(49, 22) };
  const missing = photo('missing');
  const parsed = parsePhotoBackup(await createPhotoBackup([incoming, missing]));
  assert.deepEqual(await addMissingPhotos(parsed.photos), { added: 1, skipped: 1 });
  await assertPhotoEqual(await getPhoto('collision'), existing);
  await assertPhotoEqual(await getPhoto('missing'), missing);
  assert.deepEqual(await addMissingPhotos(parsed.photos), { added: 0, skipped: 2 });
  await assertPhotoEqual(await getPhoto('collision'), existing);
});

test('orphan ownership survives backup and is reported without creating a food or recipe', async () => {
  globalThis.indexedDB = new IDBFactory();
  const data = representativeState(), before = structuredClone(data);
  const incoming = photo('orphan', { ownerType: 'recipe', ownerId: 'missing-recipe' });
  const parsed = parsePhotoBackup(await createPhotoBackup([incoming]));
  await addMissingPhotos(parsed.photos);
  const restored = await listPhotos();
  assert.deepEqual(orphanPhotoOwners(restored, data).map(item => item.id), ['orphan']);
  await assertPhotoEqual(restored[0], incoming);
  assert.deepEqual(data, before);
});

test('malformed photo previews reject before any photo write and preserve existing bytes', async () => {
  globalThis.indexedDB = new IDBFactory();
  const existing = photo('keep'); await putPhoto(existing);
  const valid = JSON.parse(await createPhotoBackup([photo('incoming')]));
  const corruptions = [
    raw => raw.photos.push(structuredClone(raw.photos[0])),
    raw => raw.photos[0].thumbnail = 'data:image/jpeg;base64,AAAA',
    raw => raw.photos[0].blob = 'data:image/jpeg;base64,/9j/',
    raw => raw.photos[0].ownerType = 'recipe',
    raw => { raw.photos[0].ownerType = 'food'; raw.photos[0].ownerId = ' '; },
    raw => raw.photos[0].date = '2026-02-30',
    raw => raw.photos[0].updatedAt = 'invalid',
    raw => raw.version = 2
  ];
  for (const corrupt of corruptions) {
    const raw = structuredClone(valid); corrupt(raw);
    assert.throws(() => parsePhotoBackup(JSON.stringify(raw)));
  }
  assert.throws(() => parsePhotoBackup('{truncated'));
  assert.equal((await listPhotos()).length, 1);
  await assertPhotoEqual(await getPhoto('keep'), existing);
});

test('malformed JSON previews preserve storage including structured IDs and history baseline', () => {
  const data = representativeState();
  data.sessions[0] = materializeLegacySession(data.sessions[0]).session;
  data.draft = { ...structuredClone(data.sessions[0]), historyEditBase: structuredClone(data.sessions[0]) };
  const storage = storageFor(data), before = storage.getItem(STORAGE_KEY);
  const valid = JSON.parse(createBackup(data));
  for (const corrupt of [
    raw => raw.data.sessions.push(structuredClone(raw.data.sessions[0])),
    raw => raw.data.entries[0].food.calories = 'corrupt',
    raw => raw.data.sessions[0].sets[0].slotId = 'dangling',
    raw => raw.data.draft.historyEditBase.id = 'wrong-session',
    raw => raw.schemaVersion = 99,
    raw => raw.data.journalEntries.push({ ...raw.data.journalEntries[0], id: 'same-date' })
  ]) {
    const raw = structuredClone(valid); corrupt(raw);
    assert.throws(() => parseBackup(JSON.stringify(raw)));
  }
  assert.throws(() => parseBackup('{truncated'));
  assert.equal(storage.getItem(STORAGE_KEY), before);
});

test('missing Web Locks rejects restore before reading storage or modifying the baseline', async () => {
  const storage = storageFor(representativeState()), before = storage.getItem(STORAGE_KEY);
  const unavailable = { getItem() { throw new Error('must not read'); }, setItem() { throw new Error('must not write'); } };
  for (const missing of [undefined, null, {}]) {
    await assert.rejects(updateData(unavailable, missing, next => restoreBackupData(next, emptyData(), before)), /không hỗ trợ/);
  }
  assert.equal(storage.getItem(STORAGE_KEY), before);
});

test('denied localStorage reads reject restore before applying incoming data', async () => {
  let changed = false, wrote = false;
  const storage = { getItem() { throw new DOMException('storage denied', 'SecurityError'); }, setItem() { wrote = true; } };
  assert.throws(() => loadData(storage), { name: 'SecurityError' });
  await assert.rejects(updateData(storage, locks, () => { changed = true; }), { name: 'SecurityError' });
  assert.equal(changed, false); assert.equal(wrote, false);
});

test('localStorage quota failure leaves persisted JSON and photo bytes intact', async () => {
  globalThis.indexedDB = new IDBFactory();
  const existing = photo('keep'); await putPhoto(existing);
  const storage = storageFor(representativeState()), before = storage.getItem(STORAGE_KEY);
  const denied = { getItem: storage.getItem, setItem() { throw new DOMException('quota', 'QuotaExceededError'); } };
  await assert.rejects(updateData(denied, locks, next => restoreBackupData(next, emptyData(), before)), /Không thể lưu/);
  assert.equal(storage.getItem(STORAGE_KEY), before);
  await assertPhotoEqual(await getPhoto('keep'), existing);
});

test('unavailable IndexedDB rejects photo restore while completed JSON restore remains reloadable', async () => {
  globalThis.indexedDB = undefined;
  const source = representativeState(), parsed = parseBackup(createBackup(source));
  const storage = storageFor(emptyData()), baseline = JSON.stringify(loadData(storage));
  await updateData(storage, locks, next => restoreBackupData(next, parsed.data, baseline));
  await assert.rejects(addMissingPhotos([photo('incoming')]), /IndexedDB/);
  assert.deepEqual(loadData(storage), source);
  for (const read of [listPhotos, listPhotoMetadata, () => getPhoto('missing'), () => getPhotoThumbnail('missing')]) await assert.rejects(read());
});

test('synchronously denied IndexedDB opens reject both backup reads and photo restore', async () => {
  globalThis.indexedDB = { open() { throw new DOMException('storage denied', 'SecurityError'); } };
  await assert.rejects(listPhotos(), { name: 'SecurityError' });
  await assert.rejects(addMissingPhotos([photo('incoming')]), { name: 'SecurityError' });
});

test('all read-only photo access and backup preparation leave an absent database absent', async () => {
  globalThis.indexedDB = new IDBFactory();
  assert.deepEqual(await listPhotos(), []);
  assert.deepEqual(await listPhotoMetadata(), []);
  assert.equal(await getPhoto('missing'), null);
  assert.equal(await getPhotoThumbnail('missing'), null);
  assert.deepEqual(parsePhotoBackup(await createPhotoBackup(await listPhotos())).photos, []);
  assert.deepEqual(await indexedDB.databases(), []);
});
