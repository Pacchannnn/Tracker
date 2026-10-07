import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, createBackup } from '../js/data.js';
import { MOODS } from '../js/journal.js';

// A missing interface is an explicit RED assertion, rather than an import crash.
const domain = await import('../js/life-review.js').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const period = (...args) => { assert.equal(typeof domain.lifeReviewPeriod, 'function', 'missing Phase7 lifeReviewPeriod'); return domain.lifeReviewPeriod(...args); };
const derive = (data = emptyData(), photos = [], today = '2026-10-12', anchor = '2026-10-05') => {
  assert.equal(typeof domain.deriveLifeWeek, 'function', 'missing Phase7 deriveLifeWeek');
  return domain.deriveLifeWeek(data?.status ? data : {status:'available',data}, photos?.status ? photos : {status:'available',records:photos}, anchor, today);
};
const journal = (id,date,mood='',tags=[]) => ({id,date,mood,tags,title:'Gym is only prose',note:'running sleep food',createdAt:'2026-10-20T00:00:00Z',updatedAt:''});
const food = (id,date,calories=100,protein=10,servings=1) => ({id,date,meal:'Saved meal',foodId:'recipe:deleted',servings,food:{name:'Frozen meal',serving:'1 bowl',calories,protein,carbs:20,fat:0}});
const set = (id,index=0,name='Saved exercise',number=1) => ({id,exerciseIndex:index,exerciseName:name,setNumber:number,weight:0,reps:5,rir:2});
const session = (id,sets=[],date='2026-10-05') => ({id,date,workout:'A',week:1,sets});
const photo = (id,date='2026-10-05') => ({id,date,category:'food',ownerType:'food',ownerId:'deleted',createdAt:'2099-01-01T00:00:00Z'});
const freeze = value => { if(value && typeof value === 'object') { Object.freeze(value);Object.values(value).forEach(freeze); } return value; };
test('I1 empty certainty remains unknown if entire-domain mood validation fails outside selected week',()=>{
  const d=emptyData();d.journalEntries=[journal('outside','2026-09-01','invalid')];
  const r=derive(d);assert.equal(r.moods.status,'unavailable');assert.equal(r.empty,null);
});

