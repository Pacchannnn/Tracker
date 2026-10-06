import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, dailyTotals, createBackup, parseBackup, restoreBackupData, updateData } from '../js/data.js';
import { daySummary } from '../js/my-day.js';
import { searchFoods, scaleRecipe } from '../js/nutrition.js';
import * as batch from '../js/nutrition-batch.js';
const uuid = () => crypto.randomUUID();
function fixture() {
  const data = emptyData();
  data.foods = ['Cơm trắng', 'Đậu đỏ', 'Trứng'].map((name,i) => ({ id:`f${i}`, name, serving:'1 bát', notes:'', calories:100+i*50, protein:10, carbs:20, fat:0 }));
  data.recipes = [{ id:'r1', name:'Cơm gà', servings:4, description:'', ingredients:[{quantity:400,unit:'g',name:'Gà'}], steps:['Nấu20 phút'], tags:[], notes:'', nutritionPerServing:{calories:300,protein:30,carbs:40,fat:5} },
    { id:'r2', name:'Chưa rõ macro', servings:1, description:'', ingredients:[{quantity:1,unit:'bát',name:'Rau'}], steps:['Nấu'], tags:[], notes:'', nutritionPerServing:null }];
  data.entries = data.foods.map((food,i) => ({id:`old${i}`,date:'2026-10-01',meal:'Breakfast',foodId:food.id,food:structuredClone(food),servings:i+1}));
  data.entries.push({id:'recipe-old',date:'2026-10-04',meal:'Lunch',foodId:'recipe:r1',food:{name:'Cơm gà',serving:'1 phần',...data.recipes[0].nutritionPerServing},servings:2});
  return data;
}
function rows(data, count=3) { let result=[]; for(let i=0;i<count;i++) result=batch.selectNutritionRow(result,data,'food',`f${i}`); return result; }
const review = (data, selected=rows(data), meal='Dinner',date='2026-09-20') => batch.reviewNutritionBatch(data,{date,meal,rows:selected});
function storageFor(data) {
  let raw=JSON.stringify(data), writes=0, fail=false;
  const storage={getItem:()=>raw,setItem:(key,value)=>{if(fail) throw new Error('quota'); raw=value; writes++;}};
  const locks={request:async(name,fn)=>fn()};
  return {storage,locks,get data(){return JSON.parse(raw);},get raw(){return raw;},get writes(){return writes;},set fail(value){fail=value;}};
}
test('batch module exposes the planned domain interfaces',()=>{ for(const name of ['nutritionChoice','recentNutritionChoices','selectNutritionRow','selectCopyRow','reviewNutritionBatch','buildNutritionBatch','createNutritionBatchWriter']) assert.equal(typeof batch[name],'function',name); });
test('recents prioritize same meal over newer global usage and dedupe definitions',()=>{
  const d=fixture(); d.entries.push({...d.entries[0],id:'new',date:'2026-10-03'});
  const r=batch.recentNutritionChoices(d,'Breakfast',{limit:4});
  assert.deepEqual(r.map(x=>x.key),['food:f0','food:f2','food:f1','recipe:r1']);
  assert.deepEqual(r.map(x=>x.group),['meal','meal','meal','global']);
});
test('recent fallback is explicit and limit/empty behavior is predictable',()=>{
  const d=fixture(); assert.equal(batch.recentNutritionChoices(d,'Dinner',{limit:1})[0].group,'global');
  assert.deepEqual(batch.recentNutritionChoices(emptyData(),'Lunch'),[]);
  assert.equal(batch.recentNutritionChoices(d,'Breakfast',{limit:2}).length,2);
});
test('missing source recent remains historical label but disabled, never resurrected',()=>{
  const d=fixture(); d.foods.splice(0,1); const before=structuredClone(d);
  const r=batch.recentNutritionChoices(d,'Breakfast').find(x=>x.key==='food:f0');
  assert.equal(r.name,'Cơm trắng'); assert.equal(r.selectable,false);
  assert.throws(()=>batch.selectNutritionRow([],d,'food','f0')); assert.deepEqual(d,before);
});
test('recipes with unknown or incomplete nutrition cannot be selected',()=>{
  const d=fixture(); assert.equal(batch.nutritionChoice(d,'recipe','r2').selectable,false);
  d.recipes[0].nutritionPerServing.protein=null;
  assert.throws(()=>batch.selectNutritionRow([],d,'recipe','r1'));
});
test('select1 and select3 default to one serving and prevent duplicate source',()=>{
  const d=fixture(); const one=rows(d,1); assert.equal(one[0].servings,'1');
  const three=rows(d); assert.equal(three.length,3); assert.equal(batch.selectNutritionRow(three,d,'food','f0').length,3);
});
test('per-item amount and removal leave other pending amounts unchanged',()=>{
  const d=fixture(), selected=rows(d); selected[1].servings='2.5';
  const records=batch.buildNutritionBatch(d,review(d,selected.filter(x=>x.key!=='food:f0')),uuid);
  assert.deepEqual(records.map(x=>x.servings),[2.5,1]); assert.deepEqual(d.entries.map(x=>x.servings),[1,2,3,2]);
});
test('batch3 creates fresh unique ids and exact historical date/meal/canonical totals',()=>{
  const d=fixture(), selected=rows(d); selected[0].servings='2';
  const result=batch.buildNutritionBatch(d,review(d,selected),uuid);
  assert.equal(result.length,3); assert.equal(new Set(result.map(x=>x.id)).size,3);
  assert.ok(result.every(x=>x.date==='2026-09-20'&&x.meal==='Dinner'&&!d.entries.some(y=>y.id===x.id)));
  assert.deepEqual(dailyTotals(result,'2026-09-20'),{calories:550,protein:40,carbs:80,fat:0});
});
test('recipe selection uses per-serving snapshot independent from cook-size preview',()=>{
  const d=fixture(); const selected=batch.selectNutritionRow([],d,'recipe','r1');
  scaleRecipe(d.recipes[0],2); const r=batch.buildNutritionBatch(d,review(d,selected),uuid)[0];
  assert.equal(r.foodId,'recipe:r1'); assert.equal(r.servings,1); assert.equal(r.food.calories,300);
});
test('one invalid amount rejects entire review and changes no inputs',()=>{
  for(const amount of ['', ' ',0,-1,101,'oops',Infinity,null]) {
    const d=fixture(), before=structuredClone(d), selected=rows(d); selected[1].servings=amount;
    assert.throws(()=>review(d,selected)); assert.deepEqual(d,before);
  }
});
test('invalid dates/meals and empty/duplicate batches reject',()=>{
  const d=fixture(); assert.throws(()=>review(d,[])); assert.throws(()=>review(d,rows(d),'','2026-09-20'));
  assert.throws(()=>review(d,rows(d),'Lunch','2026-02-30'));
  const selected=rows(d,1); assert.throws(()=>review(d,[...selected,...selected]));
});
test('stale food/recipe candidate edit or deletion rejects whole batch',()=>{
  for(const type of ['food','recipe']) for(const remove of [false,true]) {
    const d=fixture(), r=review(d,batch.selectNutritionRow([],d,type,type==='food'?'f0':'r1'));
    const list=type==='food'?d.foods:d.recipes;
    if(remove) list.shift(); else list[0].name='Changed';
    assert.throws(()=>batch.buildNutritionBatch(d,r,uuid));
  }
});
test('destination-day change rejects reviewed batch while unrelated date/domain merges',()=>{
  const d=fixture(), r=review(d); d.entries.push({...d.entries[0],id:'target',date:r.date});
  assert.throws(()=>batch.buildNutritionBatch(d,r,uuid)); d.entries.pop();
  d.entries.push({...d.entries[0],id:'unrelated',date:'2026-08-01'}); d.settings.calories=2000;
  assert.equal(batch.buildNutritionBatch(d,r,uuid).length,3);
});
test('atomic writer validates latest state and performs exactly one locked persistence',async()=>{
  const d=fixture(), env=storageFor(d), writer=batch.createNutritionBatchWriter({write:change=>updateData(env.storage,env.locks,change),createId:uuid});
  const next=await writer.commit(review(d)); assert.equal(env.writes,1); assert.equal(next.entries.length,d.entries.length+3);
  assert.deepEqual(env.data.entries.slice(0,4),d.entries);
});
test('double submit while pending and after success creates N, never2N',async()=>{
  const d=fixture(), env=storageFor(d); let release;
  const gate=new Promise(resolve=>release=resolve);
  const writer=batch.createNutritionBatchWriter({write:async change=>{await gate; return updateData(env.storage,env.locks,change);},createId:uuid});
  const r=review(d), first=writer.commit(r); await assert.rejects(writer.commit(r)); release(); await first;
  await assert.rejects(writer.commit(r)); assert.equal(env.writes,1); assert.equal(env.data.entries.length,7);
});
test('quota failure preserves exact disk and review, explicit retry succeeds once',async()=>{
  const d=fixture(), env=storageFor(d), writer=batch.createNutritionBatchWriter({write:c=>updateData(env.storage,env.locks,c),createId:uuid}), r=review(d), before=structuredClone(r), raw=env.raw;
  env.fail=true; await assert.rejects(writer.commit(r)); assert.equal(env.raw,raw); assert.equal(env.writes,0); assert.deepEqual(r,before);
  env.fail=false; await writer.commit(r); assert.equal(env.writes,1); assert.equal(env.data.entries.length,7);
});
test('invalid latest candidate rejects all with zero persisted items',async()=>{
  const d=fixture(), r=review(d), env=storageFor({...d,foods:d.foods.slice(1)}), raw=env.raw;
  const w=batch.createNutritionBatchWriter({write:c=>updateData(env.storage,env.locks,c),createId:uuid});
  await assert.rejects(w.commit(r)); assert.equal(env.raw,raw); assert.equal(env.writes,0);
});
test('fresh-id collisions reject whole batch instead of writing duplicate backup IDs',()=>{
  const d=fixture(), r=review(d); assert.throws(()=>batch.buildNutritionBatch(d,r,()=>d.entries[0].id));
  assert.throws(()=>batch.buildNutritionBatch(d,r,()=> 'same'));
});
test('selection, review, cancel/discard simulation and recents perform zero storage writes',()=>{
  const d=fixture(), env=storageFor(d), raw=env.raw; let selected=rows(d); selected[0].servings='2';
  batch.recentNutritionChoices(d,'Lunch'); review(d,selected); selected=[];
  assert.equal(selected.length,0); assert.equal(env.writes,0); assert.equal(env.raw,raw);
});
test('selective copy1of3 preserves saved amount/snapshot and fresh destination id',()=>{
  const d=fixture(), selected=batch.selectCopyRow([],d,'old1'); const before=structuredClone(d);
  const result=batch.buildNutritionBatch(d,review(d,selected),uuid);
  assert.equal(result.length,1); assert.equal(result[0].servings,2); assert.equal(result[0].meal,'Dinner');
  assert.notEqual(result[0].id,'old1'); assert.deepEqual(result[0].food,d.entries[1].food); assert.deepEqual(d,before);
});
test('selective copy2of3 dedupes entry ids and can preserve individual source meals',()=>{
  const d=fixture(); let selected=batch.selectCopyRow([],d,'old0'); selected=batch.selectCopyRow(selected,d,'recipe-old'); selected=batch.selectCopyRow(selected,d,'old0');
  const result=batch.buildNutritionBatch(d,review(d,selected,null),uuid);
  assert.equal(result.length,2); assert.deepEqual(result.map(x=>x.meal),['Breakfast','Lunch']); assert.equal(new Set(result.map(x=>x.id)).size,2);
});
test('copy from deleted food and edited/deleted recipe still uses independent logged snapshot',()=>{
  const d=fixture(); d.foods=[]; d.recipes=[]; let selected=batch.selectCopyRow([],d,'old0'); selected=batch.selectCopyRow(selected,d,'recipe-old');
  const result=batch.buildNutritionBatch(d,review(d,selected),uuid);
  assert.equal(result[0].foodId,'f0'); assert.equal(result[0].food.calories,100);
  assert.equal(result[1].foodId,'recipe:r1'); assert.equal(result[1].food.calories,300);
  d.recipes=fixture().recipes; d.recipes[0].nutritionPerServing.calories=999;
  assert.equal(batch.buildNutritionBatch(d,review(d,selected),uuid)[1].food.calories,300);
});
test('copy amount changes use saved per-serving macros and do not relink edited definition',()=>{
  const d=fixture(), selected=batch.selectCopyRow([],d,'old0'); selected[0].servings='2.5'; d.foods[0].calories=900;
  const result=batch.buildNutritionBatch(d,review(d,selected),uuid);
  assert.equal(dailyTotals(result,'2026-09-20').calories,250); assert.equal(result[0].food.calories,100);
});
test('copy source entry edit/delete after review rejects, unrelated live definition change is allowed',()=>{
  const d=fixture(), r=review(d,batch.selectCopyRow([],d,'old0'));
  d.foods[0].name='Library edit'; assert.equal(batch.buildNutritionBatch(d,r,uuid).length,1);
  d.entries[0].servings=2; assert.throws(()=>batch.buildNutritionBatch(d,r,uuid)); d.entries.shift(); assert.throws(()=>batch.buildNutritionBatch(d,r,uuid));
});
test('null historical snapshot remains readable but cannot be newly copied as zero macros',()=>{
  const d=fixture(); d.entries[0].food.calories=null; assert.equal(dailyTotals(d.entries,'2026-10-01').calories,null);
  assert.throws(()=>batch.selectCopyRow([],d,'old0'));
});
test('copy double submit and failure remain atomic with retained review',async()=>{
  const d=fixture(), r=review(d,batch.selectCopyRow(batch.selectCopyRow([],d,'old0'),d,'old2')), env=storageFor(d);
  const w=batch.createNutritionBatchWriter({write:c=>updateData(env.storage,env.locks,c),createId:uuid});
  env.fail=true; await assert.rejects(w.commit(r)); assert.equal(env.writes,0); env.fail=false;
  const a=w.commit(r), b=w.commit(r); await assert.rejects(b); await a; assert.equal(env.writes,1); assert.equal(env.data.entries.length,6);
});
test('MyDay derives exact counts/meal grouping/macros after batch3 without consumer change',()=>{
  const d=fixture(), result=batch.buildNutritionBatch(d,review(d),uuid); d.entries.push(...result);
  const summary=daySummary(d,[],'2026-09-20'); assert.equal(summary.nutrition.itemCount,3); assert.equal(summary.nutrition.mealCount,1);
  assert.deepEqual(summary.nutrition.totals,dailyTotals(result,'2026-09-20'));
});
test('schema8 backup restores old/multi/copy/deleted-source snapshots and recipes exactly',()=>{
  const d=fixture(); d.entries.push(...batch.buildNutritionBatch(d,review(d),uuid)); d.foods.shift();
  const copy=batch.selectCopyRow([],d,'old0'); d.entries.push(...batch.buildNutritionBatch(d,review(d,copy,'Lunch','2026-09-21'),uuid));
  const restored=parseBackup(createBackup(d)).data; const destination=emptyData();
  restoreBackupData(destination,restored,JSON.stringify(destination)); assert.deepEqual(destination,d); assert.equal(restored.schemaVersion,8);
});
test('selection/recent/review/build leave deeply frozen inputs unchanged and preserve food search',()=>{
  const d=fixture(), original=structuredClone(d); const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}; freeze(d);
  const selected=rows(d); freeze(selected); const r=review(d,selected); freeze(r);
  batch.recentNutritionChoices(d,'Breakfast'); batch.buildNutritionBatch(d,r,uuid);
  assert.deepEqual(searchFoods(d.foods,d.entries,'dau do').map(x=>x.id),['f1']); assert.deepEqual(d,original);
});
test('new food and recipe snapshots survive later source edit and deletion',()=>{
  const d=fixture(); const selected=batch.selectNutritionRow(batch.selectNutritionRow([],d,'food','f0'),d,'recipe','r1');
  const saved=batch.buildNutritionBatch(d,review(d,selected),uuid), before=structuredClone(saved);
  d.entries.push(...saved); d.foods[0].calories=900; d.recipes[0].nutritionPerServing.calories=999;
  assert.deepEqual(saved,before); d.foods=[];d.recipes=[];assert.deepEqual(saved,before);
  assert.equal(daySummary(d,[],'2026-09-20').nutrition.totals.calories,400);
});
test('queued writer rejects relevant destination change but merges unrelated latest state',async()=>{
  const d=fixture(), r=review(d), changed=structuredClone(d); changed.settings.calories=2000;
  changed.entries.push({...d.entries[0],id:'elsewhere',date:'2026-08-01'});
  const env=storageFor(changed), w=batch.createNutritionBatchWriter({write:c=>updateData(env.storage,env.locks,c),createId:uuid});
  await w.commit(r);assert.equal(env.data.settings.calories,2000);assert.equal(env.data.entries.length,8);assert.equal(env.writes,1);
  const affected=structuredClone(d);affected.entries.push({...d.entries[0],id:'target',date:r.date});
  const other=storageFor(affected), raw=other.raw, blocked=batch.createNutritionBatchWriter({write:c=>updateData(other.storage,other.locks,c),createId:uuid});
  await assert.rejects(blocked.commit(r));assert.equal(other.raw,raw);assert.equal(other.writes,0);
});
