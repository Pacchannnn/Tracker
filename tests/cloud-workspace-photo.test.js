import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createCloudWorkspace} from '../js/cloud-workspace.js';
const A={uid:'11111111-1111-4111-8111-111111111111',environment:'test',projectId:'synthetic'};
function setup(indexedDB=new IDBFactory(),engineStatus='pending'){
  let account=A,epoch=0;const listeners=new Set();
  const auth={read:()=>({account}),capture:()=>({epoch}),isCurrent:lease=>Boolean(account&&lease.epoch===epoch),subscribe:fn=>listeners.add(fn)};
  const workspace=createCloudWorkspace({auth,indexedDB,dbName:'photo-workspace',engineFactory:()=>({status:()=>({status:engineStatus}),pause(){},resume(){},sync:async()=>({status:engineStatus})})});
  return {workspace,indexedDB,logout(){account=null;epoch++;for(const fn of listeners)fn({status:'signed-out'});}};
}
const photo=()=>({id:'legacy-photo',date:'2026-10-12',category:'daily',pose:'',weight:null,waist:null,note:'private',createdAt:'2026-10-12T00:00:00.000Z',updatedAt:'2026-10-12T00:00:00.000Z',blob:new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'}),thumbnail:new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'})});
test('pending photos prevent global Synced status even when JSON engine is synchronized',async()=>{
 const s=setup(new IDBFactory(),'synced');await s.workspace.openAccount();await s.workspace.photos().put(photo());
 assert.equal(s.workspace.read().syncStatus,'pending');s.workspace.seal();
});
test('account photo save/reload preserves bytes and pending transition requires confirmation',async()=>{
  const s=setup();await s.workspace.openAccount();await s.workspace.photos().put(photo());
  assert.equal(s.workspace.read().photoPendingCount,1);
  assert.equal((await s.workspace.photos().listMetadata())[0].id,'legacy-photo');
  const warning=await s.workspace.localOnly();assert.equal(warning.warning,true);
  await s.workspace.localOnly(warning.confirmation);
  await s.workspace.openCached(A);
  assert.equal((await s.workspace.photos().get('legacy-photo')).blob.size,4);
  assert.equal(s.workspace.read().photoPendingCount,1);
  await assert.rejects(()=>s.workspace.sync(),/needs_login/);
  s.workspace.seal();
});
test('captured photo facade is sealed on logout and cannot expose another account',async()=>{
  const s=setup();await s.workspace.openAccount();const photos=s.workspace.photos();await photos.put(photo());s.logout();
  await assert.rejects(async()=>photos.listMetadata(),/sealed|stale/);
  assert.equal(s.workspace.read().photoPendingCount,null);
});
