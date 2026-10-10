import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, ensureUnchanged } from '../js/data.js';
import { createStartedSession, guardSession, applySessionCommand } from '../js/session-runtime.js';
import { createDraftStore } from '../js/planning-draft.js';
const reordered = value => Array.isArray(value) ? value.map(reordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).reverse().map(k => [k,reordered(value[k])])) : value;
test('JSONB object key order never falsely invalidates a session; real content/order/revision changes still reject',()=>{
  const session=createStartedSession({workout:'A',date:'2026-10-09',week:1});
  const accepted=reordered(session);guardSession(accepted,session);
  const data=emptyData();data.draft=accepted;
  applySessionCommand(data,session,{type:'log',slotId:session.sessionStructure.order[0],setNumber:1,values:{weight:20,reps:10,rir:3,unit:'kg'}});
  assert.equal(data.draft.sets.length,1);
  for(const change of [s=>s.notes='changed',s=>s.sessionStructure.revision++,s=>s.sessionStructure.order.reverse()]){const next=structuredClone(session);change(next);assert.throws(()=>guardSession(next,session));}
});
test('record editor ignores key order while retaining rejection of changed snapshot content',()=>{
  const item={id:'synthetic',name:'Food',macros:{calories:100,protein:2},items:[{id:'a'},{id:'b'}]};
  ensureUnchanged(reordered(item),item);assert.throws(()=>ensureUnchanged({...item,name:'different'},item));
  assert.throws(()=>ensureUnchanged({...item,items:[{id:'b'},{id:'a'}]},item));
});
test('planning queue can save again after server JSONB reorders its envelope',async()=>{
  let data=emptyData();const store=createDraftStore({getData:()=>data,write:async change=>{const next=reordered(data);change(next);data=next;return next;}});
  store.reset();await store.discard('builder');data=reordered(data);await store.discard('planner');assert.equal(data.planningDraft.revision,2);
});
