import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createCloudWorkspace } from '../js/cloud-workspace.js';
import { createAccountStore } from '../js/cloud-store.js';
import { createStartedSession } from '../js/session-runtime.js';
const A={uid:'11111111-1111-4111-8111-111111111111',environment:'preview',projectId:'synthetic'};
const B={...A,uid:'22222222-2222-4222-8222-222222222222'};
function setup(indexedDB=new IDBFactory(), options={}) {
 let account=A,epoch=0;const listeners=new Set();
 const auth={read:()=>({status:account?'authenticated':'signed-out',account}),capture:()=>({epoch}),isCurrent:lease=>Boolean(account&&lease.epoch===epoch),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},gatewayCall(){throw Error('gateway unavailable');}};
 const workspace=createCloudWorkspace({auth,indexedDB,dbName:'synthetic-workspace',engineFactory:()=>({status:()=>({state:'pending'}),pause(){},resume(){},sync:async()=>({state:'offline'})}),...options});
 return {workspace,auth,indexedDB,change(next,status){account=next;epoch++;for(const fn of listeners)fn({...auth.read(),...(status?{status}:{})});},refreshAuth(){epoch++;for(const fn of listeners)fn({status:'authenticating',step:'refreshing',account:null});}};
}
test('explicit account activation creates isolated data and local mode never exposes it',async()=>{
 const s=setup();assert.equal(s.workspace.read().mode,'local');await s.workspace.openAccount();
 await s.workspace.write(data=>{data.settings.calories=2000;});assert.equal(s.workspace.getData().settings.calories,2000);
 const leave=await s.workspace.localOnly();await s.workspace.localOnly(leave.confirmation);assert.equal(s.workspace.read().mode,'local');assert.throws(()=>s.workspace.getData());
});
test('account A to B to A retains queues without leaking data',async()=>{
 const s=setup();await s.workspace.openAccount();await s.workspace.write(data=>{data.settings.calories=2000;});s.change(B);
 assert.equal(s.workspace.read().mode,'sealed');await s.workspace.openAccount();assert.equal(s.workspace.getData().settings.calories,2400);
 s.change(A);await s.workspace.openAccount();assert.equal(s.workspace.getData().settings.calories,2000);assert.equal(s.workspace.read().outboxCount,1);
});
test('sealed workspace reports unknown queue count rather than zero and retains the durable queue',async()=>{
 const s=setup();assert.equal(s.workspace.read().outboxCount,0);await s.workspace.openAccount();
 await s.workspace.write(data=>{data.settings.calories=2000;});assert.equal(s.workspace.read().outboxCount,1);
 s.change(null,'expired');assert.equal(s.workspace.read().mode,'sealed');assert.equal(s.workspace.read().outboxCount,null);
 s.change(A);await s.workspace.openAccount();assert.equal(s.workspace.read().outboxCount,1);
});
test('pending transition requires fresh confirmation and cancel mutates nothing',async()=>{
 const s=setup();await s.workspace.openAccount();await s.workspace.write(data=>{data.settings.calories=2000;});
 const warning=await s.workspace.localOnly();assert.equal(warning.warning,true);assert.equal(s.workspace.read().mode,'account');
 await s.workspace.write(data=>{data.settings.calories=2100;});assert.deepEqual(await s.workspace.localOnly(warning.confirmation),{applied:false});
 const fresh=await s.workspace.localOnly();await s.workspace.localOnly(fresh.confirmation);assert.equal(s.workspace.read().mode,'local');
});
test('offline reload explicit cached access preserves pending data without server authority',async()=>{
 const first=setup();await first.workspace.openAccount();await first.workspace.write(data=>{data.settings.calories=2000;});first.workspace.seal();
 const second=setup(first.indexedDB);second.change(null);assert.equal(second.workspace.read().mode,'local');
 const scopes=await second.workspace.cachedScopes();assert.deepEqual(scopes,[A]);await second.workspace.openCached(scopes[0]);
 assert.equal(second.workspace.getData().settings.calories,2000);assert.equal(second.workspace.read().syncStatus,'needs-login');
 await second.workspace.write(data=>{data.settings.protein=130;});assert.equal(second.workspace.read().outboxCount,2);
 await assert.rejects(()=>second.workspace.sync());await assert.rejects(()=>second.workspace.openCached(B));
});
test('old write after logout is rejected and persisted data remains private',async()=>{
 const s=setup();await s.workspace.openAccount();s.change(null);await assert.rejects(()=>s.workspace.write(data=>{data.settings.calories=1;}));assert.equal(s.workspace.read().mode,'sealed');
});
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
test('provisioning device identity is read-only, stable on reload, and sealed with its account',async()=>{
 const s=setup();assert.equal(s.workspace.read().deviceId,null);await s.workspace.openAccount();
 const id=s.workspace.read().deviceId;assert.match(id,/^[0-9a-f-]{36}$/i);
 const probe=createAccountStore({indexedDB:s.indexedDB,dbName:'synthetic-workspace'}),before=await probe.read(A);
 assert.equal(id,before.deviceId);assert.deepEqual(await probe.read(A),before);
 s.workspace.seal();assert.equal(s.workspace.read().deviceId,null);
 const next=setup(s.indexedDB);await next.workspace.openAccount();assert.equal(next.workspace.read().deviceId,id);
 next.change(B);assert.equal(next.workspace.read().deviceId,null);await next.workspace.openAccount();assert.equal(next.workspace.read().uid,B.uid);assert.equal(next.workspace.read().deviceId,(await probe.read(B)).deviceId);
 next.workspace.seal();probe.seal();
});
test('account activation cannot publish an old status after another account opens',async()=>{
 const wait=deferred();let first=true,entered=false;
 const s=setup(new IDBFactory(),{engineFactory:()=>({status(){if(first){first=false;entered=true;return wait.promise;}return{status:'pending'};},pause(){},resume(){}})});
 const pending=s.workspace.openAccount();while(!entered)await new Promise(done=>setImmediate(done));s.change(B);await s.workspace.openAccount();wait.resolve({status:'synced'});
 await assert.rejects(pending,/stale/);assert.equal(s.workspace.read().uid,B.uid);assert.equal(s.workspace.read().syncStatus,'pending');
});
test('old conflict resolution cannot refresh a new account or report stale success',async()=>{
 const wait=deferred();const s=setup(new IDBFactory(),{engineFactory:()=>({status:()=>({status:'pending'}),pause(){},resume(){},resolveConflict:()=>wait.promise})});
 await s.workspace.openAccount();const pending=s.workspace.resolveConflict('conflict','remote','review');s.change(B);await s.workspace.openAccount();wait.resolve({applied:true});
 await assert.rejects(pending,/stale/);assert.equal(s.workspace.read().uid,B.uid);assert.equal(s.workspace.read().syncStatus,'pending');
});
test('old synchronization cannot return success into a new account context',async()=>{
 const wait=deferred();const s=setup(new IDBFactory(),{engineFactory:()=>({status:()=>({status:'pending'}),pause(){},resume(){},sync:()=>wait.promise})});
 await s.workspace.openAccount();const pending=s.workspace.sync();s.change(B);await s.workspace.openAccount();wait.resolve({status:'synced'});
 await assert.rejects(pending,/stale/);assert.equal(s.workspace.read().uid,B.uid);assert.equal(s.workspace.read().syncStatus,'pending');
});
test('cached activation inventory cannot override a newer explicit local workspace choice',async()=>{
 const first=setup();await first.workspace.openAccount();first.workspace.seal();const wait=deferred();
 const next=setup(first.indexedDB,{storeFactory:options=>({...createAccountStore(options),listScopes:()=>wait.promise})});
 const pending=next.workspace.openCached(A);await next.workspace.localOnly();wait.resolve([A]);
 await assert.rejects(pending,/stale/);assert.equal(next.workspace.read().mode,'local');assert.throws(()=>next.workspace.getData());
});
test('token refresh during opening seals incomplete account activation instead of bypassing its lease',async()=>{
 const s=setup();const pending=s.workspace.openAccount();s.refreshAuth();await assert.rejects(pending,/stale|sealed/);
 assert.equal(s.workspace.read().mode,'sealed');assert.throws(()=>s.workspace.getData());
});
test('logout and terminal auth transitions seal an explicitly cached account while preserving its queued edits',async()=>{
 for(const status of ['signed-out','expired','error','local-only','switching']){
  const s=setup();await s.workspace.openAccount();await s.workspace.write(data=>{data.settings.calories=2000;});s.workspace.seal();
  await s.workspace.openCached(A);assert.equal(s.workspace.read().cached,true);assert.equal(s.workspace.getData().settings.calories,2000);
  s.change(null,status);assert.equal(s.workspace.read().mode,'sealed');assert.throws(()=>s.workspace.getData(),/sealed/);
  await s.workspace.openCached(A);assert.equal(s.workspace.getData().settings.calories,2000);assert.equal(s.workspace.read().outboxCount,1);
  s.workspace.seal();
 }
});

