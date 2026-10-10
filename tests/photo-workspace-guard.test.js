import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { putPhoto, listPhotos, replaceOwnedPhoto, deleteOwnedPhotos, updatePhotoIfUnchanged, deletePhotoIfUnchanged, deleteDailyPhotos, addMissingPhotos } from '../js/photo-store.js';
const image = new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' });
const photo = (id, owned = false) => ({ id, date: '2026-09-30', category: owned ? 'food' : 'daily', ...(owned ? { ownerType: 'food', ownerId: 'f' } : {}), blob: image, thumbnail: image, createdAt: '2026-09-30T00:00:00Z', updatedAt: '2026-09-30T00:00:00Z' });
const staleAt = number => { let calls = 0; return () => { if (++calls >= number) throw Error('stale_workspace'); }; };
test('stale guard before write leaves anonymous photo database unchanged', async () => {
  globalThis.indexedDB = new IDBFactory(); await putPhoto(photo('old'));
  await assert.rejects(putPhoto(photo('new'), staleAt(1)), /stale_workspace/);
  assert.deepEqual((await listPhotos()).map(item => item.id), ['old']);
});
test('photo put request guard aborts transaction when workspace changes before commit', async () => {
  globalThis.indexedDB = new IDBFactory(); await putPhoto(photo('old'));
  await assert.rejects(putPhoto(photo('new'), staleAt(3)));
  assert.deepEqual((await listPhotos()).map(item => item.id), ['old']);
});
test('replacement, owner deletion and metadata CAS abort in asynchronous request callbacks', async () => {
  for (const operation of [
    guard => replaceOwnedPhoto(photo('new', true), null, guard),
    guard => deleteOwnedPhotos('food', 'f', null, guard),
    guard => updatePhotoIfUnchanged(photo('old', true), { note: 'Changed' }, 'new-timestamp', guard),
    guard => deletePhotoIfUnchanged(photo('old', true), guard)
  ]) {
    globalThis.indexedDB = new IDBFactory(); await putPhoto(photo('old', true));
    await assert.rejects(operation(staleAt(3)));
    const stored = await listPhotos(); assert.deepEqual(stored.map(item => item.id), ['old']); assert.equal(stored[0].note, undefined);
  }
});
test('daily deletion rolls back earlier cursor deletions after epoch changes', async () => {
  globalThis.indexedDB = new IDBFactory(); await putPhoto(photo('a')); await putPhoto(photo('b'));
  await assert.rejects(deleteDailyPhotos('2026-09-30', staleAt(4)));
  assert.deepEqual((await listPhotos()).map(item => item.id), ['a', 'b']);
});
test('photo restore rolls back already queued additions when later request guard becomes stale', async () => {
  globalThis.indexedDB = new IDBFactory(); await putPhoto(photo('old'));
  await assert.rejects(addMissingPhotos([photo('a'), photo('b')], staleAt(4)));
  assert.deepEqual((await listPhotos()).map(item => item.id), ['old']);
});
