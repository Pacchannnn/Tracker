import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartedSession, applySessionCommand, createSessionStore } from '../js/session-runtime.js';
import { reviewReplacement, replacementRemaining } from '../js/session-structure.js';
import { libraryExercises } from '../js/custom-workout.js';
import { createBackup,parseBackup,updateData,loadData } from '../js/data.js';
import { validateSessionIdentity } from '../js/session-identity.js';
import { nextIncompleteSlot,previousOccurrences,previousValues,replacementLabel } from '../js/session-readers.js';
import { exerciseHistory } from '../js/progress.js';
import { PROGRAM } from '../js/program.js';
import { restSeconds } from '../js/workout.js';
import { filterExercises, rankedPickerResults } from '../js/exercise-picker.js';
import { representativeState } from './fixtures/representative-state.js';
const initial=()=>{const d=representativeState();d.draft=createStartedSession({workout:'A',week:4,date:'2026-10-05'});return d;};
const apply=(d,c)=>applySessionCommand(d,structuredClone(d.draft),c);
const log=(s,index=0,number=1)=>({type:'log',slotId:s.sessionStructure.slots[index].id,setNumber:number,values:{weight:25,unit:'kg',reps:10,rir:2}});
const pick=(d,source=d.draft.sessionStructure.slots[0])=>libraryExercises(d.customExercises).find(e=>e.id!==source.exerciseId&&!d.draft.sessionStructure.slots.some(s=>s.status==='active'&&s.exerciseId===e.id));
const replace=(d,source=d.draft.sessionStructure.slots[0],definition=pick(d,source))=>({type:'replace',slotId:source.id,candidate:reviewReplacement(definition,d,source)});
test('accepted decimal minute rest drives successor timer with exact seconds and keeps range minimum',()=>{
 for(const [raw,seconds] of [['1.5 phút',90],['0.5 phút',30],['0.5–1.5 phút',30],[' 90 giây ',90],[' 1.5 phút ',90]]){const d=initial(),command=replace(d);command.candidate.prescription.rest=raw;apply(d,command);assert.equal(restSeconds(d.draft.sessionStructure.slots.at(-1).snapshot.rest),seconds);}
});
test('untouched valid imported prescription text is retained even outside Builder edit grammar/bounds',()=>{
 const d=initial();d.draft=structuredClone(d.draft);const source=d.draft.sessionStructure.slots[0];source.snapshot.reps='101–110';source.snapshot.rest='45 phút';source.snapshot.rir='2–3 (theo cảm giác)';validateSessionIdentity(d.draft);
 const command=replace(d);apply(d,command);const snapshot=d.draft.sessionStructure.slots.at(-1).snapshot;for(const key of ['reps','rest','rir'])assert.equal(snapshot[key],source.snapshot[key]);
});
test('live custom Vietnamese candidate uses shared accent/AND/alternatives and preserves missing equipment metadata',()=>{
 const d=initial(),e=d.customExercises[0];e.name='Kéo lưng riêng — bài thử tiếng Việt có tên dài để duyệt thiết bị';e.equipment=[];
 const catalog=libraryExercises(d.customExercises),candidate=filterExercises(catalog,{query:'KEO LUNG RIENG',muscle:'back',pattern:'horizontal-pull'});assert.deepEqual(candidate.map(e=>e.id),[e.id]);assert.deepEqual(filterExercises(candidate,{equipment:'cable'}),[]);
 assert.equal(rankedPickerResults(catalog[0],candidate,'')[0].exercise.id,e.id);const before=structuredClone(d.customExercises);apply(d,replace(d,d.draft.sessionStructure.slots[0],candidate[0]));assert.equal(d.draft.sessionStructure.slots.at(-1).snapshot.name,e.name);assert.deepEqual(d.customExercises,before);
});
test('replacement labels follow links across reorder and removal, including zero-log predecessor',()=>{
 const d=initial(),a=d.draft.sessionStructure.slots[0];apply(d,replace(d));const b=d.draft.sessionStructure.slots.at(-1);apply(d,replace(d,b));const c=d.draft.sessionStructure.slots.at(-1);
 apply(d,{type:'reorder',slotId:c.id,direction:'down'});assert.equal(replacementLabel(d.draft,b),`Thay cho ${a.snapshot.name}`);assert.equal(replacementLabel(d.draft,c),`Thay cho ${b.snapshot.name}`);assert.equal(replacementLabel(d.draft,a),'');
 apply(d,{type:'remove',slotId:c.id});assert.equal(replacementLabel(d.draft,c),`Thay cho ${b.snapshot.name}`);assert.deepEqual(d.draft.sets,[]);
});
function harness(data=initial()){
 let raw=JSON.stringify(data),writes=0,fail=false,q=Promise.resolve();const storage={getItem:()=>raw,setItem:(_,value)=>{if(fail)throw Error('quota');raw=value;writes++;}};
 const locks={request:(_,fn)=>{const op=q.then(fn);q=op.catch(()=>{});return op;}};
 const client=()=>{let state=loadData(storage);const store=createSessionStore({getData:()=>state,write:fn=>updateData(storage,locks,fn),acceptData:next=>state=next});return {store,get:()=>state,refresh(){state=loadData(storage);store.reset();}};};
 return {client,raw:()=>raw,disk:()=>loadData(storage),writes:()=>writes,fail:value=>fail=value,storage,locks};
}