async function sharedLiveFixture(){
 const s=setup();await s.workspace.openAccount();
 const probe=createAccountStore({indexedDB:s.indexedDB,dbName:'synthetic-workspace'});
 const {historyEditBase,...payload}=createStartedSession({workout:'A',date:'2026-10-09',week:1});
 await probe.transact(A,null,row=>{row.shadow.push({kind:'workout',recordId:payload.id,payload,payloadSchema:8,phase:'live',deleted:false,deviceId:null,position:'0',revision:'1',commitSequence:'1'});row.initialized=true;row.cursor='1';});
 await s.workspace.refresh();return {...s,probe,payload};
}
test('shared live workout remains unselected until explicit choice; selection creates no mutation outbox',async()=>{
 const s=await sharedLiveFixture();assert.equal(s.workspace.getData().draft,null);assert.equal(s.workspace.availableLive()[0].recordId,s.payload.id);
 const selected=await s.workspace.selectLive(s.payload.id);assert.equal(selected.draft.id,s.payload.id);assert.equal(selected.draft.historyEditBase,null);assert.equal(s.workspace.read().outboxCount,0);
 const before=await s.probe.read(A);await assert.rejects(s.workspace.selectLive(s.payload.id),/unavailable/);assert.deepEqual(await s.probe.read(A),before);
 s.workspace.seal();s.probe.seal();
});
test('read-only projection/history/status navigation does not mutate account row or queue',async()=>{
 const s=await sharedLiveFixture();const before=await s.probe.read(A);
 for(let index=0;index<6;index++){s.workspace.getData();s.workspace.read();s.workspace.availableLive();await s.workspace.refresh(false);}
 assert.deepEqual(await s.probe.read(A),before);s.workspace.seal();s.probe.seal();
});

test('opening a cached workspace never inherits a previous account Synced status',async()=>{
 const s=setup(new IDBFactory(),{engineFactory:()=>({status:()=>({status:'synced'}),pause(){},resume(){}})});
 await s.workspace.openAccount();assert.equal(s.workspace.read().syncStatus,'synced');
 const observed=[];s.workspace.subscribe(state=>observed.push(state));await s.workspace.openAccount();
 assert.equal(observed.find(state=>state.mode==='opening').syncStatus,'pending');s.workspace.seal();
});
