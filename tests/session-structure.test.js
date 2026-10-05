import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartedSession, applySessionCommand, createSessionStore } from '../js/session-runtime.js';
import { libraryExercises } from '../js/custom-workout.js';
import { PROGRAM } from '../js/program.js';
import { createBackup, parseBackup, updateData, loadData } from '../js/data.js';
import { nextIncompleteSlot } from '../js/session-readers.js';
import { exerciseHistory } from '../js/progress.js';
import { representativeState } from './fixtures/representative-state.js';

const initial = () => { const data=representativeState(); data.draft=createStartedSession({workout:'A',week:4,date:'2026-10-05'}); return data; };
const values={weight:20,unit:'kg',reps:10,rir:2};
const log=(d,index=0,number=1)=>({type:'log',slotId:d.sessionStructure.slots[index].id,setNumber:number,values});
const picked=(data, count=1)=>libraryExercises(data.customExercises).filter(ex=>!data.draft.sessionStructure.slots.some(s=>s.status==='active'&&s.exerciseId===ex.id)).slice(0,count).map(definition=>({definition:structuredClone(definition),prescription:{sets:2,repMin:8,repMax:12,targetRIR:'2',restSeconds:90,notes:definition.notes||''},setupNote:''}));
const apply=(data,command)=>applySessionCommand(data,structuredClone(data.draft),command);
function harness(data=initial()) {
 let raw=JSON.stringify(data), writes=0, fail=false, queue=Promise.resolve();
 const storage={getItem:()=>raw,setItem:(_,next)=>{if(fail)throw Error('quota');raw=next;writes++;}};
 const locks={request:(name,fn)=>{assert.equal(name,'vshape-tracker-write');const op=queue.then(fn);queue=op.catch(()=>{});return op;}};
 const client=()=>{let state=loadData(storage);const store=createSessionStore({getData:()=>state,write:fn=>updateData(storage,locks,fn),acceptData:next=>state=next});return {store,get:()=>state,refresh(){state=loadData(storage);store.reset();}};};
 return {client,storage,locks,raw:()=>raw,disk:()=>loadData(storage),writes:()=>writes,fail:value=>fail=value};
}

test('atomic multi-Add appends accepted UUID occurrences in selection order without creating sets or changing sources',async()=>{
 const data=initial(),h=harness(data),c=h.client(),baseline=structuredClone(data),candidates=picked(data,2);
 candidates[1].prescription={sets:3,repMin:6,repMax:10,targetRIR:'1–3',restSeconds:120,notes:'Reviewed personal technique'};
 await c.store.command({type:'add',candidates},c.get().draft);
 const result=h.disk(),old=baseline.draft.sessionStructure.slots,added=result.draft.sessionStructure.slots.slice(old.length);
 assert.equal(h.writes(),1);assert.equal(result.draft.sessionStructure.revision,1);assert.deepEqual(result.draft.sets,[]);
 assert.deepEqual(result.draft.sessionStructure.slots.slice(0,old.length),old);
 assert.deepEqual(added.map(s=>s.exerciseId),candidates.map(c=>c.definition.id));
 for(const s of added){assert.match(s.id,/^[0-9a-f-]{36}$/);assert.equal(s.sourceSlotId,null);assert.equal(s.replacesSlotId,null);assert.equal(s.status,'active');}
 assert.deepEqual(added[0].snapshot,{name:candidates[0].definition.name,sets:2,reps:'8–12',rest:'90 giây',rir:'2',notes:candidates[0].definition.notes||'',setupNote:''});
 assert.equal(added[1].snapshot.sets,3);assert.equal(added[1].snapshot.reps,'6–10');assert.equal(added[1].snapshot.notes,'Reviewed personal technique');
 assert.deepEqual(result.draft.sessionStructure.order,[...baseline.draft.sessionStructure.order,...added.map(s=>s.id)]);
 for(const key of Object.keys(baseline).filter(k=>k!=='draft'))assert.deepEqual(result[key],baseline[key],key);
});