test('Replace0 closes old occurrence and appends UUID successor after old order position in one revision/write',async()=>{
 const d=initial(),before=structuredClone(d),old=d.draft.sessionStructure.slots[0],h=harness(d),c=h.client();await c.store.command(replace(d),c.get().draft);
 const s=h.disk().draft,added=s.sessionStructure.slots.at(-1);assert.equal(h.writes(),1);assert.equal(s.sessionStructure.revision,1);assert.deepEqual(s.sets,[]);
 assert.equal(s.sessionStructure.slots[0].status,'replaced');assert.deepEqual(s.sessionStructure.slots[0],{...before.draft.sessionStructure.slots[0],status:'replaced'});
 assert.match(added.id,/^[0-9a-f-]{36}$/);assert.notEqual(added.id,old.id);assert.equal(added.sourceSlotId,null);assert.equal(added.replacesSlotId,old.id);assert.equal(added.status,'active');assert.equal(added.snapshot.sets,3);
 for(const field of ['reps','rest','rir'])assert.equal(added.snapshot[field],old.snapshot[field]);assert.deepEqual(s.sessionStructure.order,[old.id,added.id,...before.draft.sessionStructure.order.slice(1)]);
 for(const key of Object.keys(before).filter(k=>k!=='draft'))assert.deepEqual(h.disk()[key],before[key]);
});

test('partial Replace keeps every old set field/order; successor remaining1 has blank performance and owns only new saved sets',()=>{
 const d=initial();apply(d,log(d.draft,0,1));apply(d,log(d.draft,0,2));const before=structuredClone(d.draft),command=replace(d);assert.equal(command.candidate.prescription.sets,1);apply(d,command);
 const newSlot=d.draft.sessionStructure.slots.at(-1);assert.deepEqual(d.draft.sets,before.sets);assert.deepEqual(d.draft.sessionStructure.slots[0].snapshot,before.sessionStructure.slots[0].snapshot);assert.equal(newSlot.snapshot.sets,1);
 assert.equal(d.draft.sets.filter(s=>s.slotId===newSlot.id).length,0);assert.throws(()=>apply(d,log(d.draft,0,3)));apply(d,log(d.draft,d.draft.sessionStructure.slots.length-1,1));assert.equal(d.draft.sets.at(-1).slotId,newSlot.id);assert.equal(d.draft.sets.at(-1).exerciseIndex,6);
 const final=structuredClone(d.draft);apply(d,{type:'complete'});assert.deepEqual(d.sessions.at(-1).sets,final.sets);assert.deepEqual(parseBackup(createBackup(d)).data.sessions.at(-1),d.sessions.at(-1));
});

test('review preserves raw unilateral/unknown/rest ranges but captures only new candidate notes/setup; edited target is accepted',()=>{
 const d=initial();d.draft=structuredClone(createStartedSession({workout:'B',week:4,date:'2026-10-05'}));const source=d.draft.sessionStructure.slots.at(-1);source.snapshot.setupNote='OLD GRIP';source.snapshot.notes='OLD TECHNIQUE';source.snapshot.rest='60–90 giây';
 const candidate=pick(d,source);d.exerciseNotes[`exercise:${candidate.id}`]='NEW SETUP';const command=replace(d,source,candidate);assert.equal(command.candidate.prescription.reps,'6–10 mỗi bên');assert.equal(command.candidate.prescription.rir,'DATA NOT DEFINED YET');assert.equal(command.candidate.prescription.rest,'60–90 giây');assert.equal(command.candidate.setupNote,'NEW SETUP');assert.equal(command.candidate.prescription.notes,candidate.notes||'');
 command.candidate.prescription.sets=3;apply(d,command);const added=d.draft.sessionStructure.slots.at(-1);assert.equal(added.snapshot.sets,3);assert.equal(added.snapshot.setupNote,'NEW SETUP');assert.notEqual(added.snapshot.notes,'OLD TECHNIQUE');assert.equal(source.snapshot.setupNote,'OLD GRIP');
});