test('P1 Monday and Sunday normalize with exact previous/next/current Monday anchors',()=>{
  for(const anchor of ['2026-10-05','2026-10-11']) {
    const p=period('week',anchor,'2026-10-06');
    assert.deepEqual([p.anchor,p.start,p.end,p.previousAnchor,p.nextAnchor,p.currentAnchor],['2026-10-05','2026-10-05','2026-10-11','2026-09-28','2026-10-12','2026-10-05']);
  }
  assert.equal(period('week','2026-10-04','2026-10-06').end,'2026-10-04');
});
test('P2 calendar months navigate starts through Jan31, leap February and year crossing',()=>{
  const p=period('month','2026-01-31','2026-10-06');assert.deepEqual([p.start,p.end,p.nextAnchor],['2026-01-01','2026-01-31','2026-02-01']);
  assert.equal(period('month','2028-02-15','2028-03-01').calendarDays,29);
  assert.equal(period('month','2026-02-15','2026-03-01').calendarDays,28);
  assert.equal(period('month','2026-12-31','2026-10-06').nextAnchor,'2027-01-01');
});
test('P3 eligible days are inclusive and future weeks have null ratio',()=>{
  const p=period('week','2026-10-05','2026-10-06');assert.equal(p.calendarDays,7);assert.deepEqual(p.eligibleDates,['2026-10-05','2026-10-06']);assert.equal(p.eligibleEnd,'2026-10-06');
  assert.equal(period('week','2026-10-05','2026-10-11').eligibleDays,7);
  const r=derive(emptyData(),[],'2026-10-06','2026-10-12');assert.equal(r.period.eligibleDays,0);assert.equal(r.coverage.journal.ratio,null);assert.equal(r.coverage.journal.recordedDays,0);
});
test('P4 future records remain visible without entering eligible coverage or averages',()=>{
  const d=emptyData();d.entries=[food('mon','2026-10-05'),food('sun','2026-10-11',900)];d.journalEntries=[journal('future','2026-10-11','bright')];
  const r=derive(d,[],'2026-10-06');assert.equal(r.coverage.nutrition.recordedDays,1);assert.equal(r.nutrition.value.macros.calories.fullTotal.value,100);assert.equal(r.moods.value.knownDays,0);
  assert.deepEqual(r.futureRecords.nutrition.value.sources,[{kind:'nutrition',id:'sun',date:'2026-10-11'}]);assert.equal(r.empty,false);assert.equal(r.sourceDays.at(-1).date,'2026-10-11');
});
test('P5 stored dates ignore timestamps, cross years and retain years 0000–0099',()=>{
  assert.deepEqual(period('week','2026-01-01','2026-10-06').calendarDates,['2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-03','2026-01-04']);
  assert.equal(period('month','0000-02-15','0099-10-06').end,'0000-02-29');assert.equal(period('month','0099-12-31','0099-12-31').nextAnchor,'0100-01-01');
  const d=emptyData();d.journalEntries=[journal('j','2026-10-05')];assert.equal(derive(d).coverage.journal.recordedDays,1);
  assert.equal(period('month','0000-01-01','2026-10-06').previousAnchor,null);assert.equal(period('month','9999-12-31','2026-10-06').nextAnchor,null);
});
test('P6 invalid period inputs reject; unsupported full week never clamps',()=>{
  for(const bad of ['',null,'2026-02-29','2026-01-01T00:00:00Z',42]) {assert.throws(()=>period('week',bad,'2026-10-06'));assert.throws(()=>period('week','2026-10-05',bad));}
  assert.throws(()=>period('year','2026-10-05','2026-10-06'));assert.throws(()=>period('week','0000-01-01','2026-10-06'));assert.throws(()=>period('week','9999-12-31','2026-10-06'));
  assert.equal(period('week','2026-10-05','9999-12-31').currentAnchor,null);
});
test('C1 mixed week has independent 4/7 journal, 3/7 mood, 2/7 nutrition with exact refs',()=>{
  const d=emptyData();d.journalEntries=['05','06','07','08'].map((day,i)=>journal(`j${i}`,`2026-10-${day}`,i<3?'good':''));d.entries=[food('e1','2026-10-05'),food('e2','2026-10-07')];
  const r=derive(d);assert.equal(r.coverage.journal.ratio,4/7);assert.equal(r.coverage.mood.ratio,3/7);assert.equal(r.coverage.nutrition.ratio,2/7);
  assert.deepEqual(r.coverage.nutrition.dates,[{date:'2026-10-05',refs:[{kind:'nutrition',id:'e1',date:'2026-10-05'}]},{date:'2026-10-07',refs:[{kind:'nutrition',id:'e2',date:'2026-10-07'}]}]);
});
test('C2 same-date independent records count separately while coverage counts dates',()=>{
  const d=emptyData();d.entries=['a','b','c'].map(id=>food(id,'2026-10-05'));d.sessions=[session('s1'),session('s2')];const r=derive(d,Array.from({length:10},(_,i)=>photo(`p${i}`)));
  assert.equal(r.nutrition.value.entryCount.value,3);assert.equal(r.coverage.nutrition.recordedDays,1);assert.equal(r.workouts.value.sessionCount.value,2);assert.equal(r.coverage.workout.recordedDays,1);assert.equal(r.photos.value.photoCount.value,10);assert.equal(r.coverage.photos.recordedDays,1);assert.equal(r.coverage.photos.dates[0].refs.length,10);
});
test('C3 notes-only/zero checkins and knee use own dates; stored acceptance has no form maxima',()=>{
  const d=emptyData();d.checkins=[{id:'c',date:'2026-10-06',weight:0,waist:null,sleep:null,knee:'',notes:''},{id:'n',date:'2026-10-07',weight:null,waist:null,sleep:null,knee:'',notes:'note'}];
  d.kneeEntries=[{id:'k',date:'2026-10-08',moment:'next-morning',pain:0,swelling:'unknown',instability:'unknown',stiffness:'unknown',notes:''}];d.cardioEntries=[{id:'a',date:'2026-10-09',activity:'',durationMinutes:2000,distanceKm:0,intensity:'',notes:''}];
  const r=derive(d);assert.equal(r.checkins.value.recordCount.value,2);assert.equal(r.coverage.knee.dates[0].date,'2026-10-08');assert.equal(r.cardio.value.minutes.value,2000);assert.equal(r.coverage.journal.recordedDays,0);
});
test('M1 missing nutrition is null while known numeric zero remains zero',()=>{
  const empty=derive();assert.equal(empty.nutrition.value.macros.calories.fullTotal.state,'missing');assert.equal(empty.nutrition.value.macros.calories.fullTotal.value,null);assert.equal(empty.cardio.value.minutes.state,'missing');assert.equal(empty.workouts.value.performedOccurrenceCount.value,0);
  const d=emptyData();d.entries=[food('z','2026-10-05',0,0)];const r=derive(d);assert.equal(r.nutrition.value.macros.calories.knownDays,1);assert.equal(r.nutrition.value.macros.calories.knownDayAverage.value,0);
});
test('M2 shared month period gives full 31-day eligible denominator with authorized monthly runtime',()=>{const p=period('month','2026-07-20','2026-10-06');assert.equal(p.eligibleDays,31);assert.equal(p.relation,'past');assert.equal(typeof domain.deriveMonthMemories,'function');});
test('M3 mood labels/order/known-day denominator and blank/missing dates stay exact',()=>{
  const d=emptyData();d.journalEntries=[journal('a','2026-10-05','drained'),journal('b','2026-10-06',''),journal('c','2026-10-07','good')];const r=derive(d);
  assert.deepEqual(r.moods.value.buckets.map(b=>[b.id,b.label,b.mark]),MOODS.map(m=>[m.value,m.label,m.mark]));assert.deepEqual(r.moods.value.buckets.map(b=>b.count),[1,0,0,1,0]);assert.ok(r.moods.value.buckets.every(b=>b.denominator===2));assert.equal(r.moods.value.missingMoodJournalDays,1);assert.equal(r.moods.value.unrecordedEligibleDays,4);assert.equal(r.moods.value.unrecordedMoodDates.length,5);
  assert.equal('valence' in r.moods.value,false);
});
test('M3 invalid mood isolates mood; duplicate journal date fails all journal submetrics',()=>{
  const d=emptyData();d.journalEntries=[journal('a','2026-10-05','bad',['Gym'])];let r=derive(d);assert.equal(r.journal.status,'available');assert.equal(r.tags.status,'available');assert.equal(r.moods.status,'unavailable');assert.equal(r.coverage.mood.recordedDays,null);
  d.journalEntries.push(journal('b','2026-10-05'));r=derive(d);for(const key of ['journal','moods','tags'])assert.equal(r[key].status,'unavailable');
});
test('T1 saved tag-date keys trim/case dedupe, preserve accents/spaces and first spelling',()=>{
  const d=emptyData();d.journalEntries=[journal('later','2026-10-07','',['gym','ĐI BỘ','a  b']),journal('early','2026-10-05','',[' Gym ','GYM','Đi bộ','di bo','a b',''])];const r=derive(d);
  assert.equal(r.tags.value.tagDays,2);assert.deepEqual(r.tags.value.buckets.map(b=>[b.key,b.label,b.dayCount]),[['gym','Gym',2],['đi bộ','Đi bộ',2],['di bo','di bo',1],['a b','a b',1],['a  b','a  b',1]]);assert.equal(r.tags.value.buckets[0].refs.length,2);assert.ok(r.tags.value.buckets.every(b=>b.denominator===2));
});
test('W1 saved history alone counts independent copies and accepted zero-set sessions',()=>{
  const d=emptyData();d.sessions=[session('s',[set('a')]),session('copy',[set('a')]),session('empty')];d.draft=session('draft',[set('d')]);d.historyEditCandidate=session('candidate',[set('x')]);const w=derive(d).workouts.value;
  assert.equal(w.sessionCount.value,3);assert.equal(w.savedSetCount.value,2);assert.equal(w.performedOccurrenceCount.value,2);assert.equal(w.sessions[2].occurrences.length,0);
});
function structured(){
  const snap=name=>({name,sets:2,reps:'5',rest:'60',rir:'2',notes:'',setupNote:''});
  const slots=[{id:'old',exerciseId:null,sourceSlotId:null,replacesSlotId:null,status:'replaced',snapshot:snap('Old')},{id:'new',exerciseId:null,sourceSlotId:null,replacesSlotId:'old',status:'active',snapshot:snap('New')},{id:'removed',exerciseId:null,sourceSlotId:null,replacesSlotId:null,status:'removed',snapshot:snap('Removed')}];
  return {...session('structured',[{...set('oldset',0,'Old'),slotId:'old'},{...set('newset',1,'New'),slotId:'new'}]),sessionStructure:{revision:1,basis:'started',slots,order:['removed','new','old']}};
}
test('W2 structured replacement owners use slot IDs, zero-log/reordered rows add no work',()=>{
  const d=emptyData();d.sessions=[structured()];const w=derive(d).workouts.value;assert.equal(w.performedOccurrenceCount.value,2);assert.deepEqual(w.sessions[0].occurrences.map(o=>o.slotId),['old','new']);assert.deepEqual(w.sessions[0].setRefs,[{kind:'set',id:'oldset',date:'2026-10-05',sessionId:'structured',slotId:'old',legacyIndex:null},{kind:'set',id:'newset',date:'2026-10-05',sessionId:'structured',slotId:'new',legacyIndex:null}]);
});
test('W3 legacy ambiguous names/IDs/owner numbers preserve proven owners and unresolved sets',()=>{
  for(const ambiguous of [[set('a',0,'First'),set('b',0,'Other',2)],[{...set('a'),exerciseId:'one'},{...set('b',0,'Saved exercise',2),exerciseId:'two'}],[set('a'),set('b')]]) {
    const d=emptyData();d.sessions=[session('s',[...ambiguous,set('proven',99,'Not in PROGRAM')])];const w=derive(d).workouts.value;
    assert.equal(w.savedSetCount.value,3);assert.equal(w.performedOccurrenceCount.state,'unknown');assert.equal(w.performedOccurrenceCount.value,null);assert.equal(w.provenOccurrenceCount.value,1);assert.equal(w.unresolvedSetCount.value,2);assert.equal(w.sessions[0].unresolvedSetRefs[0].legacyIndex,0);assert.equal(w.sessions[0].occurrences[0].name,'Not in PROGRAM');
  }
});
test('W4 all proven muscle evidence remains unknown after current library changes',()=>{
  const d=emptyData();d.sessions=[session('s',[set('a',0,'Bench Press')])];let w=derive(d).workouts.value;assert.deepEqual([w.muscleEvidence.state,w.muscleEvidence.denominator,w.muscleEvidence.knownCount,w.muscleEvidence.unknownProvenCount],['unknown',1,0,1]);assert.equal(w.muscleEvidence.buckets[0].label,'Không xác định');
  d.customExercises=[{name:'Bench Press',muscles:['chest']}];assert.deepEqual(derive(d).workouts.value,w);
  d.sessions[0].sets.push(set('ambiguous'));w=derive(d).workouts.value;assert.equal(w.muscleEvidence.denominator,null);assert.equal('percentage' in w.muscleEvidence,false);
});
test('N1 nutrition uses multiplied logged snapshot after library edits/deletion',()=>{
  const d=emptyData();d.entries=[food('e','2026-10-05',100,8,1.5)];d.foods=[{id:'recipe:deleted',calories:9000}];d.recipes=[{id:'deleted',servings:100,nutritionPerServing:{calories:8000}}];assert.equal(derive(d).nutrition.value.macros.calories.fullTotal.value,150);d.foods=[];d.recipes=[];assert.equal(derive(d).nutrition.value.macros.protein.fullTotal.value,12);
});
test('N2 per-macro 100/null/0 totals preserve independent known-day averages',()=>{
  const d=emptyData();d.entries=[food('a','2026-10-05',100,10),food('b','2026-10-06',null,20),food('c','2026-10-07',0,null)];const n=derive(d).nutrition.value;
  assert.deepEqual([n.macros.calories.fullTotal.state,n.macros.calories.knownSubtotal.value,n.macros.calories.knownDays,n.macros.calories.unknownDays,n.macros.calories.knownDayAverage.value],['unknown',100,2,1,50]);assert.equal(n.macros.protein.knownDayAverage.value,15);assert.deepEqual(n.macros.protein.knownDates,['2026-10-05','2026-10-06']);assert.equal(n.macros.calories.unrecordedEligibleDays,4);assert.equal(n.macros.calories.fullTotal.refs.length,3);
});
test('N3 undefined macro is unknown; invalid type/negative/nonfinite fails whole domain even outside week',()=>{
  const d=emptyData();d.entries=[food('u','2026-10-05',undefined)];delete d.entries[0].food.calories;assert.equal(derive(d).nutrition.value.macros.calories.fullTotal.state,'unknown');
  for(const invalid of ['1',-1,NaN,Infinity]) {d.entries=[food('bad','2000-01-01',invalid)];const r=derive(d);assert.equal(r.nutrition.status,'unavailable');assert.equal(r.coverage.nutrition.recordedDays,null);assert.equal(r.journal.status,'available');}
});
test('N3 daily product and period sum overflow isolate the affected numeric macro',()=>{
  for(const entries of [[food('a','2026-10-05',Number.MAX_VALUE,10,2)],[food('a','2026-10-05',Number.MAX_VALUE),food('b','2026-10-06',Number.MAX_VALUE)]]) {
    const d=emptyData();d.entries=entries;const r=derive(d),m=r.nutrition.value.macros.calories;
    assert.equal(r.coverage.nutrition.status,'available');for(const key of ['fullTotal','knownSubtotal','knownDayAverage']) {assert.equal(m[key].state,'unavailable');assert.equal(m[key].reason.code,'arithmetic-error');assert.equal(m[key].value,null);}
    assert.equal(r.nutrition.value.macros.protein.fullTotal.state,'known');
  }
});
test('I1 root failure retains readable photo facts and tri-state empty semantics',()=>{
  assert.equal(derive({status:'unavailable',reason:new Error('private detail')},[]).empty,null);
  const r=derive({status:'unavailable'},[photo('p')]);assert.equal(r.empty,false);assert.equal(r.photos.value.photoCount.value,1);assert.equal(r.journal.reason.code,'canonical-load-error');assert.equal(JSON.stringify(r).includes('private detail'),false);
  assert.equal(derive().empty,true);assert.equal(derive(emptyData(),{status:'unavailable'}).empty,null);
});
test('I1 whole malformed domains isolate siblings and no duplicate winner is selected',()=>{
  const mutations=[['entries',d=>d.entries=[food('a','2026-10-05'),food('a','2026-10-06')],'nutrition'],['sessions',d=>d.sessions=[{...session('s'),date:'bad'}],'workouts'],['cardioEntries',d=>d.cardioEntries=[{id:'c',date:'bad'}],'cardio'],['checkins',d=>d.checkins=[{id:'c',date:'2000-01-01',weight:'0',waist:null,sleep:null,knee:'',notes:''}],'checkins'],['kneeEntries',d=>d.kneeEntries=[{id:'k',date:'bad'}],'knees']];
  for(const [,mutate,key] of mutations) {const d=emptyData();mutate(d);const r=derive(d);assert.equal(r[key].status,'unavailable');assert.equal(r.journal.status,'available');assert.equal(r.empty,null);}
  const d=emptyData();d.sessions=[structured()];d.sessions[0].sets[0].slotId='dangling';assert.equal(derive(d).workouts.status,'unavailable');
});
test('I2 frozen inputs stay byte-equivalent, outputs detached, and no storage/clock/IDB is consulted',()=>{
  const d=emptyData();d.journalEntries=[journal('j','2026-10-05','good',['Gym'])];d.entries=[food('e','2026-10-05')];d.sessions=[structured()];const p=[photo('p')];const before=createBackup(d,new Date('2026-10-06T00:00:00Z'));freeze(d);freeze(p);
  const old=globalThis.localStorage, oldIdb=globalThis.indexedDB;globalThis.localStorage={getItem(){throw Error('read');},setItem(){throw Error('write');}};globalThis.indexedDB={open(){throw Error('IDB');}};
  try {const r=derive(d,p);r.workouts.value.sessions[0].occurrences[0].name='mutated';r.coverage.journal.dates[0].refs[0].id='changed';r.period.calendarDates.push('fake');assert.equal(createBackup(d,new Date('2026-10-06T00:00:00Z')),before);assert.equal(p[0].id,'p');}finally{globalThis.localStorage=old;globalThis.indexedDB=oldIdb;}
});
test('D1 count/value/bucket/source-day refs retain exact IDs, dates, session and set owners',()=>{
  const d=emptyData();d.sessions=[structured()];d.journalEntries=[journal('j','2026-10-06','good',['Gym'])];d.entries=[food('e','2026-10-05')];const r=derive(d,[photo('p')]);
  assert.deepEqual(r.moods.value.buckets[3].refs,[{kind:'journal',id:'j',date:'2026-10-06'}]);assert.deepEqual(r.tags.value.buckets[0].refs,[{kind:'journal',id:'j',date:'2026-10-06'}]);assert.deepEqual(r.workouts.value.performedOccurrenceCount.refs,r.workouts.value.sessions[0].setRefs);assert.deepEqual(r.nutrition.value.macros.calories.knownDayAverage.refs,[{kind:'nutrition',id:'e',date:'2026-10-05'}]);assert.deepEqual(r.sourceDays.map(x=>x.date),['2026-10-05','2026-10-06']);
});
test('photo metadata dedupes identical IDs by metadata while conflicting/out-of-range invalid metadata fails',()=>{
  const a=photo('p');assert.equal(derive(emptyData(),[a,{...a}]).photos.value.photoCount.value,1);
  assert.equal(derive(emptyData(),[a,{...a,date:'2026-10-06'}]).photos.status,'unavailable');assert.equal(derive(emptyData(),[{...a,date:'bad'}]).photos.status,'unavailable');assert.equal(derive(emptyData(),[{...a,category:'gym'}]).photos.status,'unavailable');
});
test('N2 all-unknown macro subtotal and average keep exact contributing refs',()=>{
  const d=emptyData();d.entries=[food('a','2026-10-05',null)];const m=derive(d).nutrition.value.macros.calories;
  for(const key of ['fullTotal','knownSubtotal','knownDayAverage']) {assert.equal(m[key].state,'unknown');assert.equal(m[key].value,null);assert.deepEqual(m[key].refs,[{kind:'nutrition',id:'a',date:'2026-10-05'}]);}
});
test('I1 malformed consumed workout title is unavailable without returning source objects',()=>{
  const d=emptyData();d.sessions=[{...session('s'),workoutSnapshot:{name:{secret:'malformed'}}}];const r=derive(d);assert.equal(r.workouts.status,'unavailable');assert.equal(r.journal.status,'available');
});