test('Remove zero or partial logs retains registry/order/snapshot and every set byte, corrections do not reopen it',()=>{
 for(const number of [0,2]){const d=initial();for(let n=1;n<=number;n++)apply(d,log(d.draft,0,n));
 const before=structuredClone(d.draft),slot=before.sessionStructure.slots[0];apply(d,{type:'remove',slotId:slot.id});
 assert.equal(d.draft.sessionStructure.slots[0].status,'removed');assert.equal(d.draft.sessionStructure.slots.length,before.sessionStructure.slots.length);
 assert.deepEqual(d.draft.sets,before.sets);assert.deepEqual(d.draft.sessionStructure.order,before.sessionStructure.order);assert.deepEqual(d.draft.sessionStructure.slots[0].snapshot,slot.snapshot);
 assert.throws(()=>apply(d,log(d.draft,0,3)));assert.notEqual(nextIncompleteSlot(d.draft),slot.id);
 if(number){apply(d,{type:'edit',slotId:slot.id,setId:d.draft.sets[0].id,values:{...values,reps:11}});assert.equal(d.draft.sessionStructure.slots[0].status,'removed');}
 }
});

test('Reorder swaps adjacent active positions while inactive entries/registry/sets stay fixed and next follows new order',()=>{
 const d=initial();apply(d,log(d.draft,0));apply(d,{type:'remove',slotId:d.draft.sessionStructure.slots[1].id});
 const before=structuredClone(d.draft),ids=before.sessionStructure.order;apply(d,{type:'reorder',slotId:ids[2],direction:'up'});
 assert.deepEqual(d.draft.sessionStructure.order,[ids[2],ids[1],ids[0],...ids.slice(3)]);
 assert.deepEqual(d.draft.sessionStructure.slots,before.sessionStructure.slots);assert.deepEqual(d.draft.sets,before.sets);assert.equal(d.draft.sessionStructure.revision,before.sessionStructure.revision+1);
 assert.equal(nextIncompleteSlot(d.draft),ids[2]);apply(d,{type:'reorder',slotId:ids[2],direction:'down'});assert.deepEqual(d.draft.sessionStructure.order,ids);
});

test('Add rejects edited/archived/deleted definitions or invalid prescriptions atomically and retains disk',async()=>{
 for(const kind of ['edited','archived','deleted','invalid','duplicate','active','setup']){
 const d=initial(),candidates=picked(d,2);candidates[1].definition=structuredClone(d.customExercises[0]);candidates[1].prescription.notes='custom notes';
 if(kind==='edited')d.customExercises[0].name='Changed since preview';
 if(kind==='archived')d.customExercises[0].archived=true;
 if(kind==='deleted')d.customExercises=[];
 if(kind==='invalid')candidates[1].prescription.repMin=99;
 if(kind==='duplicate')candidates[1]=structuredClone(candidates[0]);
 if(kind==='active')candidates[1].definition=libraryExercises(d.customExercises).find(e=>e.id===d.draft.sessionStructure.slots[0].exerciseId);
 if(kind==='setup')candidates[1].setupNote='unreviewed note';
 const h=harness(d),c=h.client(),raw=h.raw();await assert.rejects(c.store.command({type:'add',candidates},c.get().draft),/bài|hiệp|reps|ghi chú|trùng|đổi/i);assert.equal(h.raw(),raw);assert.equal(h.writes(),0);
 }
});

test('registry cap counts tombstones, accepts exactly100, rejects101 and preserves imported101 without truncation',async()=>{
 for(const count of [99,100,101]){const d=initial(),prototype=d.draft.sessionStructure.slots[0];d.draft.sessionStructure.slots=Array.from({length:count},(_,i)=>({...structuredClone(prototype),id:'large-'+i,status:'removed'}));d.draft.sessionStructure.order=d.draft.sessionStructure.slots.map(s=>s.id);
 const h=harness(d),c=h.client(),candidates=picked(d),raw=h.raw();
 if(count===99){await c.store.command({type:'add',candidates},c.get().draft);assert.equal(h.disk().draft.sessionStructure.slots.length,100);}
 else{await assert.rejects(c.store.command({type:'add',candidates},c.get().draft),/100|kỹ thuật/);assert.equal(h.raw(),raw);assert.equal(h.disk().draft.sessionStructure.slots.length,count);}
 }
});

