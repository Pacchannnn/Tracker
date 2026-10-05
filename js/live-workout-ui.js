import { createExercisePicker } from './exercise-picker-ui.js?v=26';
import { libraryExercises } from './custom-workout.js?v=26';
import { liveStructureAllowed, activeNeighbor, reviewLiveExercise } from './session-structure.js?v=26';
import { validateSet } from './data.js?v=26';

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
            if (review?.sessionId === getData().draft?.id) review.baseline = structuredClone(getData().draft);
            dialog.close(); render(); message('Đã lưu hiệp. Duyệt lại và chọn thao tác thêm/bỏ/di chuyển một lần nữa; chưa thay đổi cấu trúc.');
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
    if (!review.accepted.has(exercise.id)) review.accepted.set(exercise.id, reviewLiveExercise(exercise, getData()));
    const accepted = review.accepted.get(exercise.id), raw = accepted.prescription;
    const box = div('form-grid', h3(`Thông số · ${accepted.definition.name}`), p('Mặc định có thể chỉnh; không phải thông số lấy từ MASTER_PLAN. Không chọn tạ tự động.', 'hint'));
    for (const [label,name,options] of [
      ['Số hiệp','sets',{type:'number',min:1,max:20,step:1,required:true}], ['Reps tối thiểu','repMin',{type:'number',min:1,max:100,step:1,required:true}],
      ['Reps tối đa','repMax',{type:'number',min:1,max:100,step:1,required:true}], ['RIR mục tiêu','targetRIR',{required:true}],
      ['Nghỉ (giây)','restSeconds',{type:'number',min:0,max:1800,step:1,required:true}], ['Ghi chú bài','notes',{tag:'textarea'}]
    ]) { const wrapper = field(label,name,raw[name],options); wrapper.querySelector('input,textarea').addEventListener('input', event => raw[name] = event.target.value); box.append(wrapper); }
    box.append(p(`Setup đã duyệt: ${accepted.setupNote || 'Chưa có ghi chú riêng'}`, 'hint')); return box;
  }
  function openAdd(trigger) {
    const draft = getData().draft;
    if (!liveStructureAllowed(draft, getData().sessions) || pendingWrite()) return;
    if (review) { review.picker.focus(); return; }
    review = { sessionId: draft.id, baseline: structuredClone(draft), accepted: new Map(), picker: null };
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
  function header(draft) {
    if (!liveStructureAllowed(draft,getData().sessions)) { review=null; return null; }
    if (review?.sessionId !== draft.id) review=null;
    const add = button('Thêm bài', event=>openAdd(event.currentTarget), 'primary'); add.dataset.liveAdd='';
    const box=panel(h2('Chỉ thay đổi buổi hôm nay'), p('Thêm, bỏ hoặc đổi thứ tự bài chỉ áp dụng buổi đang tập; kế hoạch nguồn giữ nguyên.', 'hint'),add);
    if (!draft.sessionStructure.slots.some(slot=>slot.status==='active')) box.append(p('Không còn bài đang tập. Thêm bài để tiếp tục; có thể hoàn thành nếu đã ghi ít nhất một hiệp.', 'empty'));
    return box;
  }
  function controls(draft,slot) {
    if (!liveStructureAllowed(draft,getData().sessions) || slot.status!=='active') return null;
    const row=div('actions'); row.dataset.liveSlot=slot.id;
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
  return { header, controls, appendReview(){ if(review)main.append(review.picker.element); }, reset(){review=null;} };
}