test('Replace completed/overrun/inactive and registry100/101 reject without truncation;99 accepts100',()=>{
 for(const count of [3,4]){const d=initial();for(let n=1;n<=3;n++)apply(d,log(d.draft,0,n));if(count===4)d.draft.sets.push({...d.draft.sets[0],id:'overrun',setNumber:4});const before=structuredClone(d);assert.equal(replacementRemaining(d.draft,d.draft.sessionStructure.slots[0]),0);assert.throws(()=>apply(d,replace(d)),/đủ hiệp/);assert.deepEqual(d,before);}
 for(const count of [99,100,101]){const d=initial(),p=d.draft.sessionStructure.slots[1];d.draft.sessionStructure.slots.push(...Array.from({length:count-6},(_,i)=>({...structuredClone(p),id:'closed-'+i,status:'removed'})));d.draft.sessionStructure.order=d.draft.sessionStructure.slots.map(s=>s.id);const before=structuredClone(d);
 if(count===99){apply(d,replace(d));assert.equal(d.draft.sessionStructure.slots.length,100);}else{assert.throws(()=>apply(d,replace(d)),/100/);assert.deepEqual(d,before);}}
});

test('A→B→C budgets only its immediate source; reorder/link, Remove successor and old set deletion never reopen or rebudget',()=>{
 const d=initial(),a=d.draft.sessionStructure.slots[0];apply(d,log(d.draft));apply(d,replace(d));const b=d.draft.sessionStructure.slots.at(-1);assert.equal(b.snapshot.sets,2);apply(d,log(d.draft,6));apply(d,replace(d,b));const c=d.draft.sessionStructure.slots.at(-1);assert.equal(c.snapshot.sets,1);assert.equal(c.replacesSlotId,b.id);assert.equal(b.replacesSlotId,a.id);assert.equal(d.draft.sessionStructure.slots[0].status,'replaced');
 apply(d,{type:'reorder',slotId:c.id,direction:'down'});validateSessionIdentity(d.draft);assert.notEqual(d.draft.sessionStructure.order.indexOf(c.id),d.draft.sessionStructure.order.indexOf(b.id)+1);
 apply(d,log(d.draft,7));const cBefore=structuredClone(d.draft.sessionStructure.slots[7]);const firstSet=d.draft.sets[0];apply(d,{type:'delete',slotId:a.id,setId:firstSet.id});assert.deepEqual(d.draft.sessionStructure.slots[7],cBefore);assert.equal(d.draft.sessionStructure.slots[0].status,'replaced');apply(d,{type:'remove',slotId:c.id});assert.equal(d.draft.sessionStructure.slots[6].status,'replaced');assert.equal(d.draft.sessionStructure.slots[7].status,'removed');assert.equal(d.draft.sessionStructure.slots[7].replacesSlotId,b.id);assert.throws(()=>apply(d,replace(d,a)));validateSessionIdentity(d.draft);
 const final=structuredClone(d.draft);apply(d,{type:'complete'});assert.deepEqual(parseBackup(createBackup(d)).data.sessions.at(-1).sessionStructure,{...final.sessionStructure,revision:final.sessionStructure.revision+1});
});

test('source/self/active duplicates, changed/archived/deleted candidates/setup and invalid raw prescriptions reject whole Replace',async()=>{
 for(const kind of ['self','active','changed','archived','deleted','setup','sets','empty','reps','rest','rir','notes']){
 const d=initial();let candidate=structuredClone(d.customExercises[0]);d.exerciseNotes[`exercise:${candidate.id}`]='accepted setup';const command=replace(d,undefined,candidate);
 if(kind==='self')command.candidate.definition=libraryExercises(d.customExercises).find(e=>e.id===d.draft.sessionStructure.slots[0].exerciseId);
 if(kind==='active')command.candidate.definition=libraryExercises(d.customExercises).find(e=>e.id===d.draft.sessionStructure.slots[1].exerciseId);
 if(kind==='changed')d.customExercises[0].name='Edited after review';if(kind==='archived')d.customExercises[0].archived=true;if(kind==='deleted')d.customExercises=[];if(kind==='setup')d.exerciseNotes[`exercise:${candidate.id}`]='changed setup';
 if(kind==='sets')command.candidate.prescription.sets=0;if(kind==='empty')command.candidate.prescription.reps='';if(kind==='reps')command.candidate.prescription.reps='12–8';if(kind==='rest')command.candidate.prescription.rest='2000 giây';if(kind==='rir')command.candidate.prescription.rir='11';if(kind==='notes')command.candidate.prescription.notes='x'.repeat(2001);
 const h=harness(d),client=h.client(),raw=h.raw();await assert.rejects(client.store.command(command,client.get().draft));assert.equal(h.raw(),raw,kind);assert.equal(h.writes(),0);
 }
});

