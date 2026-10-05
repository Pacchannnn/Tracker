import test from 'node:test';
import assert from 'node:assert/strict';
import { daySummary, shiftCalendarDate, readDay } from '../js/my-day.js';
import { emptyData, dailyTotals, localDate, createBackup, parseBackup } from '../js/data.js';
import { representativeState } from './fixtures/representative-state.js';
import { createStartedSession, applySessionCommand } from '../js/session-runtime.js';
import { reviewReplacement } from '../js/session-structure.js';
import { libraryExercises } from '../js/custom-workout.js';
import { MOODS } from '../js/journal.js';
const date = '2026-10-04';
const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
test('empty and future day are absent, not a zero nutrition or rest day', () => {
  for (const day of [date, '2099-01-01']) { const s = daySummary(emptyData(), [], day); assert.equal(s.date, day); assert.equal(s.empty, true); assert.equal(s.nutrition.totals, null); assert.equal(s.presence.nutrition, false); }
});
test('journal-only preserves drained meaning, original tags and date source reference', () => {
  const d = emptyData(); d.journalEntries = [{id:'j',date,mood:'drained',title:'Một ngày',note:'<script>text</script>',tags:['Gym']}];
  const s = daySummary(d, [], date); assert.equal(s.empty, false); assert.deepEqual(s.journals, d.journalEntries); assert.equal(MOODS.find(m=>m.value==='drained').label,'Mệt'); assert.deepEqual(s.sources.journal,{view:'journal',date});
});
test('journal backup contract rejects two entries on the same calendar date', () => {
  const d = representativeState(); d.journalEntries.push({...d.journalEntries[0],id:'other'});
  assert.throws(()=>parseBackup(createBackup(d)),/nhật ký|Nhật ký|trùng/);
  assert.equal(daySummary(d,[],date).journals.length,2); // Never silently pick one from a read input.
});
test('photo-only day joins once by own date, not owner or timestamp', () => {
  const p = {id:'p',date,category:'food',ownerType:'food',ownerId:'missing',createdAt:'2026-10-05T00:05:00+07:00'};
  const s=daySummary(emptyData(),[p,p,{...p,id:'other-day',date:'2026-10-05'}],date);
  assert.equal(s.empty,false); assert.deepEqual(s.photos,[p]); assert.equal(s.presence.journal,false); assert.equal(s.presence.photos,true);
});
test('nutrition-only uses canonical snapshot totals and counts distinct meal labels/items', () => {
  const d=emptyData(); const f={name:'Fixture',serving:'1',calories:100,protein:8,carbs:12,fat:3};
  d.entries=[{id:'1',date,meal:'Lunch',servings:1.5,food:f},{id:'2',date,meal:'Dinner',servings:2,food:f},{id:'3',date:'2026-10-05',meal:'Lunch',servings:50,food:f}];
  const s=daySummary(d,[],date); assert.deepEqual(s.nutrition.totals,dailyTotals(d.entries,date)); assert.equal(s.nutrition.totals.calories,350); assert.equal(s.nutrition.itemCount,2); assert.equal(s.nutrition.mealCount,2);
});
test('canonical totals propagate each null/missing macro instead of zero; actual zero stays zero', () => {
  const food={calories:0,protein:8,carbs:null,fat:undefined}; const entries=[{date,food,servings:2},{date,food:{calories:100,protein:1,carbs:10,fat:3},servings:1}];
  assert.deepEqual(dailyTotals(entries,date),{calories:100,protein:17,carbs:null,fat:null});
  const d=emptyData(); d.entries=entries; assert.deepEqual(daySummary(d,[],date).nutrition.totals,dailyTotals(entries,date));
  assert.equal(dailyTotals(entries.slice(0,1),date).calories,0);
});
test('workout-only excludes active draft, preserves all completed sessions/saved set counts', () => {
  const d=representativeState(); d.journalEntries=[]; d.entries=[];d.cardioEntries=[];d.checkins=[];d.kneeEntries=[];d.sessions.push({...structuredClone(d.sessions[0]),id:'second'});
  const s=daySummary(d,[],date); assert.equal(s.workouts.length,2); assert.equal(s.workouts[0].setCount,1); assert.equal(s.workouts[0].exerciseCount,1); assert.equal(s.workouts[0].name,'Fixture day'); assert.equal(s.workouts.some(w=>w.id===d.draft.id),false);
});
test('combined multiple records preserve cardio/checkins/knee and explicit presence', () => {
  const d=representativeState(); d.checkins.push({...d.checkins[0],id:'check2',weight:null}); d.cardioEntries.push({...d.cardioEntries[0],id:'cardio2'});
  const s=daySummary(d,[{id:'p1',date},{id:'p2',date}],date); assert.equal(s.empty,false); assert.equal(s.checkins.length,2); assert.equal(s.cardio.length,2); assert.deepEqual(s.knees,d.kneeEntries); assert.ok(Object.values(s.presence).every(Boolean));
});
test('source edits and deletions derive afresh without altering unrelated domains', () => {
  const d=representativeState(),before=structuredClone(d); const a=daySummary(d,[],date);
  d.journalEntries[0].title='Changed'; d.entries[0].servings=2; const b=daySummary(d,[],date); assert.equal(b.journals[0].title,'Changed'); assert.equal(b.nutrition.totals.calories,200);
  d.journalEntries=[];d.entries=[]; const c=daySummary(d,[],date);assert.equal(c.presence.journal,false);assert.equal(c.presence.nutrition,false);assert.deepEqual(d.sessions,before.sessions);assert.equal(a.nutrition.totals.calories,150);
});
test('pure read never mutates frozen JSON/photos or invokes storage writes', () => {
  const d=freeze(representativeState()),photos=freeze([{id:'p',date}]); const before=JSON.stringify(d);
  const old=globalThis.localStorage; globalThis.localStorage={setItem(){throw Error('write');},removeItem(){throw Error('write');}};
  try {daySummary(d,photos,date);shiftCalendarDate(date,1);assert.equal(JSON.stringify(d),before);} finally {globalThis.localStorage=old;}
});
test('calendar stepping handles year/month/leap boundaries without skipping empty days', () => {
  for(const [day,delta,result] of [['2026-01-01',-1,'2025-12-31'],['2026-12-31',1,'2027-01-01'],['2026-01-31',1,'2026-02-01'],['2028-02-28',1,'2028-02-29'],['2028-02-29',1,'2028-03-01'],['2028-03-01',-1,'2028-02-29']]) assert.equal(shiftCalendarDate(day,delta),result);
});
test('empty/invalid dates fail without coercion or writes', () => {
  for(const date of ['',null,'2026-02-29','2028-02-30','2026-13-01','2026-01-01T00:00:00Z']) {assert.throws(()=>daySummary(emptyData(),[],date),/Ngày/);assert.throws(()=>shiftCalendarDate(date,1),/Ngày/);}
});
test('local midnight uses localDate; ISO near midnight never overrides saved calendar date', () => {
  assert.equal(localDate(new Date(2026,0,1,0,0,1)),'2026-01-01');
  const d=representativeState();d.journalEntries[0].date='2026-01-01';d.journalEntries[0].updatedAt='2025-12-31T17:05:00Z';d.sessions[0].date='2026-01-01';d.sessions[0].updatedAt='2026-01-02T00:05:00+07:00';
  const s=daySummary(d,[], '2026-01-01');assert.equal(s.journals.length,1);assert.equal(s.workouts.length,1);assert.equal(daySummary(d,[],'2025-12-31').journals.length,0);
});
test('Phase4 replacement chain reads exact completed sets once, never moves owners or mutates snapshots', () => {
  const d=emptyData();d.draft=createStartedSession({workout:'A',week:4,date});
  const apply=c=>applySessionCommand(d,structuredClone(d.draft),c), old=d.draft.sessionStructure.slots[0];
  apply({type:'log',slotId:old.id,setNumber:1,values:{weight:25,unit:'kg',reps:10,rir:2}});
  const candidate=libraryExercises([]).find(e=>!d.draft.sessionStructure.slots.some(s=>s.exerciseId===e.id));
  apply({type:'replace',slotId:old.id,candidate:reviewReplacement(candidate,d,d.draft.sessionStructure.slots[0])});
  const next=d.draft.sessionStructure.slots.at(-1);apply({type:'log',slotId:next.id,setNumber:1,values:{weight:15,unit:'kg',reps:10,rir:2}});apply({type:'complete'});
  const before=structuredClone(d),s=daySummary(freeze(d),[],date);assert.equal(s.workouts[0].setCount,2);assert.equal(s.workouts[0].exerciseCount,2);assert.deepEqual(d,before);assert.equal(d.sessions[0].sets[0].slotId,old.id);assert.equal(d.sessions[0].sets[1].slotId,next.id);
});
test('metadata failure is isolated from all JSON domains; core errors are not caught/bypassed', async () => {
  const d=representativeState(); const s=await readDay(d,date,async()=>{throw Error('photo unavailable');});assert.equal(s.photoError,true);assert.equal(s.workouts.length,1);assert.equal(s.journals.length,1);assert.equal(s.nutrition.totals.calories,150);
  await assert.rejects(()=>readDay(null,date,async()=>[]));
});
test('failed photo metadata on JSON-empty day keeps whole-day absence unknown', async () => {
  const s=await readDay(emptyData(),date,async()=>{throw Error('unavailable');});
  assert.equal(s.photoError,true); assert.equal(s.empty,null);
});
