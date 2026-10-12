import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createAccountStore} from '../js/cloud-store.js';
import {createSyncEngine} from '../js/cloud-sync.js';
import {preparePhoto} from '../js/cloud-photo.js';
import {projectionFromRecords} from '../js/cloud-records.js';
const scope={uid:'11111111-1111-4111-8111-111111111111',environment:'preview',projectId:'synthetic'};
async function envelope(){const blob=new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'});const {metadata}=await preparePhoto({id:'legacy:photo',date:'2026-10-11',category:'daily',pose:'',weight:null,waist:null,note:'synthetic',blob,thumbnail:blob,createdAt:'2026-10-11T00:00:00.000Z',updatedAt:'2026-10-11T00:00:00.000Z'});return{kind:'photo',recordId:metadata.id,payloadSchema:8,payload:metadata,phase:null,deviceId:null,sourceSessionId:null,deleted:false,position:'0',revision:'1',commitSequence:'1'};}
test('protocol2 complete photo feed is retained in shadow without leaking into portable schema8 projection',async()=>{
 const store=createAccountStore({indexedDB:new IDBFactory()}),row=await store.open(scope),record=await envelope(),routes=[];
 const engine=createSyncEngine({store,scope,protocolVersion:2,isCurrent:()=>true,transport:{call:async(route)=>{
 routes.push(route);if(route==='bootstrap-v2')return{headSequence:'1',snapshotRecordCount:1,records:[record],cursor:null,hasMore:false};
 if(route==='pull-v2')return{headSequence:'1',afterSequence:'1',groups:[],hasMore:false};throw Error('unexpected route');
 }}});await engine.sync();const saved=await store.read(scope);assert.deepEqual(saved.shadow,[record]);assert.equal(saved.cursor,'1');assert.deepEqual(saved.data,row.data);assert.deepEqual(routes,['bootstrap-v2','pull-v2']);store.seal();
});
test('photo projection rejects malformed hashes and leaves portable fields untouched',async()=>{
 const record=await envelope();assert.doesNotThrow(()=>projectionFromRecords([record],scope.uid));record.payload.original.sha256='invalid';assert.throws(()=>projectionFromRecords([record],scope.uid));
});
test('a client without protocol2 negotiation cannot consume photo commits or advance its cursor',async()=>{
 const store=createAccountStore({indexedDB:new IDBFactory()}),row=await store.open(scope),record=await envelope();
 const engine=createSyncEngine({store,scope,isCurrent:()=>true,transport:{call:async()=>({headSequence:'1',snapshotRecordCount:1,records:[record],cursor:null,hasMore:false})}});
 await engine.sync();const saved=await store.read(scope);assert.equal(saved.cursor,'0');assert.deepEqual(saved.shadow,[]);assert.deepEqual(saved.data,row.data);store.seal();
});