test('history editors, unknown baselines, raw legacy and malformed structured drafts cannot structurally mutate',async()=>{
 for(const kind of ['history','unknown','legacy','broken']){const d=initial(),candidates=picked(d);if(kind==='history'){const completed=structuredClone(d.draft);delete completed.historyEditBase;d.sessions.push(completed);d.draft.historyEditBase=completed;}
 if(kind==='unknown')d.draft.historyEditBase={kind:'legacy-unknown'};
 if(kind==='legacy')delete d.draft.sessionStructure;
 if(kind==='broken')d.draft.sessionStructure.order.pop();
 const before=structuredClone(d);assert.throws(()=>apply(d,{type:'add',candidates}),/hợp lệ|lịch sử|identity/i);assert.deepEqual(d,before);
 }
});

test('Remove then Add same exercise creates new occurrence while the old tombstone/logs stay distinct',()=>{
 const d=initial();apply(d,log(d.draft));const original=structuredClone(d.draft.sessionStructure.slots[0]);apply(d,{type:'remove',slotId:original.id});
 const definition=libraryExercises(d.customExercises).find(e=>e.id===original.exerciseId);apply(d,{type:'add',candidates:[{definition,prescription:{sets:2,repMin:8,repMax:12,targetRIR:'2',restSeconds:90,notes:definition.notes||''},setupNote:''}]});
 const added=d.draft.sessionStructure.slots.at(-1);assert.notEqual(added.id,original.id);assert.equal(d.draft.sessionStructure.slots[0].status,'removed');apply(d,log(d.draft,d.draft.sessionStructure.slots.length-1));assert.equal(d.draft.sets[0].slotId,original.id);assert.equal(d.draft.sets[1].slotId,added.id);
});

test('Remove/Reorder boundary and inactive targets reject without increment; all-inactive draft persists',()=>{
 const d=initial();for(const slot of [...d.draft.sessionStructure.slots])apply(d,{type:'remove',slotId:slot.id});const before=structuredClone(d);
 for(const intent of [{type:'remove',slotId:d.draft.sessionStructure.slots[0].id},{type:'reorder',slotId:d.draft.sessionStructure.slots[0].id,direction:'up'}]){assert.throws(()=>apply(d,intent),/active|đang tập|hợp lệ/);assert.deepEqual(d,before);}
 assert.equal(nextIncompleteSlot(d.draft),null);assert.throws(()=>apply(d,{type:'complete'}));assert.ok(d.draft);apply(d,{type:'add',candidates:picked(d)});assert.ok(nextIncompleteSlot(d.draft));
});

test('each structural quota failure retains bytes/revision and never partially persists',async()=>{
 for(const type of ['add','remove','reorder']){const d=initial(),h=harness(d),c=h.client(),raw=h.raw();h.fail(true);
 const intent=type==='add'?{type,candidates:picked(d,2)}:{type,slotId:d.draft.sessionStructure.slots[1].id,direction:'up'};
 await assert.rejects(c.store.command(intent,c.get().draft),/Không thể lưu|dung lượng/);assert.equal(h.raw(),raw);assert.equal(h.writes(),0);assert.equal(c.store.status().state,'error');}
});

test('first writer wins structural/set/Complete/discard/switch/reopen races; stale commands do not merge or resurrect',async()=>{
 for(const pair of [['log','add'],['log','remove'],['reorder','log'],['remove','edit'],['complete','add'],['complete','remove'],['complete','reorder'],['discard','add'],['start','reorder'],['reopen','add']]){
 const d=initial();apply(d,log(d.draft));const h=harness(d),a=h.client(),b=h.client(),slot=d.draft.sessionStructure.slots[0].id;
 const intent=type=>type==='add'?{type,candidates:picked(d)}:type==='log'?log(d.draft,0,2):type==='edit'?{type,setId:d.draft.sets[0].id,slotId:slot,values:{...values,reps:11}}:type==='reorder'?{type,slotId:d.draft.sessionStructure.slots[1].id,direction:'up'}:type==='remove'?{type,slotId:slot}:{type};
 if(pair[0]==='start')await a.store.start({workout:'B',week:4,date:'2026-10-05'},a.get().draft);
 else if(pair[0]==='reopen')await a.store.reopen(a.get().sessions[0],a.get().draft);
 else await a.store.command(intent(pair[0]),a.get().draft);
 const won=h.raw();await assert.rejects(b.store.command(intent(pair[1]),b.get().draft),/đổi|cũ/);assert.equal(h.raw(),won,pair.join('/'));assert.equal(h.writes(),1);
 }
});

