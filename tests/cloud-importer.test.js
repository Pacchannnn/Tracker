import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createAccountStore } from '../js/cloud-store.js';
const module = await import('../js/cloud-importer.js').catch(() => ({}));
const scope = { uid:'11111111-1111-4111-8111-111111111111', environment:'preview', projectId:'synthetic' };
export async function rehearsal() {
  assert.equal(typeof module.createAccountImporter, 'function');
  const store = createAccountStore({ indexedDB:new IDBFactory() }); await store.open(scope);
  const importer = module.createAccountImporter({store,scope});
  const source = ' {"schemaVersion":8,"foods":[{"id":"legacy food","name":"Rice","serving":"100 g","calories":130,"protein":2,"carbs":28,"fat":0}]} ';
  const ledger = await importer.prepare(source);
  const decisions = ledger.preview.candidates.map(c=>({kind:c.kind,recordId:c.recordId,action:'import'}));
  const planned = await importer.plan(ledger.id, decisions, true);
  assert.equal((await store.read(scope)).outbox.length,0);
  await importer.queue(ledger.id); await importer.resume(ledger.id);
  const queued = await store.read(scope); assert.equal(queued.outbox.length,1);
  assert.deepEqual(queued.outbox[0].request,planned.batches[0].request);
  // Server applied, but acknowledgement was lost: restarting keeps the same operation.
  await module.createAccountImporter({store,scope}).resume(ledger.id);
  assert.equal((await store.read(scope)).outbox[0].id,queued.outbox[0].id);
  const batch = planned.batches[0];
  await store.transact(scope,null,row=>{
    row.outbox=[]; row.receipts.push({operationId:batch.operationId,request:batch.request,commitSequence:'1',records:[{...batch.request.changes[0],revision:'1',commitSequence:'1',position:'0',deleted:false,phase:null,deviceId:null}]});
  });
  const accepted = await importer.resume(ledger.id);
  assert.equal(accepted.state,'accepted'); await importer.resume(ledger.id);
  assert.equal((await store.read(scope)).outbox.length,0);
  assert.equal((await importer.read(ledger.id)).source.text,source);
  return {sourceUnchanged:true,duplicateOperations:0,state:accepted.state};
}
test('durable reviewed queue survives interruption and lost ACK without duplicates',rehearsal);
test('schema8 note mapping imports exact text and preserves raw source through receipt replay',async()=>{
  const store=createAccountStore({indexedDB:new IDBFactory()}); await store.open(scope);
  const importer=module.createAccountImporter({store,scope});
  const source=' {"schemaVersion":8,"exerciseNotes":{"squat":"Line one\\nLine two ✓"}} ';
  const ledger=await importer.prepare(source), decisions=[{kind:'exercise_note',recordId:'squat',action:'import'}];
  const planned=await importer.plan(ledger.id,decisions,true), batch=planned.batches[0];
  assert.deepEqual(batch.request.changes[0].payload,{text:'Line one\nLine two ✓'});
  assert.equal(batch.payloadMapping,'schema8-exercise-note-v1');
  await importer.queue(ledger.id); await importer.resume(ledger.id);
  const queued=await store.read(scope); assert.deepEqual(queued.outbox[0].request,batch.request);
  await store.transact(scope,null,row=>{row.outbox=[];row.receipts.push({operationId:batch.operationId,request:batch.request,commitSequence:'1',records:[{...batch.request.changes[0],revision:'1',commitSequence:'1',position:'0',deleted:false,phase:null,deviceId:null}]});});
  const accepted=await importer.resume(ledger.id);
  assert.equal(accepted.state,'accepted'); assert.equal(accepted.source.text,source);
  assert.deepEqual(accepted.sourceHashes,ledger.sourceHashes);
  assert.deepEqual((await importer.resume(ledger.id)).batches,planned.batches);
});
test('domain invalid payload and old schema never queue',async()=>{
  const store=createAccountStore({indexedDB:new IDBFactory()}); await store.open(scope);
  assert.equal(typeof module.createAccountImporter,'function'); const importer=module.createAccountImporter({store,scope});
  const ledger=await importer.prepare('{"schemaVersion":8,"foods":[{"id":"bad"}]}');
  await assert.rejects(()=>importer.plan(ledger.id,[{kind:'food',recordId:'bad',action:'import'}],true));
  assert.equal((await store.read(scope)).outbox.length,0);
  const old=await importer.prepare('{"schemaVersion":7,"foods":[{"id":"old","name":"Rice","serving":"g","calories":1,"protein":1,"carbs":1,"fat":1}]}');
  const decisions=[...old.unresolved.map(r=>({reviewId:r.reviewId,action:'keep-local'})),{kind:'food',recordId:'old',action:'import'}];
  await assert.rejects(()=>importer.plan(old.id,decisions,true),/unsupported_import_schema/);
});
test('photo references remain explicitly local and account switch seals importer',async()=>{
  const store=createAccountStore({indexedDB:new IDBFactory()}); await store.open(scope);
  let current=true; const importer=module.createAccountImporter({store,scope,isCurrent:()=>current});
  const source=JSON.stringify({schemaVersion:8,foods:[{id:'photo food',name:'Rice',serving:'g',calories:1,protein:1,carbs:1,fat:1,photoId:'legacy photo'}]});
  const ledger=await importer.prepare(source);
  await assert.rejects(()=>importer.plan(ledger.id,[{kind:'food',recordId:'photo food',action:'import'}],true),/photo_keep_local/);
  await importer.plan(ledger.id,[{kind:'food',recordId:'photo food',action:'keep-local'}],true);
  await importer.queue(ledger.id); assert.equal((await store.read(scope)).outbox.length,0);
  current=false; await assert.rejects(()=>importer.read(ledger.id),/workspace_changed/);
});
test('concurrent local collision aborts all queue changes',async()=>{
  const store=createAccountStore({indexedDB:new IDBFactory()}); await store.open(scope);
  const importer=module.createAccountImporter({store,scope});
  const food={id:'collision',name:'Rice',serving:'g',calories:1,protein:1,carbs:1,fat:1};
  const ledger=await importer.prepare(JSON.stringify({schemaVersion:8,foods:[food]}));
  await importer.plan(ledger.id,[{kind:'food',recordId:food.id,action:'import'}],true);
  await store.commit(scope,data=>data.foods.push(food));
  const before=await store.read(scope);
  await assert.rejects(()=>importer.queue(ledger.id),/import_target_collision/);
  assert.deepEqual(await store.read(scope),before);
});
