import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { putPhoto, listPhotos, replaceOwnedPhoto, deleteOwnedPhotos, ownedPhotos } from '../js/photo-store.js';
const image = new Blob([new Uint8Array([255,216,255,217])], { type: 'image/jpeg' });
const photo = (id, ownerType, ownerId) => ({ id, date: '2026-09-30', category: ownerType ? 'food' : 'daily',
  ...(ownerType ? { ownerType, ownerId } : {}), blob: image, thumbnail: image, createdAt: '2026-09-30T00:00:00Z', updatedAt: '2026-09-30T00:00:00Z' });
test('IndexedDB food photo add, replacement and removal preserve unrelated V2 photos', async () => {
  globalThis.indexedDB = new IDBFactory();
  await putPhoto(photo('journal'));
  await replaceOwnedPhoto(photo('food-old', 'food', 'f1'));
  await replaceOwnedPhoto(photo('recipe', 'recipe', 'r1'));
  assert.equal(ownedPhotos(await listPhotos(), 'food', 'f1').length, 1);
  await replaceOwnedPhoto(photo('food-new', 'food', 'f1'));
  assert.deepEqual((await listPhotos()).map(item => item.id).sort(), ['food-new', 'journal', 'recipe']);
  await deleteOwnedPhotos('food', 'f1');
  assert.deepEqual((await listPhotos()).map(item => item.id).sort(), ['journal', 'recipe']);
});
test('failed photo replacement rolls back deleting the previous image', async () => {
  globalThis.indexedDB = new IDBFactory();
  await putPhoto(photo('old', 'food', 'f1'));
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () { throw new DOMException('Injected storage failure', 'QuotaExceededError'); };
  try { await assert.rejects(replaceOwnedPhoto(photo('new', 'food', 'f1'))); }
  finally { IDBObjectStore.prototype.put = originalPut; }
  assert.deepEqual((await listPhotos()).map(item => item.id), ['old']);
});
test('stale photo replacement/removal refuses to overwrite another tab', async () => {
  globalThis.indexedDB = new IDBFactory();
  await replaceOwnedPhoto(photo('old', 'food', 'f1'), []);
  const previous = await listPhotos();
  await replaceOwnedPhoto(photo('changed', 'food', 'f1'), previous);
  await assert.rejects(replaceOwnedPhoto(photo('stale', 'food', 'f1'), previous), /tab khác/);
  await assert.rejects(deleteOwnedPhotos('food', 'f1', previous), /tab khác/);
  assert.deepEqual((await listPhotos()).map(item => item.id), ['changed']);
});
