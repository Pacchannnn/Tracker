import { ensureUnchanged } from './data.js?v=40';
import { validateRecipe, scaleRecipe, recipeTotals } from './nutrition.js?v=40';

export function normalizeRecipeText(value) {
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLocaleLowerCase('vi').trim().replace(/\s+/g,' ');
}
export function recipeTagOptions(recipes) {
  const tags=new Map();
  for(const recipe of recipes) for(const tag of recipe.tags??[]) {const key=normalizeRecipeText(tag);if(key&&!tags.has(key))tags.set(key,tag);}
  return [...tags.values()];
}
export function searchRecipes(recipes,{query='',tags=[]}={}) {
  const term=normalizeRecipeText(query),keys=tags.map(normalizeRecipeText).filter(Boolean);
  return recipes.filter(recipe=>(!term||[recipe.name,...(recipe.tags??[]),...(recipe.ingredients??[]).map(item=>item.name)].some(value=>normalizeRecipeText(value).includes(term)))&&
    keys.every(key=>(recipe.tags??[]).some(tag=>normalizeRecipeText(tag)===key)));
}
export function duplicateRecipeDefinition(source) {
  const copy=structuredClone(Object.fromEntries(['name','description','servings','ingredients','steps','tags','notes','nutritionPerServing'].map(key=>[key,source[key]])));
  copy.name=`${source.name} — Bản sao`;return copy;
}
export function recipeFormValues(source) {
  return {name:source?.name??'',description:source?.description??'',servings:source?.servings??1,
    ingredients:source?.ingredients.map(item=>`${item.quantity} | ${item.unit} | ${item.name}`).join('\n')??'',
    steps:source?.steps.join('\n')??'',tags:source?.tags.join(', ')??'',notes:source?.notes??'',
    ...Object.fromEntries(['calories','protein','carbs','fat'].map(key=>[key,source?.nutritionPerServing?.[key]??'']))};
}
export function cookingPreview(recipe,targetServings) {
  const preview=scaleRecipe(recipe,targetServings);return {recipe:preview,totals:recipeTotals(preview)};
}
function validatedDuplicate(request) {
  const initial=recipeFormValues(duplicateRecipeDefinition(request.source)),raw={...request.raw};
  // Preserve accepted structured fields when their lossy text editor representation was not changed.
  for(const key of ['ingredients','steps','tags']) if(raw[key]===initial[key])raw[key]=structuredClone(request.source[key]);
  const definition=validateRecipe(raw);
  for(const key of ['description','notes'])if(raw[key]===initial[key])definition[key]=request.source[key];
  return definition;
}
export function createRecipeDuplicateWriter({write,createId}) {
  let saving=false;const accepted=new WeakSet();
  return {async save(draft){
    if(saving||accepted.has(draft))throw new Error('Bản sao đang lưu hoặc đã lưu; không nhân bản lần nữa.');
    const request=structuredClone(draft);validatedDuplicate(request);saving=true;
    try {
      const next=await write(data=>{
        ensureUnchanged(data.recipes.find(item=>item.id===request.source.id),request.source);
        const definition=validatedDuplicate(request),id=createId();
        if(typeof id!=='string'||!id||data.recipes.some(item=>item.id===id))throw new Error('Không tạo được ID công thức mới duy nhất.');
        data.recipes.push({id,...definition});
      });
      accepted.add(draft);return next;
    }finally{saving=false;}
  }};
}
