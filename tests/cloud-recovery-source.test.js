import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createAccountStore} from '../js/cloud-store.js';
import {createAccountRecovery} from '../js/cloud-recovery-source.js';
const scope={uid:'11111111-1111-4111-8111-111111111111',environment:'test',projectId:'synthetic'};
async function setup(){const store=createAccountStore({indexedDB:new IDBFactory(),dbName:'recovery-source'});await store.open(scope);await store.transact(scope,null,row=>{row.initialized=true;});return store;}
test('full recovery checks accepted fixed head through read-only gateway before sealing files',async()=>{
 const store=await setup(),before=await store.captureSnapshot(scope),routes=[];
 const recovery=createAccountRecovery({store,scope,isCurrent:()=>true,call:async(route,body)=>{routes.push({route,body});return {headSequence:'0',snapshotRecordCount:0,records:[],hasMore:false,cursor:null};}});
 const files=await recovery.export();assert.equal(routes[0].route,'bootstrap-v2');assert.equal(routes[0].body.headSequence,'0');
 assert.deepEqual(await store.captureSnapshot(scope),before);
 assert.deepEqual((await recovery.preview(files)).snapshot.workspace,before.workspace);
 const detached=await recovery.restore(files);assert.equal(detached.detached,true);assert.equal(detached.networkEnabled,false);assert.notEqual(detached.deviceId,before.workspace.deviceId);
 assert.equal((await recovery.list())[0].id,detached.id);
 assert.deepEqual((await recovery.read(detached.id)).snapshot,before);
 assert.deepEqual(await store.captureSnapshot(scope),before);store.seal();
});
test('incomplete accepted snapshot and mutation during capture never produce complete backup',async()=>{
 const store=await setup();
 const malformed=createAccountRecovery({store,scope,isCurrent:()=>true,call:async()=>({headSequence:'0',snapshotRecordCount:1,records:[],hasMore:false,cursor:null})});
 await assert.rejects(()=>malformed.export(),/incomplete|invalid/);
 const changing=createAccountRecovery({store,scope,isCurrent:()=>true,call:async()=>{await store.transact(scope,null,row=>{row.syncError={status:'offline',code:'gateway_unavailable'};});return {headSequence:'0',snapshotRecordCount:0,records:[],hasMore:false,cursor:null};}});
 await assert.rejects(()=>changing.export(),/changed|revision/);store.seal();
});
