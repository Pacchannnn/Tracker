import { createExercisePicker } from './exercise-picker-ui.js?v=30';
import { libraryExercises } from './custom-workout.js?v=30';
import { liveStructureAllowed, activeNeighbor, reviewLiveExercise, reviewReplacement, replacementRemaining } from './session-structure.js?v=30';
import { validateSet } from './data.js?v=30';

export function createLiveWorkoutUI({ main, getData, command, render, dirtyForms, saveForms, pendingWrite, focusSlot, helpers }) {
  const { node, button, panel, div, p, h2, h3, field, confirmAction, message } = helpers;
  let review = null;
  function focus(id, action = 'remove') {
    const row = main.querySelector(`[data-live-slot="${id}"]`);
    const preferred = row?.querySelector(`[data-live-action="${action}"]`);
    (preferred && !preferred.disabled ? preferred : row?.querySelector('button:not(:disabled)'))?.focus();
  }
  async function dirtyGate(trigger) {
    if (pendingWrite()) return false;
    const forms = dirtyForms();
    if (!forms.length) return true;
    if (forms.some(form => !form.hasAttribute('data-workout-set-form'))) {
      message('Lưu hoặc hủy phần ngày/ghi chú đang sửa trước khi thay đổi bài. Phần nhập vẫn được giữ.', true); return false;
    }
    const valid = forms.every(form => { try { validateSet(Object.fromEntries(new FormData(form))); return form.checkValidity(); } catch { return false; } });
    return new Promise(resolve => {
      const dialog = node('dialog', {}, [h2('Có hiệp chưa lưu'), p(valid ? 'Quay lại để sửa, lưu hiệp trước rồi duyệt lại thay đổi bài, hoặc bỏ phần nhập chưa lưu.' : 'Hiệp đang nhập chưa hợp lệ. Quay lại để sửa hoặc chủ động bỏ phần nhập; không tự đổi thành giá trị mặc định.')]);
      let result = false, saving = false;
      const back = button('Quay lại', () => dialog.close());
      const discard = button('Bỏ phần nhập chưa lưu', () => {
        forms.forEach(form => form.querySelectorAll('input,select').forEach(input => { if (input.dataset.initialValue !== undefined) input.value = input.dataset.initialValue; }));
        result = true; dialog.close();
      }, 'danger');
      const actions = div('actions', back);
      if (valid) actions.append(button('Lưu hiệp', async () => {
        if (saving) return; saving = true; dialog.querySelectorAll('button').forEach(item => item.disabled = true);
        try {
          if (await saveForms(forms)) {
            if (review?.sessionId === getData().draft?.id) {
              if (review.mode === 'replace') review.needsReview = true;
              else review.baseline = structuredClone(getData().draft);
            }
            dialog.close(); render(); message('Đã lưu hiệp. Duyệt lại phần còn lại và chọn thao tác cấu trúc một lần nữa; chưa thay đổi bài.');
          } else { saving = false; dialog.querySelectorAll('button').forEach(item => item.disabled = false); }
        } catch (error) { message(error.message, true); saving = false; dialog.querySelectorAll('button').forEach(item => item.disabled = false); }
      }, 'primary'));
      actions.append(discard); dialog.append(actions);
      dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
      dialog.addEventListener('close', () => {
        dialog.remove();
        if (!result) {
          if (trigger?.isConnected) trigger.focus();
          else if (review) review.picker.focus();
          else main.querySelector('[data-live-add]')?.focus();
        }
        resolve(result);
      }, { once: true });
      document.body.append(dialog); dialog.showModal(); back.focus();
    });
  }
  function prescription(exercise) {
    const replacing = review.mode === 'replace';
    if (!review.accepted.has(exercise.id)) review.accepted.set(exercise.id, replacing ? reviewReplacement(exercise, { ...getData(), draft: review.baseline }, review.source) : reviewLiveExercise(exercise, getData()));
    const accepted = review.accepted.get(exercise.id), raw = accepted.prescription;
    const box = div('form-grid', h3(`Thông số · ${accepted.definition.name}`));
    const budget = p('', 'summary');
    const updateBudget = () => { budget.textContent = Number(raw.sets) === review.remaining ? `${review.remaining} hiệp còn lại theo snapshot đã duyệt.` : `${raw.sets || 'Chưa nhập'} hiệp mới · nguồn còn ${review.remaining} hiệp; đây là số hiệp mới bạn đang duyệt.`; };
    if (replacing) {
      box.append(p(`${review.source.snapshot.name} → ${accepted.definition.name} · Giữ ${review.baseline.sets.filter(set=>set.slotId===review.source.id).length}/${review.source.snapshot.sets} hiệp đã ghi · còn ${review.remaining} hiệp.`, 'summary'), budget,
        p(`Setup cũ (chỉ xem): ${review.source.snapshot.setupNote || 'Chưa ghi'}. Kỹ thuật cũ: ${review.source.snapshot.notes || 'Chưa ghi'}. Bài mới dùng notes/setup riêng; không copy tạ hoặc kết quả hiệp cũ.`, 'hint'));
      updateBudget();
    } else box.append(p('Mặc định có thể chỉnh; không phải thông số lấy từ MASTER_PLAN. Không chọn tạ tự động.', 'hint'));
    const fields = replacing ? [
      ['Số hiệp mới','sets',{type:'number',min:1,max:20,step:1,required:true}], ['Reps theo snapshot (có thể chỉnh)','reps',{required:true}],
      ['RIR mục tiêu','rir',{required:true}], ['Nghỉ theo snapshot (có thể chỉnh)','rest',{required:true}], ['Ghi chú bài','notes',{tag:'textarea'}]
    ] : [
      ['Số hiệp','sets',{type:'number',min:1,max:20,step:1,required:true}], ['Reps tối thiểu','repMin',{type:'number',min:1,max:100,step:1,required:true}],
      ['Reps tối đa','repMax',{type:'number',min:1,max:100,step:1,required:true}], ['RIR mục tiêu','targetRIR',{required:true}],
      ['Nghỉ (giây)','restSeconds',{type:'number',min:0,max:1800,step:1,required:true}], ['Ghi chú bài','notes',{tag:'textarea'}]
    ];
    for (const [label,name,options] of fields) { const wrapper = field(label,name,raw[name],options); wrapper.querySelector('input,textarea').addEventListener('input', event => { raw[name] = event.target.value; if(replacing)updateBudget(); }); box.append(wrapper); }
    if(replacing)box.append(p('Reps: 8–12 hoặc 6–10 mỗi bên. Nghỉ: 90 giây hoặc 60–90 giây / 2 phút. Giá trị chưa định nghĩa giữ nguyên; không tự bịa.', 'hint'));
    box.append(p(`Setup đã duyệt: ${accepted.setupNote || 'Chưa có ghi chú riêng'}`, 'hint')); return box;
  }
  function openAdd(trigger) {
    const draft = getData().draft;
    if (!liveStructureAllowed(draft, getData().sessions) || pendingWrite()) return;
    if (review) { review.picker.focus(); return; }
    review = { mode:'add', sessionId: draft.id, baseline: structuredClone(draft), accepted: new Map(), picker: null };
    review.picker = createExercisePicker({ mode:'add', catalog:()=>libraryExercises(getData().customExercises),
      day:{exercises:draft.sessionStructure.slots.filter(slot=>slot.status==='active')}, renderReview:prescription,
      contextText:'Chỉ thay đổi buổi hôm nay. Lựa chọn và thông số chưa được lưu; Confirm mới thêm vào buổi đang tập. Hủy/rời trang sẽ bỏ review này.', helpers,
      onClose:()=>{ if(pendingWrite())return; review.picker.element.remove();review=null; main.querySelector('[data-live-add]')?.focus(); },
      onConfirm:async ids=>{
        if (!await dirtyGate(trigger)) return 'review';
        const intent = { type:'add', candidates:ids.map(id=>structuredClone(review.accepted.get(id))) };
        const baseline = structuredClone(review.baseline);
        if (!await command(intent,baseline,'Đã thêm bài vào buổi hôm nay.')) return false;
        review=null;render();main.querySelector('[data-live-add]')?.focus(); return true;
      } });
    main.append(review.picker.element); review.picker.focus();
  }
  function openReplace(draft, source) {
    if (!liveStructureAllowed(draft,getData().sessions) || source.status !== 'active' || !replacementRemaining(draft,source) || pendingWrite()) return;
    if(review){review.picker.focus();message('Hủy review đang mở trước khi chọn một thay đổi khác.',true);return;}
    review = { mode:'replace', sessionId:draft.id, baseline:structuredClone(draft), source:structuredClone(source), remaining:replacementRemaining(draft,source), accepted:new Map(), picker:null, needsReview:false };
    review.picker = createExercisePicker({ mode:'replace',liveReplace:true,catalog:()=>libraryExercises(getData().customExercises),day:{exercises:draft.sessionStructure.slots.filter(slot=>slot.status==='active')},
      slot:{exerciseId:source.exerciseId,name:source.snapshot.name},renderReview:prescription,helpers,
      contextText:`Chỉ buổi hôm nay · ${source.snapshot.name}: còn ${review.remaining}/${source.snapshot.sets} hiệp. Đóng mục cũ + tạo mục mới; giữ nguyên mọi hiệp cũ. Confirm mới lưu.`,
      onClose:()=>{if(pendingWrite())return;review.picker.element.remove();review.recheckPanel?.remove();review=null;focus(source.id,'replace');},
      onConfirm:async ids=>{
        if(!await dirtyGate(null))return 'review';
        if(review.needsReview){message('Đã lưu thêm hiệp: dùng Duyệt lại phần còn lại trước khi Confirm Replace.',true);return 'review';}
        if(ids.length!==1)throw new Error('Chọn đúng một bài để thay.');
        if(!await command({type:'replace',slotId:source.id,candidate:structuredClone(review.accepted.get(ids[0]))},review.baseline,'Đã đổi phần còn lại; giữ mọi hiệp cũ.'))return false;
        const successor=getData().draft.sessionStructure.slots.find(slot=>slot.replacesSlotId===source.id);
        review=null;focusSlot(successor.id);render();
        main.querySelector(`[data-live-slot="${successor.id}"]`)?.parentElement.querySelector('form input')?.focus();return true;
      } });
    main.append(review.picker.element);review.picker.focus();
  }
  function header(draft) {
    if (!liveStructureAllowed(draft,getData().sessions)) { review=null; return null; }
    if (review?.sessionId !== draft.id) review=null;
    const add = button('Thêm bài', event=>openAdd(event.currentTarget), 'primary'); add.dataset.liveAdd='';
    const box=panel(h2('Chỉ thay đổi buổi hôm nay'), p('Thêm, bỏ, thay bài hoặc đổi thứ tự chỉ áp dụng buổi đang tập; kế hoạch nguồn giữ nguyên.', 'hint'),add);
    if (!draft.sessionStructure.slots.some(slot=>slot.status==='active')) box.append(p('Không còn bài đang tập. Thêm bài để tiếp tục; có thể hoàn thành nếu đã ghi ít nhất một hiệp.', 'empty'));
    return box;
  }
  function controls(draft,slot) {
    if (!liveStructureAllowed(draft,getData().sessions) || slot.status!=='active') return null;
    const row=div('actions'); row.dataset.liveSlot=slot.id;
    const remaining = replacementRemaining(draft,slot);
    const replace = button('Đổi phần còn lại',async event=>{ if(!await dirtyGate(event.currentTarget))return;openReplace(draft,slot); });
    replace.dataset.liveAction='replace';replace.setAttribute('aria-label',`Đổi phần còn lại · ${slot.snapshot.name}`);replace.disabled=!remaining;
    row.append(replace);
    if(!remaining)row.append(p('Đã ghi đủ hiệp; dùng Thêm bài nếu muốn tập thêm.','hint'));
    const remove=button('Bỏ bài',async event=>{
      if(!await dirtyGate(event.currentTarget))return;
      const count=draft.sets.filter(set=>set.slotId===slot.id).length;
      confirmAction(`${slot.snapshot.name}: ${count ? `Giữ ${count} hiệp đã ghi, bỏ phần chưa tập.` : 'Bỏ bài khỏi buổi hôm nay?'} Không đổi kế hoạch nguồn.`,async()=>{
        if(await command({type:'remove',slotId:slot.id},draft,'Đã dừng bài; giữ mọi hiệp đã ghi.')) { focusSlot(null);render(); main.querySelector('[data-live-add]')?.focus(); }
      });
    });remove.dataset.liveAction='remove';row.append(remove);
    for(const [direction,label] of [['up','Di chuyển lên'],['down','Di chuyển xuống']]){
      const move=button(label,async event=>{if(!await dirtyGate(event.currentTarget))return;
        if(await command({type:'reorder',slotId:slot.id,direction},draft,'Đã đổi thứ tự bài trong buổi hôm nay.'))focus(slot.id,direction);
      }); move.dataset.liveAction=direction;move.setAttribute('aria-label',`${label} · ${slot.snapshot.name}`);move.disabled=!activeNeighbor(draft,slot.id,direction);row.append(move);
    }
    return row;
  }
  return { header, controls, appendReview(){ if(review){
    main.append(review.picker.element);
    if(review.needsReview){review.recheckPanel=panel(p('Đã lưu hiệp: remaining/baseline review cũ không còn dùng được. Duyệt lại sẽ mở review mới với mặc định theo phần còn lại; giữ/copy thông số đang nhập nếu cần.','warning'),button('Duyệt lại phần còn lại',()=>{
      const sourceId=review.source.id,draft=getData().draft,source=draft?.sessionStructure.slots.find(slot=>slot.id===sourceId);
      review=null;render();if(source&&replacementRemaining(draft,source))openReplace(draft,source);else message('Đã ghi đủ hiệp; dùng Thêm bài nếu muốn tập thêm.');
    }));main.append(review.recheckPanel);}
  } }, reset(){review=null;} };
}
