import { ensureUnchanged } from './data.js?v=36';
import { normalizeRecipeText,searchRecipes,recipeTagOptions,duplicateRecipeDefinition,recipeFormValues,cookingPreview,createRecipeDuplicateWriter } from './cookbook.js?v=36';

export function createCookbookUI({main,getData,getLatest,write,acceptData,render,onDuplicateStart,clearPhotoUrls,helpers}) {
  const {node,button,field,panel,div,p,h2,h3,fmt,id,message}=helpers;
  const filters={query:'',tags:[]};let draft=null,cooking=null,busy=false,duplicateError='';
  const writer=createRecipeDuplicateWriter({write,createId:id});
  const focus=el=>{if(el){el.focus();el.scrollIntoView({block:'center'});}};
  const findCard=recipeId=>[...main.querySelectorAll('[data-recipe-id]')].find(el=>el.dataset.recipeId===recipeId);
  function returnToCard(recipeId,action='cook') {
    acceptData(getLatest());render();const card=findCard(recipeId);
    if(card){card.open=true;focus(card.querySelector(`[data-recipe-action=${action}]`)||card.querySelector('[data-recipe-action=cook]')||card.querySelector('summary'));}
    else focus(main.querySelector('[name=recipeSearch]'));
  }
  function openDuplicate(source) {
    if(busy)return;
    try {ensureUnchanged(getLatest().recipes.find(item=>item.id===source.id),source);draft={source:structuredClone(source),raw:recipeFormValues(duplicateRecipeDefinition(source))};duplicateError='';onDuplicateStart();render();focus(main.querySelector('.recipe-editor [name=name]'));}
    catch(error){message(error.message,true);}
  }
  function cancelDuplicate(){if(busy)return;const sourceId=draft?.source.id;draft=null;duplicateError='';returnToCard(sourceId,'duplicate');}
  function bindDuplicateForm(form) {
    if(!draft)return;
    const error=p(duplicateError,'notice error');error.hidden=!duplicateError;error.setAttribute('role','alert');error.setAttribute('tabindex','-1');form.prepend(error);
    form.addEventListener('input',()=>{if(!busy)draft.raw=Object.fromEntries(new FormData(form));});
    form.append(button('Hủy bản sao',cancelDuplicate));
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;draft.raw=Object.fromEntries(new FormData(form));const current=draft;
      busy=true;form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=true);error.hidden=true;
      try {
        const next=await writer.save(current);const copyId=next.recipes.at(-1).id;acceptData(next);draft=null;busy=false;render();message('Đã lưu một bản sao công thức. Lịch sử và ảnh nguồn giữ nguyên.');
        const card=findCard(copyId);if(card){card.open=true;focus(card.querySelector('[data-recipe-action=cook]'));}else focus(main.querySelector('[name=recipeSearch]'));
      }catch(problem){
        busy=false;duplicateError=problem.message;
        if(main.querySelector('.recipe-editor')&&!form.isConnected){render();focus(main.querySelector('.recipe-editor [role=alert]'));}
        else if(form.isConnected){form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=false);error.hidden=false;error.textContent=duplicateError;focus(error);}
        else message(duplicateError,true);
      }
    });
    if(busy)form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=true);
  }
  function renderLibrary(box,renderCards) {
    const search=field('Tìm công thức','recipeSearch',filters.query,{type:'search'}),input=search.querySelector('input');
    const results=div('cookbook-results'),count=p('','hint');count.setAttribute('role','status');
    const clear=button('Xóa tìm kiếm và thẻ',()=>{filters.query='';filters.tags=[];input.value='';update();focus(input);});
    const tags=node('fieldset',{class:'cookbook-tags'},[node('legend',{text:'Lọc thẻ · phải có tất cả thẻ đã chọn'})]);
    const chipHost=div('tag-suggestions');tags.append(chipHost);
    const choices=recipeTagOptions(getData().recipes),buttons=[];
    for(const tag of [...new Map([...choices,...filters.tags].map(label=>[normalizeRecipeText(label),label])).values()]) {
      const chip=button(tag,()=>{const key=normalizeRecipeText(tag);filters.tags=filters.tags.some(label=>normalizeRecipeText(label)===key)?filters.tags.filter(label=>normalizeRecipeText(label)!==key):[...filters.tags,tag];update();chip.focus({preventScroll:true});});
      buttons.push([tag,chip]);chipHost.append(chip);
    }
    if(!choices.length&&!filters.tags.length)tags.hidden=true;
    input.addEventListener('input',()=>{filters.query=input.value;update();});
    box.append(h3('Sổ công thức'),search,clear,tags,count,results);
    function update(){
      for(const [tag,chip]of buttons)chip.setAttribute('aria-pressed',String(filters.tags.some(label=>normalizeRecipeText(label)===normalizeRecipeText(tag))));
      clear.disabled=!normalizeRecipeText(filters.query)&&!filters.tags.length;
      const recipes=searchRecipes(getData().recipes,filters);count.textContent=`${recipes.length} / ${getData().recipes.length} công thức${filters.tags.length?` · Thẻ (tất cả): ${filters.tags.join(' · ')}`:''}`;
      clearPhotoUrls();results.replaceChildren();if(!recipes.length)results.append(p(getData().recipes.length?'Không tìm thấy công thức phù hợp.':'Chưa có công thức nào.','empty'));
      renderCards(results,recipes);
    }
    update();
  }
  function openCooking(source) {
    try {ensureUnchanged(getLatest().recipes.find(item=>item.id===source.id),source);cooking={source:structuredClone(source),target:String(source.servings)};render();focus(main.querySelector('[name=cookingTarget]'));}
    catch(error){message(error.message,true);}
  }
  function renderCooking() {
    if(!cooking)return false;
    const state=cooking,box=panel(h2('Chế độ nấu'));box.classList.add('cooking-mode');main.append(box);
    const back=button('Quay lại công thức',()=>{cooking=null;returnToCard(state.source.id);});box.append(back);
    const current=getLatest().recipes.find(item=>item.id===state.source.id);
    if(!current){box.append(p('Công thức nguồn đã xóa. Quay lại thư viện để chọn công thức khác.','notice error'));return true;}
    box.append(h3(current.name),p('Lượng định nấu chỉ là preview; không phải số phần đã ăn và không tạo nhật ký ăn.','hint'));
    const target=field('Số phần định nấu','cookingTarget',state.target,{type:'number',min:'0.01',max:'100',step:'any'}),input=target.querySelector('input');
    const error=p('','notice error');error.setAttribute('role','alert');error.setAttribute('tabindex','-1');error.hidden=true;
    const ingredients=node('ul',{class:'history-list cooking-ingredients'}),steps=node('ol',{class:'history-list cooking-steps'}),macros=p('','summary'),notes=p('','hint');
    const log=button('Mở công thức để ghi ăn',()=>{cooking=null;returnToCard(state.source.id,'log');});log.disabled=!current.nutritionPerServing;
    box.append(target,button('Về lượng gốc',()=>{state.target=String(state.source.servings);input.value=state.target;update();focus(input);}),error,h3('Nguyên liệu'),ingredients,h3('Các bước'),steps,macros,notes,log);
    function update(){
      ingredients.replaceChildren();steps.replaceChildren();macros.textContent=notes.textContent='';
      try {
        ensureUnchanged(getLatest().recipes.find(item=>item.id===state.source.id),state.source);
        const preview=cookingPreview(state.source,state.target),r=preview.recipe;
        const format=new Intl.NumberFormat('vi-VN',{maximumSignificantDigits:6});
        for(const item of r.ingredients)ingredients.append(node('li',{text:`${format.format(item.quantity)} ${item.unit} · ${item.name}`}));
        for(const step of r.steps)steps.append(node('li',{text:step}));
        if(!r.steps.length)steps.append(node('li',{text:'Chưa có bước nấu được ghi.'}));
        const per=r.nutritionPerServing,total=preview.totals;
        macros.textContent=per?`Mỗi phần: ${fmt(per.calories)} kcal · P ${fmt(per.protein)} · C ${fmt(per.carbs)} · F ${fmt(per.fat)}. Lượng định nấu (${format.format(r.servings)} phần): ${fmt(total.calories)} kcal · P ${fmt(total.protein)} · C ${fmt(total.carbs)} · F ${fmt(total.fat)}.`:'Dinh dưỡng: DATA NOT DEFINED YET';
        notes.textContent=r.notes;error.hidden=true;input.removeAttribute('aria-invalid');
      }catch(problem){error.hidden=false;error.textContent=problem.message;input.setAttribute('aria-invalid','true');}
    }
    input.addEventListener('input',()=>{state.target=input.value;update();});update();return true;
  }
  return {renderLibrary,renderCooking,openDuplicate,openCooking,bindDuplicateForm,duplicateDraft:()=>draft,
    discardDuplicate:()=>{if(busy)return false;draft=null;return true;}};
}