test('closed same exercise may be a new successor; source plan deletion and candidate notes do not rewrite frozen snapshot',()=>{
 const d=initial(),definition=libraryExercises(d.customExercises).find(e=>e.id===d.draft.sessionStructure.slots[1].exerciseId);apply(d,{type:'remove',slotId:d.draft.sessionStructure.slots[1].id});d.plans=[];d.activePlanId=null;const source=structuredClone(d),program=JSON.stringify(PROGRAM);apply(d,replace(d,undefined,definition));apply(d,log(d.draft,6));apply(d,{type:'complete'});
 for(const key of Object.keys(source).filter(k=>!['draft','sessions'].includes(k)))assert.deepEqual(d[key],source[key],key);assert.equal(JSON.stringify(PROGRAM),program);assert.equal(d.sessions.at(-1).sets[0].exerciseName,definition.name);
});

test('eight two-client races reject stale Replace/log/Complete, critical remaining2→1 requires new review',async()=>{
 for(const pair of [['log','replace'],['replace','log'],['reorder','replace'],['remove','replace'],['replace','complete'],['complete','replace'],['discard','replace'],['start','replace']]){
 const d=initial();apply(d,log(d.draft));const h=harness(d),a=h.client(),b=h.client(),source=d.draft.sessionStructure.slots[0];const intent=type=>type==='replace'?replace(d):type==='log'?log(d.draft,0,2):type==='remove'?{type,slotId:source.id}:type==='reorder'?{type,slotId:d.draft.sessionStructure.slots[1].id,direction:'up'}:{type};
 if(pair[0]==='start')await a.store.start({workout:'B',week:4,date:'2026-10-05'},a.get().draft);else await a.store.command(intent(pair[0]),a.get().draft);const won=h.raw();await assert.rejects(b.store.command(intent(pair[1]),b.get().draft),/đổi|cũ/);assert.equal(h.raw(),won);assert.equal(h.writes(),1);
 }
 const d=initial();apply(d,log(d.draft));const h=harness(d),a=h.client(),b=h.client(),old=replace(d);assert.equal(old.candidate.prescription.sets,2);await a.store.command(log(d.draft,0,2),a.get().draft);const raw=h.raw();await assert.rejects(b.store.command(old,b.get().draft));assert.equal(h.raw(),raw);b.refresh();const fresh=replace(b.get());assert.equal(fresh.candidate.prescription.sets,1);await b.store.command(fresh,b.get().draft);assert.equal(h.disk().draft.sessionStructure.slots.at(-1).snapshot.sets,1);
});

test('deleting the actual custom source plan does not block frozen live Replace or Complete',()=>{
 const d=representativeState();d.draft=createStartedSession({workout:'CUSTOM',workoutSnapshot:d.sessions[0].workoutSnapshot,week:4,date:'2026-10-05'});const frozen=structuredClone(d.draft.workoutSnapshot);
 d.plans=[];d.activePlanId=null;const before=structuredClone(d);apply(d,replace(d));apply(d,log(d.draft,d.draft.sessionStructure.slots.length-1));apply(d,{type:'complete'});
 assert.deepEqual(d.sessions.at(-1).workoutSnapshot,frozen);assert.equal(d.sessions.at(-1).sessionStructure.slots[0].status,'replaced');for(const key of Object.keys(before).filter(k=>!['draft','sessions'].includes(k)))assert.deepEqual(d[key],before[key]);
});

