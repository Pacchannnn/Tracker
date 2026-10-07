import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBDatabase, IDBObjectStore } from 'fake-indexeddb';
import { listPhotoMetadata, getPhotoThumbnail, getPhoto, putPhoto, deletePhoto } from '../js/photo-store.js';

test('R3 Monthly selected-original read also leaves absent photo DB absent', async () => {
  globalThis.indexedDB = new IDBFactory();
  assert.deepEqual(await listPhotoMetadata(), []);
  assert.equal(await getPhotoThumbnail('missing'), null);
  assert.equal(await getPhoto('missing'), null);
  assert.deepEqual(await indexedDB.databases(), []);
});

test('R3 metadata then selected thumbnail/original reads preserve bytes and use readonly transactions', async () => {
  globalThis.indexedDB = new IDBFactory();
  for (const id of ['a','b']) await putPhoto({ id, date:'2026-10-04', category:'food', ownerType:'food', ownerId:'deleted', note:id,
    blob:new Blob(['original-'+id]), thumbnail:new Blob(['thumbnail-'+id]) });
  const metadataBefore=await listPhotoMetadata(),originalTx=IDBDatabase.prototype.transaction,
    originalGet=IDBObjectStore.prototype.get,originalAll=IDBObjectStore.prototype.getAll;
  const modes=[],reads=[];
  IDBDatabase.prototype.transaction=function(stores,mode,...args){modes.push(mode);return originalTx.call(this,stores,mode,...args);};
  IDBObjectStore.prototype.get=function(id){reads.push(id);return originalGet.call(this,id);};
  IDBObjectStore.prototype.getAll=function(){assert.fail('Monthly read path must not read all binaries');};
  try {
    assert.deepEqual(await listPhotoMetadata(),metadataBefore);assert.deepEqual(reads,[]);
    assert.equal(await (await getPhotoThumbnail('b')).text(),'thumbnail-b');
    const selected=await getPhoto('b');assert.equal(selected.id,'b');assert.equal(selected.date,'2026-10-04');
    assert.equal(await selected.blob.text(),'original-b');assert.equal(await selected.thumbnail.text(),'thumbnail-b');
    assert.deepEqual(reads,['b','b']);assert.ok(modes.every(mode=>mode==='readonly'));
  } finally { IDBDatabase.prototype.transaction=originalTx;IDBObjectStore.prototype.get=originalGet;IDBObjectStore.prototype.getAll=originalAll; }
  assert.deepEqual(await listPhotoMetadata(),metadataBefore);
});

test('R3 deleting photo after metadata causes selected reads to be missing without recreation', async () => {
  globalThis.indexedDB = new IDBFactory();
  await putPhoto({id:'gone',date:'2026-10-04',category:'daily',blob:new Blob(['original'])});
  const derived=await listPhotoMetadata();assert.equal(derived.length,1);
  await deletePhoto('gone');
  assert.equal(await getPhotoThumbnail(derived[0].id),null);
  const missing=await getPhoto(derived[0].id);assert.ok(missing===null||missing===undefined);
  assert.deepEqual(await listPhotoMetadata(),[]);
});
