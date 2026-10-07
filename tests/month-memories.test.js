import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../js/data.js';

const domain = await import('../js/life-review.js');
const derive = (data=emptyData(), photos=[], today='2026-10-07', anchor='2026-10-21') => {
  assert.equal(typeof domain.deriveMonthMemories,'function','missing Phase7 deriveMonthMemories');
  return domain.deriveMonthMemories(data?.status ? data : {status:'available',data},photos?.status ? photos : {status:'available',records:photos},anchor,today);
};
const journal = (id,date,mood='',tags=[]) => ({id,date,mood,tags,title:'Saved title',note:'Saved note',createdAt:'2099-01-01',updatedAt:'0000-01-01'});
const food = (id,date) => ({id,date,meal:'Saved meal',foodId:'recipe:deleted',servings:2,food:{name:'Saved food',serving:'1 bowl',calories:null,protein:0,carbs:20,fat:3}});
const set = id => ({id,exerciseIndex:0,exerciseName:'Saved exercise',setNumber:1,weight:0,reps:5,rir:2});
const session = (id,date) => ({id,date,workout:'A',week:1,sets:[]});
const cardio = (id,date) => ({id,date,activity:'Đi bộ',durationMinutes:20,distanceKm:null,intensity:'',notes:'source only'});
const checkin = (id,date) => ({id,date,weight:0,waist:null,sleep:null,knee:'',notes:'notes only'});
const knee = (id,date) => ({id,date,moment:'next-morning',pain:0,swelling:'unknown',instability:'no',stiffness:'yes',notes:'saved detail'});
const photo = (id,date) => ({id,date,category:'food',ownerType:'recipe',ownerId:'deleted',createdAt:'2099-01-01'});
const keys = value => Object.keys(value).sort();
const freeze = value => {if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
const source = (kind,id,date) => ({kind,id,date});

test('R1 exact MonthReview has Common plus counts and timeline without weekly analytics',()=>{
  const r=derive();
  assert.deepEqual(keys(r),['counts','coverage','empty','futureRecords','period','sourceDays','timeline','unavailableDomains']);
  assert.deepEqual(keys(r.counts),['cardio','checkin','journal','knee','nutrition','photos','workout']);
  assert.deepEqual(keys(r.coverage),['cardio','checkin','journal','knee','mood','nutrition','photos','workout']);
  assert.deepEqual(keys(r.futureRecords),['cardio','checkin','journal','knee','nutrition','photos','workout']);
  assert.equal(r.period.mode,'month');assert.equal(r.period.anchor,'2026-10-01');
  assert.equal(r.empty,true);assert.deepEqual(r.timeline,[]);assert.deepEqual(r.sourceDays,[]);
  for(const count of Object.values(r.counts))assert.deepEqual(count,{state:'known',value:0,refs:[],reason:null});
});
test('R1 timeline dates ascend with stable type order and independent source-array order',()=>{
  const d=emptyData(),date='2026-10-05';
  d.journalEntries=[journal('later','2026-10-20'),journal('j',date),journal('oldest','2026-10-01')];
  d.entries=[food('n-z',date),food('n-a',date)];d.sessions=[session('w-z',date),session('w-a',date)];
  d.cardioEntries=[cardio('c-z',date),cardio('c-a',date)];d.checkins=[checkin('i-z',date),checkin('i-a',date)];d.kneeEntries=[knee('k-z',date),knee('k-a',date)];
  const r=derive(d,[photo('p-z',date),photo('p-a',date)]);
  assert.deepEqual(r.timeline.map(day=>day.date),['2026-10-01','2026-10-05','2026-10-20']);
  assert.deepEqual(r.timeline[1].groups.map(group=>group.kind),['journal','workout','nutrition','cardio','checkin','knee','photo']);
  assert.deepEqual(r.timeline[1].groups.map(group=>group.items.map(item=>item.ref.id)),[['j'],['w-z','w-a'],['n-z','n-a'],['c-z','c-a'],['i-z','i-a'],['k-z','k-a'],['p-a','p-z']]);
  assert.deepEqual(r.sourceDays.map(day=>day.date),['2026-10-01','2026-10-05','2026-10-20']);
  assert.deepEqual(r.timeline[1].groups[2].items[1].ref,source('nutrition','n-a',date));
});
test('R1 closed previews preserve recorded facts and exclude unconsumed fields',()=>{
  const d=emptyData(),date='2026-10-05',j=journal('j',date,'drained',[' Gym ','Đi bộ']);
  j.note='x'.repeat(281);j.highlight=true;d.journalEntries=[j];
  const w=session('w',date);w.sets=[set('s')];w.notes='do not recap';w.workoutSnapshot={name:'Frozen workout'};d.sessions=[w];
  d.entries=[food('n',date)];d.cardioEntries=[cardio('c',date)];d.checkins=[checkin('i',date)];d.kneeEntries=[knee('k',date)];
  const p={...photo('p',date),pose:'front',note:'Saved photo note',weight:0,waist:10,blob:{secret:true},thumbnail:{secret:true}};
  const groups=derive(d,[p]).timeline[0].groups;
  assert.deepEqual(groups.map(g=>g.items[0].preview),[
    {title:'Saved title',noteExcerpt:'x'.repeat(280)+'…',moodID:'drained',tags:[' Gym ','Đi bộ']},
    {savedTitle:'Frozen workout',setCount:1},
    {name:'Saved food',serving:'1 bowl',servings:2,meal:'Saved meal'},
    {activity:'Đi bộ',durationMinutes:20,distanceKm:null,intensity:''},
    {weight:0,waist:null,sleep:null,knee:'',notes:'notes only'},
    {moment:'next-morning',pain:0,swelling:'unknown',instability:'no',stiffness:'yes',notes:'saved detail'},
    {category:'food',pose:'front',note:'Saved photo note'}
  ]);
});
test('R1 journal excerpts retain exact text at and below 280 characters',()=>{
  for(const note of ['','\n raw text  ','x'.repeat(280)]) {
    const d=emptyData();d.journalEntries=[{...journal('j','2026-10-05'),note}];
    assert.equal(derive(d).timeline[0].groups[0].items[0].preview.noteExcerpt,note);
  }
});
test('R1 Unicode excerpt keeps 280 whole characters and literal HTML source text',()=>{
  const d=emptyData(),prefix='<b>raw & text</b>\n';
  d.journalEntries=[{...journal('j','2026-10-05'),note:prefix+'😀'.repeat(281-prefix.length)}];
  assert.equal(derive(d).timeline[0].groups[0].items[0].preview.noteExcerpt,prefix+'😀'.repeat(280-prefix.length)+'…');
});
test('R1 sparse journal-only and saved zero-set workout-only months remain factual',()=>{
  const d=emptyData();d.journalEntries=[journal('j','2026-10-05')];
  let r=derive(d);assert.equal(r.empty,false);assert.deepEqual(r.timeline[0].groups.map(g=>g.kind),['journal']);assert.equal(r.coverage.mood.recordedDays,0);
  d.journalEntries=[];d.sessions=[session('saved','2026-10-05')];d.draft=session('draft','2026-10-05');d.historyEditCandidate=session('candidate','2026-10-05');
  r=derive(d);assert.equal(r.counts.workout.value,1);assert.deepEqual(r.timeline[0].groups[0].items[0].preview,{savedTitle:'Buổi A',setCount:0});
});
test('R1 notes-only checkin and knee records preserve null versus known zero',()=>{
  const d=emptyData();d.checkins=[{...checkin('i','2026-10-04'),weight:null}];d.kneeEntries=[{...knee('k','2026-10-04'),pain:null}];
  const r=derive(d);assert.equal(r.counts.checkin.value,1);assert.equal(r.counts.knee.value,1);assert.equal(r.coverage.checkin.recordedDays,1);
  assert.equal(r.timeline[0].groups[0].items[0].preview.weight,null);assert.equal(r.timeline[0].groups[1].items[0].preview.pain,null);
});
test('P4 full-month counts include future records while coverage uses eligible dates',()=>{
  const d=emptyData();d.entries=[food('old','2026-09-30'),food('a','2026-10-01'),food('b','2026-10-01'),food('today','2026-10-07'),food('future','2026-10-31'),food('next','2026-11-01')];
  const r=derive(d);assert.equal(r.period.calendarDays,31);assert.equal(r.period.eligibleDays,7);assert.equal(r.counts.nutrition.value,4);
  assert.deepEqual(r.counts.nutrition.refs.map(s=>s.id),['a','b','today','future']);assert.equal(r.coverage.nutrition.recordedDays,2);assert.equal(r.coverage.nutrition.ratio,2/7);
  assert.equal(r.coverage.nutrition.calendarRecordedDays,3);assert.equal(r.coverage.nutrition.futureRecordedDays,1);
  assert.deepEqual(r.timeline.map(day=>day.temporalState),['eligible','eligible','future']);
  assert.deepEqual(r.futureRecords.nutrition.value.sources,[source('nutrition','future','2026-10-31')]);
});
test('P4 future month retains all records without an eligible coverage denominator',()=>{
  const d=emptyData();d.journalEntries=[journal('future','2026-11-02','bright')];
  const r=derive(d,[],'2026-10-07','2026-11-30');assert.equal(r.empty,false);assert.equal(r.period.eligibleDays,0);assert.equal(r.period.eligibleEnd,null);
  assert.equal(r.coverage.journal.recordedDays,0);assert.equal(r.coverage.journal.ratio,null);assert.equal(r.counts.journal.value,1);assert.equal(r.timeline[0].temporalState,'future');
});
test('P2 month derivation honors Jan31, leap February and year crossing',()=>{
  for(const [anchor,today,start,end,days,prev,next] of [
    ['2026-01-31','2026-01-31','2026-01-01','2026-01-31',31,'2025-12-01','2026-02-01'],
    ['2028-02-29','2028-03-01','2028-02-01','2028-02-29',29,'2028-01-01','2028-03-01'],
    ['2026-02-28','2026-03-01','2026-02-01','2026-02-28',28,'2026-01-01','2026-03-01'],
    ['2026-12-31','2027-01-01','2026-12-01','2026-12-31',31,'2026-11-01','2027-01-01']
  ]) {
    const d=emptyData();d.journalEntries=[journal('last',end)];const r=derive(d,[],today,anchor);
    assert.deepEqual([r.period.start,r.period.end,r.period.calendarDays,r.period.previousAnchor,r.period.nextAnchor],[start,end,days,prev,next]);
    assert.equal(r.counts.journal.value,1);assert.equal(r.timeline[0].date,end);
  }
});
test('P5 months preserve years 0000–0099 and stop navigation at supported boundaries',()=>{
  for(const [anchor,end,days,prev,next] of [
    ['0000-01-01','0000-01-31',31,null,'0000-02-01'],
    ['0000-02-15','0000-02-29',29,'0000-01-01','0000-03-01'],
    ['0099-12-31','0099-12-31',31,'0099-11-01','0100-01-01'],
    ['9999-12-31','9999-12-31',31,'9999-11-01',null]
  ]) {
    const d=emptyData();d.journalEntries=[journal('j',end)];const r=derive(d,[],end,anchor);
    assert.deepEqual([r.period.end,r.period.calendarDays,r.period.previousAnchor,r.period.nextAnchor],[end,days,prev,next]);assert.equal(r.timeline[0].date,end);
  }
});
test('P6 invalid anchors or today reject without a fallback or ambient clock',()=>{
  assert.equal(typeof domain.deriveMonthMemories,'function','missing Phase7 deriveMonthMemories');
  for(const bad of ['',null,42,'2026-02-29','2026-10','10000-01-01','2026-10-07T00:00:00Z']) {
    assert.throws(()=>derive(emptyData(),[],'2026-10-07',bad));assert.throws(()=>derive(emptyData(),[],bad,'2026-10-01'));
  }
  assert.throws(()=>domain.deriveMonthMemories({status:'available',data:emptyData()},{status:'available',records:[]},undefined,'2026-10-07'));
  assert.throws(()=>domain.deriveMonthMemories({status:'available',data:emptyData()},{status:'available',records:[]},'2026-10-01',undefined));
});
test('R2 photos-only all categories use own date, dedupe identical ID and omit absent optional fields',()=>{
  const p=photo('food','2026-10-05');const photos=[p,{...p},...['daily','progress','gym','other'].map(category=>({id:category,date:'2026-10-05',category})),photo('outside','2026-09-30')];
  const r=derive(emptyData(),photos);assert.equal(r.counts.photos.value,5);assert.equal(r.coverage.photos.recordedDays,1);assert.equal(r.empty,false);
  assert.deepEqual(r.timeline[0].groups.map(g=>g.kind),['photo']);assert.deepEqual(r.timeline[0].groups[0].items.map(i=>i.ref.id),['daily','food','gym','other','progress']);
  assert.deepEqual(r.timeline[0].groups[0].items[1].preview,{category:'food'});assert.equal(r.counts.nutrition.value,0);
});
test('R2 ten photos on one date count ten IDs and one coverage date',()=>{
  const r=derive(emptyData(),Array.from({length:10},(_,i)=>photo(`p${i}`,'2026-10-05')));
  assert.equal(r.counts.photos.value,10);assert.equal(r.coverage.photos.recordedDays,1);assert.equal(r.timeline[0].groups[0].items.length,10);assert.equal(r.coverage.photos.dates[0].refs.length,10);
});
test('R2 conflicting photo ID anywhere fails photos while JSON remains readable',()=>{
  const d=emptyData();d.journalEntries=[journal('j','2026-10-05')];
  for(const changed of [{date:'2026-09-30'},{note:'different'},{category:'gym',ownerType:undefined,ownerId:undefined}]) {
    const p=photo('p','2026-09-01'),r=derive(d,[p,{...p,...changed}]);
    assert.equal(r.counts.photos.state,'unavailable');assert.equal(r.counts.photos.value,null);assert.equal(r.coverage.photos.recordedDays,null);assert.equal(r.empty,false);
    assert.deepEqual(r.timeline[0].groups.map(g=>g.kind),['journal']);assert.equal(r.unavailableDomains[0].domain,'photos');
  }
});
test('I1 canonical JSON failure keeps independent photos and safe reasons without raw input leakage',()=>{
  const input={status:'unavailable',reason:new Error('private source content')};
  let r=derive(input,[photo('p','2026-10-05')]);assert.equal(r.empty,false);assert.equal(r.counts.photos.value,1);assert.equal(r.counts.journal.state,'unavailable');
  assert.equal(r.counts.journal.reason.code,'canonical-load-error');assert.deepEqual(r.timeline[0].groups.map(g=>g.kind),['photo']);
  assert.equal(JSON.stringify(r).includes('private source content'),false);
  r=derive(input);assert.equal(r.empty,null);assert.equal(r.timeline.length,0);assert.equal(r.unavailableDomains.length,6);
});
test('I1 metadata read failure is unavailable rather than zero and does not suppress JSON',()=>{
  const d=emptyData();d.entries=[food('n','2026-10-05')];const r=derive(d,{status:'unavailable',reason:'private'});
  assert.equal(r.empty,false);assert.equal(r.counts.photos.value,null);assert.equal(r.counts.photos.reason.code,'photo-read-error');assert.equal(r.counts.nutrition.value,1);assert.equal(r.timeline[0].groups[0].kind,'nutrition');
  assert.equal(derive(emptyData(),{status:'unavailable'}).empty,null);
});
test('I1 whole-domain invalid IDs, dates and consumed shapes are never hidden outside month',()=>{
  for(const [key,kind,record] of [
    ['journalEntries','journal',{...journal('bad','2026-09-01'),tags:null}],
    ['entries','nutrition',{...food('bad','2026-09-01'),servings:0}],
    ['sessions','workout',{...session('bad','2026-09-01'),sets:[{...set('s'),reps:0}]}],
    ['cardioEntries','cardio',{...cardio('bad','2026-09-01'),distanceKm:-1}],
    ['checkins','checkin',{...checkin('bad','2026-09-01'),weight:'0'}],
    ['kneeEntries','knee',{...knee('bad','2026-09-01'),pain:11}]
  ]) {
    const d=emptyData();d[key]=[record];const r=derive(d);assert.equal(r.counts[kind].state,'unavailable');assert.equal(r.counts[kind].value,null);assert.equal(r.empty,null);assert.equal(r.timeline.length,0);
  }
  for(const records of [[food('same','2026-09-01'),food('same','2026-10-05')],[food('bad','not-a-date')]]) {
    const d=emptyData();d.entries=records;assert.equal(derive(d).counts.nutrition.state,'unavailable');
  }
  for(const records of [[journal('same','2026-09-01'),journal('same','2026-09-02')],[journal('a','2026-09-01'),journal('b','2026-09-01')]]) {
    const d=emptyData();d.journalEntries=records;const r=derive(d);assert.equal(r.coverage.journal.status,'unavailable');assert.equal(r.coverage.mood.status,'unavailable');
  }
});
test('I1 invalid mood alone isolates mood across full domain without losing journal memories',()=>{
  const d=emptyData();d.journalEntries=[journal('j','2026-10-05','good',['Gym']),journal('outside','2026-09-01','invalid')];
  const r=derive(d);assert.equal(r.coverage.mood.status,'unavailable');assert.equal(r.coverage.journal.recordedDays,1);assert.equal(r.counts.journal.value,1);assert.equal(r.timeline[0].groups[0].items[0].preview.moodID,'good');
  assert.deepEqual(r.unavailableDomains.map(row=>row.domain),['mood']);
  d.journalEntries.shift();assert.equal(derive(d).empty,null);
});
test('I1 invalid mood preview carries no raw malformed object or invented mood ID',()=>{
  for(const mood of ['invalid',{private:'content'},['bright'],null,undefined]) {
    const d=emptyData();d.journalEntries=[journal('j','2026-10-05',mood)];d.journalEntries[0].mood=mood;
    const r=derive(d);assert.equal(r.coverage.mood.status,'unavailable');assert.equal(r.counts.journal.value,1);
    assert.equal(r.timeline[0].groups[0].items[0].preview.moodID,null);assert.equal(JSON.stringify(r).includes('private'),false);
  }
});
test('I1 invalid photo consumed shape outside month invalidates full photo domain',()=>{
  for(const change of [{date:'bad'},{category:'invalid'},{pose:'invalid'},{note:{}},{weight:-1},{ownerType:'recipe',ownerId:''}]) {
    const r=derive(emptyData(),[{...photo('p','2026-09-01'),...change}]);assert.equal(r.counts.photos.state,'unavailable');assert.equal(r.empty,null);
  }
});
test('I2 frozen source arrays stay unchanged and all mutable output containers detach deeply',()=>{
  const d=emptyData(),date='2026-10-05';d.journalEntries=[journal('j',date,'good',[' Gym '])];d.entries=[food('n',date)];d.sessions=[session('w',date)];d.cardioEntries=[cardio('c',date)];d.checkins=[checkin('i',date)];d.kneeEntries=[knee('k',date)];
  const photos=[photo('z',date),photo('a',date)],before=JSON.stringify({d,photos});freeze(d);freeze(photos);
  const r=derive(d,photos);const inputObjects=new Set();const collect=value=>{if(value&&typeof value==='object'){inputObjects.add(value);Object.values(value).forEach(collect);}};collect(d);collect(photos);
  const check=value=>{if(value&&typeof value==='object'){assert.equal(inputObjects.has(value),false);Object.values(value).forEach(check);}};check(r);
  r.timeline[0].groups[0].items[0].preview.tags.push('mutation');r.timeline[0].groups[0].items[0].ref.id='changed';r.counts.photos.refs.reverse();r.period.calendarDates.reverse();
  assert.equal(JSON.stringify({d,photos}),before);assert.equal(derive(d,photos).timeline[0].groups[0].items[0].ref.id,'j');
});
test('R1 logged snapshot previews ignore current library and source edit fields',()=>{
  const d=emptyData();d.entries=[food('n','2026-10-05')];d.foods=[{id:'recipe:deleted',name:'Current food'}];d.recipes=[{id:'deleted',name:'Current recipe'}];
  assert.deepEqual(derive(d).timeline[0].groups[0].items[0].preview,{name:'Saved food',serving:'1 bowl',servings:2,meal:'Saved meal'});
});