test('same-tab structural stale intents reject without replay in the shared queue',async()=>{
 for(const pair of [['reorder','log'],['log','reorder'],['add','complete'],['log','add'],['add','remove']]){
 const d=initial();apply(d,log(d.draft));const h=harness(d),c=h.client(),baseline=c.get().draft;
 const intent=type=>type==='add'?{type,candidates:picked(d)}:type==='log'?log(baseline,0,2):type==='reorder'?{type,slotId:baseline.sessionStructure.slots[1].id,direction:'up'}:type==='remove'?{type,slotId:baseline.sessionStructure.slots[0].id}:{type};
 const outcomes=await Promise.allSettled([c.store.command(intent(pair[0]),baseline),c.store.command(intent(pair[1]),baseline)]);
 assert.equal(outcomes[0].status,'fulfilled',pair.join('/'));assert.equal(outcomes[1].status,'rejected',pair.join('/'));assert.equal(h.writes(),1);assert.ok(h.disk().draft);assert.equal(h.disk().draft.sets.length,pair[0]==='log'?2:1);
 }
});

test('immutable Add and unrelated food changes survive; manually reviewed next write succeeds; Complete prevents resurrection',async()=>{
 const d=initial(),h=harness(d),c=h.client(),baseline=c.get().draft,candidates=picked(d),acceptedName=candidates[0].definition.name;
 const add=c.store.command({type:'add',candidates},baseline);candidates[0].definition.name='Mutated after enqueue';candidates[0].prescription.sets=20;
 await updateData(h.storage,h.locks,next=>next.foods[0].notes='Unrelated concurrent food note');await add;
 assert.equal(h.disk().draft.sessionStructure.revision,1);assert.equal(h.disk().draft.sessionStructure.slots.at(-1).snapshot.name,acceptedName);assert.equal(h.disk().draft.sessionStructure.slots.at(-1).snapshot.sets,2);
 await c.store.command(log(c.get().draft),c.get().draft);
 assert.equal(h.disk().draft.sets[0].slotId,baseline.sessionStructure.slots[0].id);assert.equal(h.disk().foods[0].notes,'Unrelated concurrent food note');
 const complete=c.store.command({type:'complete'},c.get().draft),late=c.store.command({type:'remove',slotId:baseline.sessionStructure.slots[0].id},c.get().draft);await complete;await assert.rejects(late);assert.equal(h.disk().draft,null);
});

test('modified final structure roundtrips backup/reopen; zero-log rows do not fabricate performance; PROGRAM/plan/planning stay unchanged',()=>{
 const d=initial(),source=structuredClone(d),program=JSON.stringify(PROGRAM);apply(d,log(d.draft));apply(d,{type:'add',candidates:picked(d,2)});
 const added=d.draft.sessionStructure.slots.at(-1),old=d.draft.sessionStructure.slots[0];apply(d,{type:'remove',slotId:old.id});apply(d,{type:'reorder',slotId:added.id,direction:'up'});
 const final=structuredClone(d.draft);apply(d,{type:'complete'});const done=d.sessions.at(-1),restored=parseBackup(createBackup(d));assert.deepEqual(restored.data.sessions.at(-1),done);
 assert.deepEqual(done.sessionStructure.slots,final.sessionStructure.slots);assert.deepEqual(done.sessionStructure.order,final.sessionStructure.order);assert.deepEqual(done.sets,final.sets);assert.equal(done.sets.length,1);
 assert.equal(exerciseHistory([done],old.snapshot.name).length,1);assert.equal(exerciseHistory([done],added.snapshot.name).length,0);
 for(const key of ['plans','activePlanId','planningDraft','customExercises'])assert.deepEqual(d[key],source[key],key);assert.equal(JSON.stringify(PROGRAM),program);
});