test('same-tab log/Replace and Replace/Complete are stale; immutable candidate and unrelated writes stay safe',async()=>{
 for(const pair of [['log','replace'],['replace','complete']]){const d=initial();apply(d,log(d.draft));const h=harness(d),c=h.client(),base=c.get().draft;
 const intents=pair.map(t=>t==='log'?log(base,0,2):t==='replace'?replace(d):{type:t});const results=await Promise.allSettled(intents.map(intent=>c.store.command(intent,base)));assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(h.writes(),1);assert.ok(h.disk().draft);}
 const d=initial(),h=harness(d),c=h.client(),intent=replace(d),accepted=structuredClone(intent.candidate);const op=c.store.command(intent,c.get().draft);intent.candidate.prescription.sets=20;intent.candidate.definition.name='mutated';await updateData(h.storage,h.locks,next=>next.foods[0].notes='concurrent nutrition');await op;assert.equal(h.disk().draft.sessionStructure.slots.at(-1).snapshot.name,accepted.definition.name);assert.equal(h.disk().draft.sessionStructure.slots.at(-1).snapshot.sets,3);assert.equal(h.disk().foods[0].notes,'concurrent nutrition');
});

test('quota/overflow/unsupported lock/history/raw/malformed/restore epoch failures leave old active without half successor',async()=>{
 for(const kind of ['quota','overflow','lock','history','unknown','raw','malformed','epoch']){const d=initial(),command=replace(d);if(kind==='overflow')d.draft.sessionStructure.revision=Number.MAX_SAFE_INTEGER;if(kind==='history'){d.sessions.push({...structuredClone(d.draft),historyEditBase:undefined});delete d.sessions.at(-1).historyEditBase;d.draft.historyEditBase=structuredClone(d.sessions.at(-1));}if(kind==='unknown')d.draft.historyEditBase={kind:'legacy-unknown'};if(kind==='raw')delete d.draft.sessionStructure;
 if(kind==='malformed'){d.draft.sessionStructure.slots[0].status='replaced';const before=structuredClone(d);assert.throws(()=>apply(d,command));assert.deepEqual(d,before);continue;}
 const h=harness(d),c=h.client(),raw=h.raw();if(kind==='quota')h.fail(true);
 if(kind==='lock')await assert.rejects(updateData(h.storage,null,next=>applySessionCommand(next,d.draft,command)));
 else{const op=c.store.command(command,c.get().draft);if(kind==='epoch')c.store.reset();await assert.rejects(op);}
 assert.equal(h.raw(),raw,kind);assert.equal(h.writes(),0);if(d.draft.sessionStructure)assert.equal(h.disk().draft.sessionStructure.slots[0].status,'active');
 }
});

test('chain validators fail closed for dangling/cycle/second successor and backup does not repair',()=>{
 const d=initial();apply(d,replace(d));for(const kind of ['dangling','cycle','duplicate']){const bad=structuredClone(d);const successor=bad.draft.sessionStructure.slots.at(-1);if(kind==='dangling')successor.replacesSlotId='missing';if(kind==='cycle')successor.replacesSlotId=successor.id;if(kind==='duplicate'){const extra={...structuredClone(successor),id:'second-successor'};bad.draft.sessionStructure.slots.push(extra);bad.draft.sessionStructure.order.push(extra.id);}assert.throws(()=>validateSessionIdentity(bad.draft));assert.throws(()=>parseBackup(JSON.stringify({schemaVersion:8,data:bad})));}
});

test('Quick Fill/performance consumers never mix predecessor with successor;0logs no performance; duplicate selection retained',()=>{
 const d=initial(),old=d.draft.sessionStructure.slots[0];apply(d,log(d.draft));apply(d,replace(d));const successor=d.draft.sessionStructure.slots.at(-1);const empty=structuredClone(d.draft);assert.equal(nextIncompleteSlot(empty),successor.id);apply(d,log(d.draft,6));apply(d,{type:'complete'});const done=d.sessions.at(-1),next=createStartedSession({workout:'A',week:4,date:'2026-10-06'});const current=structuredClone(next);current.sessionStructure.slots.push({...structuredClone(successor),id:'current-new',replacesSlotId:null});current.sessionStructure.order.push('current-new');const previous=previousOccurrences([done],current,current.sessionStructure.slots.at(-1));assert.equal(previous.occurrences.length,1);assert.equal(previous.occurrences[0].id,successor.id);assert.equal(exerciseHistory([done],old.snapshot.name).length,1);assert.equal(exerciseHistory([empty],successor.snapshot.name).length,0);assert.equal(previousValues(previous,'',1).weight,25);
 const duplicate=structuredClone(done);duplicate.sessionStructure.slots.push({...structuredClone(successor),id:'empty-duplicate',replacesSlotId:null});duplicate.sessionStructure.order.push('empty-duplicate');const choices=previousOccurrences([duplicate],current,current.sessionStructure.slots.at(-1));assert.equal(choices.occurrences.length,2);assert.equal(previousValues(choices,'',1),null);
});
