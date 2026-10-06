import { dailyTotals, validateEntry, localDate } from './data.js?v=31';
import { searchFoods } from './nutrition.js?v=31';
import { nutritionChoice, recentNutritionChoices, selectNutritionRow, selectCopyRow, reviewNutritionBatch, createNutritionBatchWriter } from './nutrition-batch.js?v=31';

const meals = ['Breakfast','Lunch','Snack','Dinner','Custom'];
export function createNutritionBatchUI({ main, getData, getLatest, write, acceptData, render, onSaved, helpers }) {
  const { node, button, field, panel, div, p, h2, h3, fmt, id } = helpers;
  const writer = createNutritionBatchWriter({write,createId:id});
  let state = null, busy = false, error = '';
  const focus = element => { if (element) { element.focus(); element.scrollIntoView({block:'center'}); } };
  function refresh(selector) { render(); if(selector) focus(main.querySelector(selector)); }
  function start(mode,date) {
    if(busy) return;
    const previous = new Date(`${date}T12:00:00`); previous.setDate(previous.getDate()-1);
    state={mode,date,meal:mode==='copy' ? null : 'Breakfast',sourceDate:localDate(previous),sourceMeal:'',query:'',filter:'all',rows:[],review:null};
    error=''; refresh('.nutrition-batch input');
  }
  function renderBatch(date) {
    if(!state) {
      const add=button('Thêm nhiều món',()=>start('add',date),'primary'); add.dataset.batchLaunch='true';
      main.append(panel(h2('Ghi bữa nhanh'),p('Chọn nhiều món hoặc chọn món từ nhật ký cũ, duyệt lượng rồi lưu một lần.','hint'),
        div('actions',add,button('Sao chép có chọn món',()=>start('copy',date)))));
      return;
    }
    const box=panel(h2(state.mode==='copy' ? 'Sao chép có chọn món' : 'Thêm nhiều món'));
    box.classList.add('nutrition-batch'); main.append(box);
    const feedback=p(error,error ? 'notice error' : 'hint'); feedback.setAttribute('role','alert'); feedback.setAttribute('tabindex','-1'); box.append(feedback);
    const cancel=button('Hủy batch',()=>{if(!busy){state=null;error='';refresh();focus(main.querySelector('button[data-batch-launch]'));}});
    if(state.review) renderReview(box,cancel,feedback); else renderChoices(box,cancel,feedback);
    if(busy) box.querySelectorAll('button,input,select').forEach(control=>control.disabled=true);
  }
  function renderChoices(box,cancel,feedback) {
    const date=field('Ngày đích','batchDate',state.date,{type:'date',required:true});
    const meal=field('Bữa đích','batchMeal',state.meal??'source',{tag:'select',choices:[...(state.mode==='copy' ? [{value:'source',label:'Giữ bữa từng món nguồn'}] : []),...meals]});
    date.querySelector('input').addEventListener('change',event=>{state.date=event.target.value;});
    meal.querySelector('select').addEventListener('change',event=>{state.meal=event.target.value==='source' ? null : event.target.value; updateChoices();});
    box.append(div('form-grid',date,meal));
    const selectedCount=p('','summary'); selectedCount.setAttribute('role','status');
    const selected=div('batch-selected'), recent=div('batch-recent'), results=div('batch-choices');
    const review=button('Review batch',()=>{
      try { state.review=reviewNutritionBatch(getLatest(),state); error=''; refresh('.batch-review input'); }
      catch(problem){error=problem.message;feedback.textContent=error;feedback.className='notice error';focus(feedback);}
    },'primary');
    if(state.mode==='copy') {
      const sourceDate=field('Ngày nguồn','copyDate',state.sourceDate,{type:'date'});
      const sourceMeal=field('Bữa nguồn','copyMeal',state.sourceMeal,{tag:'select',choices:[{value:'',label:'Tất cả bữa'},...meals]});
      sourceDate.querySelector('input').addEventListener('change',event=>{state.sourceDate=event.target.value;updateChoices();});
      sourceMeal.querySelector('select').addEventListener('change',event=>{state.sourceMeal=event.target.value;updateChoices();});
      box.append(h3('Chọn bản ghi nguồn'),div('form-grid',sourceDate,sourceMeal),p('Copy giữ snapshot đã ghi, kể cả nguồn thư viện đã xóa. Món đích đang có sẽ được giữ.','hint'));
    }
    const search=field('Tìm món cho batch','batchSearch',state.query,{type:'search'});
    const filter=field('Loại món','batchType',state.filter,{tag:'select',choices:[{value:'all',label:'Tất cả'},{value:'food',label:'Thực phẩm'},{value:'recipe',label:'Công thức'}]});
    const clear=button('Xóa tìm kiếm',()=>{state.query='';search.querySelector('input').value='';updateChoices();focus(search.querySelector('input'));});
    search.querySelector('input').addEventListener('input',event=>{state.query=event.target.value;updateChoices();});
    filter.querySelector('select').addEventListener('change',event=>{state.filter=event.target.value;updateChoices();});
    box.append(selectedCount,selected);
    if(state.mode==='add') box.append(h3('Gần đây theo bữa'),p('Ưu tiên bữa đang chọn; món từ bữa khác được ghi rõ. Lượng mặc định1 khẩu phần.','hint'),recent);
    box.append(div('form-grid',search,...(state.mode==='add' ? [filter] : [])),clear,results,div('actions',review,cancel));
    function toggle(choice,origin) {
      if(busy) return;
      try {
        state.rows=state.rows.some(row=>row.key===choice.key) ? state.rows.filter(row=>row.key!==choice.key) :
          choice.type==='copy' ? selectCopyRow(state.rows,getLatest(),choice.sourceId) : selectNutritionRow(state.rows,getLatest(),choice.type,choice.sourceId);
        error='';feedback.textContent='';updateChoices();
        const matching=[...origin.querySelectorAll('[data-choice]')].find(control=>control.dataset.choice===choice.key); focus(matching);
      } catch(problem){feedback.textContent=problem.message;}
    }
    function choiceButton(choice) {
      const chosen=state.rows.some(row=>row.key===choice.key);
      const control=button(`${chosen?'Bỏ chọn':'Chọn'} ${choice.name}`,()=>toggle(choice,control.parentElement.parentElement));
      control.dataset.choice=choice.key; control.setAttribute('aria-pressed',String(chosen));
      control.disabled=choice.selectable===false;
      return div('batch-choice',control,p(`${choice.type==='recipe'?'Công thức':choice.type==='copy'?'Bản ghi':'Thực phẩm'}${choice.group==='meal'?' · cùng bữa':choice.group==='global'?' · bữa khác':''}${choice.date?` · ${choice.date}`:''}${choice.reason?` · ${choice.reason}`:''}`,'hint'));
    }
    function updateChoices() {
      selectedCount.textContent=`Đã chọn ${state.rows.length} món`; review.disabled=!state.rows.length;
      selected.replaceChildren(...state.rows.map(row=>p(`${row.name} · ${row.servings} khẩu phần`,'hint')));
      recent.replaceChildren(); results.replaceChildren();
      const data=getData();
      if(state.mode==='add') {
        const choices=recentNutritionChoices(data,state.meal);
        recent.append(...choices.map(choiceButton));
        if(!choices.length) recent.append(p('Chưa có món dùng gần đây; tìm trong thư viện bên dưới.','hint'));
        const library=[...data.foods.map(item=>({...item,type:'food',sourceId:item.id})),...data.recipes.map(item=>({...item,id:`recipe:${item.id}`,type:'recipe',sourceId:item.id}))];
        const matches=searchFoods(library,data.entries,state.query).filter(item=>state.filter==='all'||item.type===state.filter);
        results.append(...matches.map(item=>choiceButton(nutritionChoice(data,item.type,item.sourceId))));
        if(!matches.length) results.append(p('Không tìm thấy món phù hợp.','empty'));
      } else {
        const source=data.entries.filter(item=>item.date===state.sourceDate&&(!state.sourceMeal||item.meal===state.sourceMeal));
        const matches=searchFoods(source.map(item=>({id:item.id,name:item.food.name,entry:item})),[],state.query);
        for(const item of matches) {
          let reason='';try{selectCopyRow([],data,item.id);}catch(problem){reason=problem.message;}
          results.append(choiceButton({key:`copy:${item.id}`,type:'copy',sourceId:item.id,name:item.name,date:item.entry.date,selectable:!reason,reason:`${item.entry.meal} · ${item.entry.servings} × ${item.entry.food.serving}${reason?` · ${reason}`:''}`}));
        }
        if(!matches.length) results.append(p('Không có bản ghi phù hợp ở ngày/bữa nguồn.','empty'));
      }
    }
    updateChoices();
  }
  function renderReview(box,cancel,feedback) {
    const review=state.review;
    box.append(p(`Review ${review.rows.length} món → ${review.date} · ${review.meal??'Giữ bữa nguồn'}`,'summary'));
    const rowsHost=div('batch-review'); box.append(rowsHost);
    review.rows.forEach((row,index)=>{
      const meal=review.meal??row.baseline.meal;
      const amount=field(`Số khẩu phần — ${index+1}. ${row.name}`,'batchAmount'+index,row.servings,{type:'number',min:'0.01',max:'100',step:'any',required:true});
      const preview=p('','hint'); preview.setAttribute('role','status');
      const updatePreview=()=>{
        try {
          const entry=validateEntry({date:review.date,meal,servings:row.servings});
          const totals=dailyTotals([{...entry,food:row.food}],review.date);
          preview.textContent=`${fmt(totals.calories)} kcal · P ${fmt(totals.protein)} · C ${fmt(totals.carbs)} · F ${fmt(totals.fat)}`;
          amount.querySelector('input').removeAttribute('aria-invalid');
        }catch(problem){preview.textContent=problem.message;amount.querySelector('input').setAttribute('aria-invalid','true');}
      };
      amount.querySelector('input').addEventListener('input',event=>{row.servings=event.target.value;state.rows.find(item=>item.key===row.key).servings=event.target.value;updatePreview();});
      const remove=button(`Bỏ ${row.name} khỏi batch`,()=>{
        if(busy)return;
        state.rows=state.rows.filter(item=>item.key!==row.key); review.rows=review.rows.filter(item=>item.key!==row.key);
        error='';
        if(!review.rows.length) state.review=null;
        render(); const inputs=main.querySelectorAll('.batch-review input');focus(inputs[Math.min(index,inputs.length-1)]||main.querySelector('.nutrition-batch input'));
      });
      rowsHost.append(div('list-card',h3(`${index+1}. ${row.name}`),p(`${row.type==='copy'?'Snapshot đã ghi':row.type==='recipe'?'Công thức':'Thực phẩm'} · ${meal} · ${row.food.serving}`,'hint'),amount,preview,remove));updatePreview();
    });
    const back=button('Quay lại chọn món',()=>{if(!busy){state.review=null;error='';refresh('.nutrition-batch input');}});
    const save=button(`Thêm ${review.rows.length} món`,async()=>{
      if(busy)return;
      busy=true;box.querySelectorAll('button,input,select').forEach(control=>control.disabled=true);save.textContent='Đang lưu…';
      try {
        const next=await writer.commit(review);acceptData(next);const destination=review.date,count=review.rows.length;
        state=null;error='';busy=false;onSaved(destination,count);
      } catch(problem) {
        busy=false;error=problem.message;render();focus(main.querySelector('.nutrition-batch .notice'));
      }
    },'primary');
    box.append(div('actions',save,back,cancel));
    feedback.setAttribute('tabindex','-1');
  }
  return {render:renderBatch};
}
