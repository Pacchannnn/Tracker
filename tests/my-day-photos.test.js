import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore, IDBDatabase } from 'fake-indexeddb';
import { listPhotoMetadata, getPhotoThumbnail, putPhoto, listPhotos } from '../js/photo-store.js';
test('read-only missing photo DB is empty without creating a persistent database', async () => {
 globalThis.indexedDB=new IDBFactory();assert.deepEqual(await listPhotoMetadata(),[]);assert.equal(await getPhotoThumbnail('missing'),null);assert.deepEqual(await indexedDB.databases(),[]);
});
test('metadata cursor excludes binaries, gets selected thumbnails only, and causes zero writes', async () => {
 globalThis.indexedDB=new IDBFactory();const image=new Blob(['fixture'],{type:'image/jpeg'});
 for(const id of ['a','b','c'])await putPhoto({id,date:'2026-10-04',category:'daily',note:id,blob:image,thumbnail:image});
 const before=await listPhotos(),originalAll=IDBObjectStore.prototype.getAll,originalTx=IDBDatabase.prototype.transaction,originalGet=IDBObjectStore.prototype.get;let writes=0,gets=[];
 IDBObjectStore.prototype.getAll=function(){throw Error('full getAll forbidden');};IDBDatabase.prototype.transaction=function(names,mode,...args){if(mode==='readwrite')writes++;return originalTx.call(this,names,mode,...args);};IDBObjectStore.prototype.get=function(key){gets.push(key);return originalGet.call(this,key);};
 try {const metadata=await listPhotoMetadata();assert.equal(metadata.length,3);assert.ok(metadata.every(p=>!('blob'in p)&&!('thumbnail'in p)));assert.deepEqual(gets,[]);assert.equal((await getPhotoThumbnail('b')).size,image.size);assert.deepEqual(gets,['b']);assert.equal(writes,0);} finally {IDBObjectStore.prototype.getAll=originalAll;IDBDatabase.prototype.transaction=originalTx;IDBObjectStore.prototype.get=originalGet;}
 assert.deepEqual(await listPhotos(),before);
});
test('missing thumbnail remains absent and never falls back to original; read failure rejects',async()=>{
 globalThis.indexedDB=new IDBFactory();await putPhoto({id:'only-original',date:'2026-10-04',blob:new Blob(['original'])});assert.equal(await getPhotoThumbnail('only-original'),null);
 globalThis.indexedDB=undefined;await assert.rejects(listPhotoMetadata());await assert.rejects(getPhotoThumbnail('x'));
});
