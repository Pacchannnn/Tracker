import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, loadData } from '../js/data.js';
const source = await import('../js/life-review-source.js').catch(() => ({}));
test('D1 source resolver verifies latest ID and date, never substitutes a same-date record', () => {
  assert.equal(typeof source.resolveLifeSource, 'function');
  const data = emptyData();
  data.journalEntries = [{id:'j',date:'2026-10-06',mood:'',title:'',note:'',tags:[]}];
  const ref = {kind:'journal',id:'j',date:'2026-10-06'};
  assert.equal(source.resolveLifeSource(data, [], ref).record.id, 'j');
  assert.throws(()=>source.resolveLifeSource(data, [], {...ref,id:'gone'}));
  data.journalEntries[0].date='2026-10-07';
  assert.throws(()=>source.resolveLifeSource(data, [], ref));
});
test('D1 saved set resolver retains exact session and slot/legacy owner and rejects changed owner', () => {
  assert.equal(typeof source.resolveLifeSource, 'function');
  const data = emptyData(); data.sessions=[{id:'s',date:'2026-10-06',sets:[{id:'set',slotId:'old',exerciseIndex:2}]}];
  const ref={kind:'set',id:'set',date:'2026-10-06',sessionId:'s',slotId:'old',legacyIndex:null};
  assert.equal(source.resolveLifeSource(data,[],ref).session.id,'s');
  assert.throws(()=>source.resolveLifeSource(data,[],{...ref,slotId:'new'}));
  assert.throws(()=>source.resolveLifeSource(data,[],{...ref,sessionId:'gone'}));
  delete data.sessions[0].sets[0].slotId;
  assert.equal(source.resolveLifeSource(data,[],{...ref,slotId:null,legacyIndex:2}).record.id,'set');
});
test('D1 day validates dates and photo metadata route resolves exact ID without binary reads', () => {
  assert.equal(typeof source.resolveLifeSource,'function');
  assert.equal(source.resolveLifeSource(emptyData(),[],{kind:'day',date:'2026-10-06'}).kind,'day');
  assert.throws(()=>source.resolveLifeSource(emptyData(),[],{kind:'day',date:'2026-02-30'}));
  const photos=[{id:'p',date:'2026-10-06',category:'food',ownerId:'orphan'}];
  const result=source.resolveLifeSource(null,photos,{kind:'photo',id:'p',date:'2026-10-06'});
  result.record.category='other'; assert.equal(photos[0].category,'food');
});
test('I1 canonical read failure is an unavailable envelope, never raw parsing or empty-success', () => {
  assert.equal(typeof source.readLifeData,'function');
  const storage={getItem:()=>'{'};
  assert.equal(source.readLifeData(()=>loadData(storage)).status,'unavailable');
  const data=emptyData(), read=source.readLifeData(()=>data);
  assert.equal(read.status,'available'); read.data.settings.week=5; assert.equal(data.settings.week,1);
});
test('D1 newly duplicated journal date or identity rejects instead of opening arbitrary editor source', () => {
  const data=emptyData(), ref={kind:'journal',id:'j2',date:'2026-10-06'};
  data.journalEntries=[{id:'j1',date:ref.date},{id:'j2',date:ref.date}];
  assert.throws(()=>source.resolveLifeSource(data,[],ref));
  data.journalEntries=[{id:'j2',date:'2026-10-07'},{id:'j2',date:ref.date}];
  assert.throws(()=>source.resolveLifeSource(data,[],ref));
});
test('D1 set sources reject duplicate legacy session/set identities',()=>{
  const data=emptyData(),session={id:'s',date:'2026-10-06',sets:[{id:'x',exerciseIndex:0}]};
  const ref={kind:'set',id:'x',date:session.date,sessionId:'s',slotId:null,legacyIndex:0};
  data.sessions=[session,structuredClone(session)];assert.throws(()=>source.resolveLifeSource(data,[],ref));
  data.sessions=[session];session.sets.push({...session.sets[0]});assert.throws(()=>source.resolveLifeSource(data,[],ref));
});
