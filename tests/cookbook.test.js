import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,updateData,createBackup,parseBackup,restoreBackupData,dailyTotals} from '../js/data.js';
import {daySummary} from '../js/my-day.js';
import {selectNutritionRow,reviewNutritionBatch,buildNutritionBatch,selectCopyRow,recentNutritionChoices} from '../js/nutrition-batch.js';
import {ownedPhotos} from '../js/photo-store.js';
import * as book from '../js/cookbook.js';
const uuid=()=>crypto.randomUUID();
const recipe=()=>({id:'r1',name:'Cơm gà',description:'Mô tả',servings:4,ingredients:[{quantity:400,unit:'g',name:'Gà'},{quantity:0.25,unit:'muỗng',name:'Muối'}],steps:['Nấu20 phút','<img src=x> chỉ là chữ'],tags:['Bữa chính','Đơn giản'],notes:'Ghi chú',nutritionPerServing:{calories:300,protein:30,carbs:40,fat:0}});
const fixture=()=>{const d=emptyData();d.recipes=[recipe(),{...recipe(),id:'r2',name:'Rau',tags:['Bữa phụ'],ingredients:[{quantity:1,unit:'bát',name:'Đậu đỏ'}],nutritionPerServing:null}];d.entries=[{id:'old',date:'2026-10-01',meal:'Lunch',foodId:'recipe:r1',food:{name:'Cơm gà',serving:'1 phần',...recipe().nutritionPerServing},servings:1}];return d;};
function env(d){let raw=JSON.stringify(d),writes=0,fail=false;return{storage:{getItem:()=>raw,setItem:(k,v)=>{if(fail)throw new Error('quota');raw=v;writes++;}},locks:{request:async(k,fn)=>fn()},get raw(){return raw;},get writes(){return writes;},get data(){return JSON.parse(raw);},set fail(v){fail=v;}};}
test('cookbook exports required pure and write interfaces',()=>{for(const name of ['normalizeRecipeText','searchRecipes','recipeTagOptions','duplicateRecipeDefinition','recipeFormValues','createRecipeDuplicateWriter','cookingPreview'])assert.equal(typeof book[name],'function',name);});
test('name search handles accents, case, Vietnamese đ and collapsed whitespace',()=>{
  const list=fixture().recipes;assert.equal(book.searchRecipes(list,{query:' COM   GA '})[0].id,'r1');assert.equal(book.searchRecipes(list,{query:'dau do'})[0].id,'r2');assert.equal(book.normalizeRecipeText(' ĐƠN   GIẢN '),'don gian');
});
test('ingredient and tag searches are per-field, not fabricated cross-field phrases',()=>{
  const list=fixture().recipes;assert.equal(book.searchRecipes(list,{query:'muoi'})[0].id,'r1');assert.equal(book.searchRecipes(list,{query:'bua chinh'})[0].id,'r1');assert.deepEqual(book.searchRecipes([{...recipe(),name:'alpha',tags:['beta'],ingredients:[{quantity:1,unit:'g',name:'gamma'}]}],{query:'alpha beta'}),[]);
});
test('blank/no-result search and exact ALL tags/query AND preserve library order',()=>{
  const list=fixture().recipes;assert.deepEqual(book.searchRecipes(list,{query:' '}),list);assert.deepEqual(book.searchRecipes(list,{query:'absent'}),[]);
  assert.deepEqual(book.searchRecipes(list,{query:'ga',tags:['bua chinh','don gian']}).map(x=>x.id),['r1']);assert.deepEqual(book.searchRecipes(list,{tags:['Bữa chính','Bữa phụ']}),[]);
  assert.deepEqual(book.recipeTagOptions(list),['Bữa chính','Đơn giản','Bữa phụ']);
});
test('search and cooking are immutable and perform zero persistence writes',()=>{
  const d=fixture(),e=env(d),before=structuredClone(d);const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};freeze(d);
  book.searchRecipes(d.recipes,{query:'ga'});book.recipeTagOptions(d.recipes);book.cookingPreview(d.recipes[0],2);assert.deepEqual(d,before);assert.equal(e.writes,0);
});
test('duplicate whitelists current fields, removes ID/metadata and adds editable clear name',()=>{
  const source={...recipe(),createdAt:'old',ownerId:'r1',uiState:'x'},copy=book.duplicateRecipeDefinition(source);
  assert.equal(copy.name,'Cơm gà — Bản sao');assert.equal(copy.id,undefined);assert.equal(copy.createdAt,undefined);assert.equal(copy.ownerId,undefined);assert.equal(copy.uiState,undefined);
  assert.deepEqual(Object.keys(copy).sort(),['name','description','servings','ingredients','steps','tags','notes','nutritionPerServing'].sort());
});
test('duplicate nested ingredients/steps/tags/macros are independently cloned both ways',()=>{
  const source=recipe(),copy=book.duplicateRecipeDefinition(source);copy.ingredients[0].quantity=999;copy.steps[0]='Copy';copy.tags.push('Copy');copy.nutritionPerServing.calories=900;
  assert.equal(source.ingredients[0].quantity,400);assert.equal(source.steps[0],'Nấu20 phút');assert.equal(source.tags.length,2);assert.equal(source.nutritionPerServing.calories,300);source.ingredients[1].quantity=2;assert.equal(copy.ingredients[1].quantity,0.25);
});
test('editor raw values preserve current definition fields and unknown macro empties',()=>{
  const raw=book.recipeFormValues(recipe());assert.equal(raw.ingredients,'400 | g | Gà\n0.25 | muỗng | Muối');assert.equal(raw.steps,recipe().steps.join('\n'));
  assert.equal(book.recipeFormValues({...recipe(),nutritionPerServing:null}).calories,'');
});
test('duplicate save creates exactly one fresh recipe, original/history untouched, no logged item',async()=>{
  const d=fixture(),e=env(d),w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid}),draft={source:structuredClone(d.recipes[0]),raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))};
  draft.raw.name='Bản sao chỉnh';draft.raw.ingredients='200 | g | Gà';const next=await w.save(draft);assert.equal(e.writes,1);assert.equal(next.recipes.length,3);assert.notEqual(next.recipes[2].id,'r1');assert.equal(next.recipes[2].ingredients[0].quantity,200);assert.deepEqual(next.recipes.slice(0,2),d.recipes);assert.deepEqual(next.entries,d.entries);
});
test('duplicate double-save while pending and after success yields one record',async()=>{
  const d=fixture(),e=env(d);let release;const gate=new Promise(r=>release=r);const w=book.createRecipeDuplicateWriter({write:async c=>{await gate;return updateData(e.storage,e.locks,c);},createId:uuid}),draft={source:d.recipes[0],raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))};
  const first=w.save(draft);await assert.rejects(w.save(draft));release();await first;await assert.rejects(w.save(draft));assert.equal(e.data.recipes.length,3);assert.equal(e.writes,1);
});
test('duplicate changed/deleted source rejects without writing or resurrecting it',async()=>{
  for(const deleted of [false,true]){const d=fixture(),source=structuredClone(d.recipes[0]);if(deleted)d.recipes.shift();else d.recipes[0].notes='Changed';const e=env(d),raw=e.raw,w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid});await assert.rejects(w.save({source,raw:book.recipeFormValues(book.duplicateRecipeDefinition(source))}));assert.equal(e.raw,raw);assert.equal(e.writes,0);}
});
test('duplicate storage failure keeps draft and exact disk, explicit retry once succeeds',async()=>{
  const d=fixture(),e=env(d),draft={source:d.recipes[0],raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))},before=structuredClone(draft),raw=e.raw,w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid});
  e.fail=true;await assert.rejects(w.save(draft));assert.deepEqual(draft,before);assert.equal(e.raw,raw);assert.equal(e.writes,0);e.fail=false;await w.save(draft);assert.equal(e.data.recipes.length,3);assert.equal(e.writes,1);
});
test('duplicate validation/id collision rejects, unrelated latest changes merge',async()=>{
  const d=fixture(),e=env({...d,settings:{...d.settings,calories:2000}}),draft={source:d.recipes[0],raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))};draft.raw.ingredients='bad';
  const w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid});await assert.rejects(w.save(draft));assert.equal(e.writes,0);draft.raw.ingredients='1 | g | Gà';await w.save(draft);assert.equal(e.data.settings.calories,2000);
  const collision=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:()=> 'r1'});await assert.rejects(collision.save({...draft}));assert.equal(e.writes,1);
});
test('cooking base/smaller/larger/fractional targets use canonical ingredient and batch scaling',()=>{
  const r=recipe();for(const target of [4,2,8,1.5]){const preview=book.cookingPreview(r,target);assert.equal(preview.recipe.ingredients[0].quantity,400*target/4);assert.equal(preview.totals.calories,300*target);assert.equal(preview.recipe.nutritionPerServing.calories,300);assert.equal(preview.recipe.nutritionPerServing.fat,0);assert.deepEqual(preview.recipe.steps,r.steps);}
});
test('invalid cooking targets reject, source and prose/order unchanged; no stale preview returned',()=>{
  const r=recipe(),before=structuredClone(r);for(const target of ['', ' ',null,undefined,0,-1,101,Infinity,'oops'])assert.throws(()=>book.cookingPreview(r,target));assert.deepEqual(r,before);
});
test('cooking unknown nutrition stays null and empty steps stay neutral readable data',()=>{
  const preview=book.cookingPreview({...recipe(),nutritionPerServing:null,steps:[]},2);assert.equal(preview.totals,null);assert.deepEqual(preview.recipe.steps,[]);
});
test('new duplicate enters6A library/recent/logging with correct snapshot and default1',async()=>{
  const d=fixture(),e=env(d),w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid});const next=await w.save({source:d.recipes[0],raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))}),copy=next.recipes[2];
  const selected=selectNutritionRow([],next,'recipe',copy.id);assert.equal(selected[0].servings,'1');const request=reviewNutritionBatch(next,{date:'2026-09-20',meal:'Dinner',rows:selected}),logged=buildNutritionBatch(next,request,uuid);next.entries.push(...logged);
  assert.equal(logged[0].foodId,`recipe:${copy.id}`);assert.equal(logged[0].food.calories,300);assert.ok(recentNutritionChoices(next,'Dinner').some(x=>x.sourceId===copy.id));assert.equal(daySummary(next,[],'2026-09-20').nutrition.totals.calories,300);
});
test('deleted duplicate retains logged snapshots/MyDay and selective-copy behavior',async()=>{
  const d=fixture(),e=env(d),w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid});const next=await w.save({source:d.recipes[0],raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))}),copy=next.recipes[2];
  const saved=buildNutritionBatch(next,reviewNutritionBatch(next,{date:'2026-09-20',meal:'Dinner',rows:selectNutritionRow([],next,'recipe',copy.id)}),uuid)[0];next.entries.push(saved);next.recipes.pop();
  assert.equal(dailyTotals(next.entries,'2026-09-20').calories,300);const copied=buildNutritionBatch(next,reviewNutritionBatch(next,{date:'2026-09-21',meal:'Lunch',rows:selectCopyRow([],next,saved.id)}),uuid);assert.equal(copied[0].food.calories,300);assert.equal(daySummary(next,[],'2026-09-20').nutrition.itemCount,1);
});
test('schema8 original/copy/original-log/copy-log/deleted-source backup restores deeply',async()=>{
  const d=fixture(),e=env(d),w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid});const next=await w.save({source:d.recipes[0],raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))});
  next.entries.push(...buildNutritionBatch(next,reviewNutritionBatch(next,{date:'2026-09-20',meal:'Dinner',rows:selectNutritionRow([],next,'recipe',next.recipes[2].id)}),uuid));
  next.entries.push({...structuredClone(next.entries[0]),id:'deleted-log',foodId:'recipe:deleted'});const parsed=parseBackup(createBackup(next)).data,target=emptyData();restoreBackupData(target,parsed,JSON.stringify(target));assert.deepEqual(target,next);assert.equal(target.schemaVersion,8);assert.equal(Object.keys(target).some(x=>/cooking|search|cookbook/i.test(x)),false);
});
test('duplicate photo ownership is not cloned or reassociated',()=>{
  const photos=[{id:'p1',ownerType:'recipe',ownerId:'r1',blob:'bytes',thumbnail:'thumb'}],before=structuredClone(photos);const copy={...book.duplicateRecipeDefinition(recipe()),id:'new'};assert.deepEqual(ownedPhotos(photos,'recipe',copy.id),[]);assert.equal(ownedPhotos(photos,'recipe','r1').length,1);assert.deepEqual(photos,before);
});
test('unchanged duplicate preserves schema8-valid multiline steps, comma tags and ingredient separators',async()=>{
  const d=fixture();d.recipes[0].steps=['Rửa\nrồi nấu','Ăn'];d.recipes[0].tags=['Nhanh, dễ'];d.recipes[0].ingredients[0].name='Gà | theo nhãn\nnguyên liệu';
  createBackup(d);const e=env(d),w=book.createRecipeDuplicateWriter({write:c=>updateData(e.storage,e.locks,c),createId:uuid});
  const result=await w.save({source:d.recipes[0],raw:book.recipeFormValues(book.duplicateRecipeDefinition(d.recipes[0]))});
  assert.deepEqual(result.recipes[2].steps,d.recipes[0].steps);assert.deepEqual(result.recipes[2].tags,d.recipes[0].tags);assert.deepEqual(result.recipes[2].ingredients,d.recipes[0].ingredients);
});
