import test from 'node:test';
import assert from 'node:assert/strict';
import { filterExercises, pickerOptions, createPickerSelection, addPickedExercises, replacePickedExercise, compareExercises, rankedPickerResults } from '../js/exercise-picker.js';
import '../js/gym-builder-ui.js'; // Include the browser module graph in the syntax gate.
import { libraryExercises } from '../js/custom-workout.js';
import { PROGRAM } from '../js/program.js';
import { loadData, updateData, createBackup, parseBackup } from '../js/data.js';
import { createDraftStore } from '../js/planning-draft.js';
import { representativeState } from './fixtures/representative-state.js';

const row = { id:'custom-row', name:'Kéo lưng thử', primaryMuscles:['upper-back'], secondaryMuscles:['biceps'], movementPattern:'horizontal-pull', equipment:['cable'], notes:'Setup fixture', isCustom:true, archived:false };
const library = () => [...libraryExercises([]),row,{...row,id:'archived',archived:true},{...row,id:'no-equipment',name:'Chưa ghi dụng cụ',equipment:[]}];
const day = () => ({id:'test-day',name:'Test day',exercises:[]});
const newId = () => { let n=0; return ()=>`slot-${n++}`; };

test('shared search is accent-insensitive, pure and reports no results / clear',()=>{
 const all=library(), before=structuredClone(all);
 assert.deepEqual(filterExercises(all,{query:'KEO LUNG thu'}).map(e=>e.id),['custom-row']);
 assert.deepEqual(filterExercises(all,{query:'zz-no-match'}),[]);
 assert.equal(filterExercises(all,{}).length,all.length-1);
 assert.deepEqual(all,before);
});
test('primary muscle, equipment, movement and text combine with AND',()=>{
 const all=library();
 const result=filterExercises(all,{muscle:'back',equipment:'cable',pattern:'horizontal-pull',query:'keo'});
 assert.deepEqual(result.map(e=>e.id),['custom-row']);
 assert.ok(!filterExercises([row],{muscle:'biceps'}).length); // secondary does not match
 assert.ok(filterExercises(all,{muscle:'shoulders'}).some(e=>e.primaryMuscles.includes('side-delts')));
 assert.equal(filterExercises([row],{equipment:'dumbbell'}).length,0);
 assert.equal(filterExercises([row],{pattern:'vertical-pull'}).length,0);
 assert.equal(filterExercises(all,{source:'archived'}).length,1);
});
test('filter choices come from catalog and missing equipment remains visible unfiltered',()=>{
 const choices=pickerOptions([row,{...row,id:'empty',equipment:[]}]);
 assert.deepEqual(choices.equipment.map(e=>e.value),['cable']);
 assert.deepEqual(choices.pattern.map(e=>e.value),['horizontal-pull']);
 assert.equal(filterExercises([{...row,equipment:[]}],{}).length,1);
 assert.equal(filterExercises([{...row,equipment:[]}],{equipment:'cable'}).length,0);
});
test('pending selection survives filtering and supports toggle, clear and single replace',()=>{
 const s=createPickerSelection('add'); s.toggle('a');s.toggle('b');
 filterExercises(library(),{query:'none'});
 assert.deepEqual(s.ids(),['a','b']);s.toggle('a');assert.deepEqual(s.ids(),['b']);s.clear();assert.deepEqual(s.ids(),[]);
 const r=createPickerSelection('replace');r.toggle('a');r.toggle('b');assert.deepEqual(r.ids(),['b']);
});
test('Add respects chosen order, creates distinct slots and rejects duplicates/archived/deleted atomically',()=>{
 const all=library(), before=structuredClone(all), target=day(), ids=[row.id,all[0].id];
 const changed=addPickedExercises(target,ids,all,newId());
 assert.deepEqual(changed.exercises.map(e=>e.exerciseId),ids); assert.notEqual(changed.exercises[0].id,changed.exercises[1].id);
 assert.deepEqual(target,day());assert.deepEqual(all,before);
 for(const bad of [[],['archived'],['deleted'],[row.id,row.id]])assert.throws(()=>addPickedExercises(target,bad,all,newId()));
 assert.throws(()=>addPickedExercises(changed,[row.id],all,newId()));
});
test('Replace preserves prescription/order/slot identity, replaces notes and rejects current/duplicate/unavailable',()=>{
 const all=library(),target=addPickedExercises(day(),[all[0].id,all[1].id],all,newId());
 Object.assign(target.exercises[0],{sets:'3',repMin:'10',repMax:'15',targetRIR:'2–3',restSeconds:'120',notes:'Old setup'});
 const before=structuredClone(target), changed=replacePickedExercise(target,target.exercises[0].id,row.id,all);
 const expected={...before.exercises[0],exerciseId:row.id,name:row.name,notes:row.notes};
 assert.deepEqual(changed.exercises[0],expected);assert.deepEqual(changed.exercises[1],target.exercises[1]);assert.deepEqual(target,before);
 for(const bad of [all[0].id,all[1].id,'archived','deleted'])assert.throws(()=>replacePickedExercise(target,target.exercises[0].id,bad,all));
});
test('alternatives exclude current/archived, rank within filters and comparison uses only metadata',()=>{
 const results=rankedPickerResults(row,filterExercises(library(),{muscle:'back',equipment:'cable'}),'cable');
 assert.ok(!results.some(e=>['archived',row.id].includes(e.exercise.id)));
 assert.ok(results[0].suggestion);
 const other={...row,id:'different',equipment:['machine'],movementPattern:'vertical-pull'};
 const comparison=compareExercises(row,other);
 assert.deepEqual(comparison.sharedPrimary,['upper-back']);assert.equal(comparison.samePattern,false);
 assert.deepEqual(comparison.fromEquipment,['cable']);assert.deepEqual(comparison.toEquipment,['machine']);
 assert.deepEqual(compareExercises(null,other).sharedPrimary,[]);
});
test('picker Add/Replace persist through Phase2 reload without history/source/Original mutation',async()=>{
 let data=representativeState(),disk=JSON.stringify(data);
 const storage={getItem:()=>disk,setItem:(_,text)=>disk=text};
 const store=createDraftStore({getData:()=>data,write:async change=>data=await updateData(storage,{request:(_,f)=>f()},change)});
 const before=structuredClone(data),original=structuredClone(PROGRAM),all=libraryExercises(data.customExercises);
 let candidate=addPickedExercises(day(),[all[0].id,all[1].id],all,newId());
 await store.save('builder',{day:candidate,source:null});
 assert.deepEqual(loadData(storage).planningDraft.builder.payload.day,candidate);
 candidate=replacePickedExercise(candidate,candidate.exercises[0].id,'custom-fixture',all);
 await store.save('builder',{day:candidate,source:null});
 const recovered=loadData(storage);assert.deepEqual(recovered.planningDraft.builder.payload.day,candidate);
 assert.deepEqual(recovered.sessions,before.sessions);assert.deepEqual(recovered.plans,before.plans);assert.deepEqual(PROGRAM,original);
 assert.equal(recovered.schemaVersion,7);assert.deepEqual(parseBackup(createBackup(recovered)).data,recovered);
});
