import { MUSCLES, PATTERNS, EQUIPMENT, labelFor, libraryExercises, validateExercise, validateSlot, moveSlot, removeCustomExercise, deletePlan, duplicatePlan, originalPlanCopy } from './custom-workout.js?v=34';
import { ensureUnchanged } from './data.js?v=34';
import { filterExercises, addPickedExercises, replacePickedExercise } from './exercise-picker.js?v=34';
import { createExercisePicker } from './exercise-picker-ui.js?v=34';
import { reviewedBuilderDay } from './planning-draft.js?v=34';

export function createGymBuilder(context) {
  const { main, getData, mutate, render, show, startWorkout, helpers, drafts, draftStatus, recoveryCard } = context;
  const { node, button, field, panel, div, p, h2, h3, id, message, confirmAction } = helpers;
  let editingExercise = null, editingPlanId = null, selectedDayId = null;
  let oneOff = null;
  let oneOffSource = null, recoveryWarning = '';
  const payload = () => ({ day: oneOff, source: oneOffSource });
  const persist = async () => {
    try { await drafts.save('builder', payload()); return true; }
    catch (error) { message(`Chưa lưu bản nháp: ${error.message}`, true); return false; }
  };

  function recovery() {
    if (oneOff) return false;
    return recoveryCard('builder', saved => {
      oneOff = structuredClone(saved.payload.day); oneOffSource = saved.payload.source;
      if (oneOffSource && JSON.stringify(getData().plans.find(plan => plan.id === oneOffSource.planId)) !== JSON.stringify(oneOffSource.plan)) {
        oneOffSource = null; recoveryWarning = 'Kế hoạch nguồn đã đổi hoặc bị xóa. Khôi phục thành buổi riêng; bạn có thể lưu thành kế hoạch mới.';
      }
      show('builder');
    }, () => { oneOff = null; oneOffSource = null; render(); });
  }

  function checkChoices(label, name, choices, selected = []) {
    const box = node('fieldset', { class: 'choice-fieldset' }, [node('legend', { text: label })]);
    const options = div('checkbox-options');
    for (const choice of choices) options.append(node('label', {}, [node('input', { type: 'checkbox', name, value: choice.value, checked: selected.includes(choice.value) ? '' : null }), node('span', { text: choice.label })]));
    box.append(options);
    return box;
  }

  function libraryView() {
    const data = getData();
    const editing = data.customExercises.find(item => item.id === editingExercise);
    const box = panel(h2('Thư viện bài tập'), p('Các bài gốc giữ nguyên định nghĩa trong Original Plan. Phân loại giúp tìm kiếm và so sánh mục đích; không xác nhận bài nào phù hợp y khoa với bạn.', 'hint'));
    const editor = node('details', { open: editing ? '' : null }, [node('summary', { text: editing ? 'Sửa bài custom' : 'Tạo bài custom' })]);
    const form = node('form', { class: 'journal-form' }, [field('Tên bài', 'name', editing?.name || '', { required: true }),
      checkChoices('Nhóm cơ chính', 'primaryMuscles', MUSCLES, editing?.primaryMuscles),
      checkChoices('Nhóm cơ phụ (tùy chọn)', 'secondaryMuscles', MUSCLES, editing?.secondaryMuscles),
      field('Pattern / kiểu chuyển động', 'movementPattern', editing?.movementPattern || 'other', { tag: 'select', choices: PATTERNS }),
      checkChoices('Nhóm dụng cụ', 'equipment', EQUIPMENT, editing?.equipment),
      field('Ghi chú kỹ thuật/setup', 'notes', editing?.notes || '', { tag: 'textarea' }),
      node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu bài custom' : 'Tạo bài custom' })]);
    if (editing) form.append(button('Hủy sửa', () => { editingExercise = null; render(); }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const fields = new FormData(form);
      const raw = { ...Object.fromEntries(fields), primaryMuscles: fields.getAll('primaryMuscles'), secondaryMuscles: fields.getAll('secondaryMuscles'), equipment: fields.getAll('equipment') };
      const done = await mutate(next => {
        const values = validateExercise(raw), now = new Date().toISOString();
        if (editing) {
          const index = next.customExercises.findIndex(item => item.id === editing.id);
          ensureUnchanged(next.customExercises[index], editing);
          next.customExercises[index] = { ...editing, ...values, updatedAt: now };
        } else next.customExercises.push({ id: id(), ...values, isCustom: true, archived: false, createdAt: now, updatedAt: now });
      }, 'Đã lưu bài custom. Các buổi/kế hoạch đã chụp tên bài vẫn giữ nguyên.');
      if (done) { editingExercise = null; render(); }
    });
    editor.append(form); box.append(editor);
    const filters = div('form-grid', field('Tìm bài', 'query'),
      field('Nhóm cơ', 'muscle', '', { tag: 'select', choices: [{ value: '', label: 'Tất cả' }, ...MUSCLES] }),
      field('Pattern', 'pattern', '', { tag: 'select', choices: [{ value: '', label: 'Tất cả' }, ...PATTERNS] }),
      field('Dụng cụ', 'tool', '', { tag: 'select', choices: [{ value: '', label: 'Tất cả' }, ...EQUIPMENT] }),
      field('Nguồn', 'source', 'all', { tag: 'select', choices: [{ value: 'all', label: 'Đang dùng' }, { value: 'builtin', label: 'Bài gốc' }, { value: 'custom', label: 'Custom' }, { value: 'archived', label: 'Đã ẩn' }] }));
    const results = div('library-results');
    const update = () => {
      results.replaceChildren();
      const query = filters.querySelector('[name=query]').value.trim().toLocaleLowerCase('vi');
      const muscle = filters.querySelector('[name=muscle]').value, pattern = filters.querySelector('[name=pattern]').value;
      const tool = filters.querySelector('[name=tool]').value, source = filters.querySelector('[name=source]').value;
      const exercises = filterExercises(libraryExercises(getData().customExercises, source === 'archived'), { query, muscle, pattern, equipment: tool, source });
      if (!exercises.length) results.append(p('Không có bài phù hợp với bộ lọc này.', 'empty'));
      for (const item of exercises) {
        const card = div('list-card', h3(item.name), p(`${item.isCustom ? 'Custom' : 'Bài gốc'} · ${item.primaryMuscles.map(value => labelFor(MUSCLES, value)).join(', ')} · ${labelFor(PATTERNS, item.movementPattern)} · ${item.equipment.map(value => labelFor(EQUIPMENT, value)).join(' / ')}`, 'summary'));
        if (item.secondaryMuscles.length) card.append(p(`Cơ phụ: ${item.secondaryMuscles.map(value => labelFor(MUSCLES, value)).join(', ')}`, 'hint'));
        if (item.notes) card.append(p(item.notes, 'hint'));
        if (item.isCustom) card.append(div('actions', button('Sửa bài', () => { editingExercise = item.id; render(); }),
          item.archived ? button('Hiện lại', () => mutate(next => { const current = next.customExercises.find(value => value.id === item.id); ensureUnchanged(current, item); current.archived = false; }, 'Đã hiện lại bài.')) :
            button('Xóa/ẩn bài', () => confirmAction(`Xóa ${item.name}? Nếu bài được kế hoạch hoặc lịch sử tham chiếu, app sẽ ẩn định nghĩa và giữ dữ liệu đó.`, () => mutate(next => { ensureUnchanged(next.customExercises.find(value => value.id === item.id), item); removeCustomExercise(next, item.id); }, 'Đã xóa bài chưa dùng hoặc ẩn bài đang được tham chiếu.')), 'danger')));
        results.append(card);
      }
    };
    filters.addEventListener('input', update); filters.addEventListener('change', update);
    box.append(filters, results); update(); main.append(box);
  }

  function plansView() {
    const data = getData();
    const selected = data.plans.find(item => item.id === editingPlanId);
    if (selected) { planEditor(selected); return; }
    editingPlanId = null;
    const original = panel(h2('Original Plan · 12 tuần'), p('A/B/C/D từ MASTER_PLAN.md. Tuần và các nguyên tắc gốc vẫn được áp dụng.', 'hint'), div('actions',
      button(data.activePlanId === null ? 'Đang dùng Original Plan' : 'Dùng Original Plan', () => mutate(next => { next.activePlanId = null; }, 'Đã chọn Original Plan.'), 'primary'),
      button('Tạo bản sao để chỉnh', () => mutate(next => { const copy = originalPlanCopy(next.settings.week, id); next.plans.push(copy); editingPlanId = copy.id; selectedDayId = copy.days[0]?.id; }, 'Đã tạo bản sao. Khoảng nghỉ gốc được giữ trong ghi chú; giây nghỉ dùng mức thấp và có thể sửa.'))));
    main.append(original);
    const box = panel(h2('Kế hoạch của tôi'));
    const form = node('form', { class: 'form-grid' }, [field('Tên kế hoạch mới', 'name', '', { required: true }), node('button', { type: 'submit', class: 'primary', text: 'Tạo kế hoạch' })]);
    form.addEventListener('submit', event => {
      event.preventDefault(); const name = form.querySelector('[name=name]').value.trim();
      mutate(next => { if (!name || name.length > 160) throw new Error('Tên kế hoạch phải có 1–160 ký tự.'); const now = new Date().toISOString(); const plan = { id: id(), name, days: [], createdAt: now, updatedAt: now }; next.plans.push(plan); editingPlanId = plan.id; selectedDayId = null; }, 'Đã tạo kế hoạch. Thêm buổi và bài để bắt đầu.');
    });
    box.append(form);
    if (!data.plans.length) box.append(p('Chưa có kế hoạch custom. Bạn có thể tạo mới hoặc sao chép Original Plan.', 'empty'));
    for (const plan of data.plans) box.append(div('list-card', h3(plan.name), p(`${plan.days.length} buổi · ${plan.days.reduce((sum, day) => sum + day.exercises.length, 0)} mục bài${data.activePlanId === plan.id ? ' · Đang dùng' : ''}`, 'summary'), div('actions',
      button('Chỉnh kế hoạch', () => { editingPlanId = plan.id; selectedDayId = plan.days[0]?.id; render(); }),
      button('Chọn kế hoạch', () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); if (!current?.days.some(day => day.exercises.length)) throw new Error('Thêm ít nhất một buổi có bài trước khi chọn kế hoạch.'); next.activePlanId = plan.id; }, 'Đã chọn kế hoạch. Buổi đang tập (nếu có) giữ snapshot riêng.'), 'primary'),
      button('Nhân bản', () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); next.plans.push(duplicatePlan(current, id)); }, 'Đã nhân bản kế hoạch.')),
      button('Xóa kế hoạch', () => confirmAction(`Xóa kế hoạch ${plan.name}? Lịch sử và buổi đang tập giữ nguyên. Nếu đang dùng kế hoạch này, app quay về Original Plan.`, () => mutate(next => { ensureUnchanged(next.plans.find(item => item.id === plan.id), plan); deletePlan(next, plan.id); }, 'Đã xóa kế hoạch; lịch sử giữ nguyên.')), 'danger'))));
    main.append(box);
  }

  function planEditor(plan) {
    if (recovery()) return;
    const box = panel(div('row', h2(plan.name), button('← Danh sách kế hoạch', () => { editingPlanId = null; render(); })));
    const nameForm = node('form', { class: 'form-grid' }, [field('Tên kế hoạch', 'name', plan.name, { required: true }), node('button', { type: 'submit', class: 'secondary', text: 'Đổi tên kế hoạch' })]);
    nameForm.addEventListener('submit', event => { event.preventDefault(); const name = nameForm.querySelector('input').value.trim(); mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); if (!name || name.length > 160) throw new Error('Tên kế hoạch không hợp lệ.'); current.name = name; current.updatedAt = new Date().toISOString(); }); });
    const addDay = node('form', { class: 'form-grid' }, [field('Tên buổi mới', 'dayName', '', { required: true }), node('button', { type: 'submit', class: 'primary', text: 'Thêm buổi' })]);
    addDay.addEventListener('submit', event => { event.preventDefault(); const name = addDay.querySelector('input').value.trim(); mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); if (!name || name.length > 160) throw new Error('Nhập tên buổi.'); const day = { id: id(), name, exercises: [] }; current.days.push(day); current.updatedAt = new Date().toISOString(); selectedDayId = day.id; }); });
    box.append(nameForm, addDay);
    const selected = plan.days.find(item => item.id === selectedDayId) || plan.days[0];
    const editingThisDraft = oneOffSource?.planId === plan.id && oneOff?.id === selected?.id;
    if (oneOff && !editingThisDraft && (oneOff.exercises.length || oneOffSource || getData().planningDraft.builder)) {
      main.append(panel(p('Builder còn bản nháp khác. Tiếp tục hoặc bỏ bản nháp đó trước khi chỉnh buổi này.', 'notice'), button('Mở bản nháp đang có', () => show('builder'))));
      return;
    }
    const day = editingThisDraft ? oneOff : structuredClone(selected);
    if (day) selectedDayId = day.id;
    const nav = div('subtabs', ...plan.days.map(item => { const choice = button(item.name, () => { selectedDayId = item.id; render(); }); choice.setAttribute('aria-pressed', String(item.id === day?.id)); return choice; }));
    box.append(nav); main.append(box);
    if (!day) { main.append(panel(p('Thêm một buổi để thiết kế danh sách bài.', 'empty'))); return; }
    const sourcePlan = oneOffSource?.plan || structuredClone(plan);
    const saveDay = async changed => {
      oneOff = structuredClone(changed); oneOffSource = { planId: plan.id, plan: sourcePlan };
      try { await drafts.save('builder', payload()); } catch (error) { message(error.message, true); return false; }
      return saveSourceDay();
    };
    renderDayEditor(day, saveDay, changed => { oneOff = structuredClone(changed); oneOffSource = { planId: plan.id, plan: sourcePlan }; return persist(); });
    if (oneOffSource?.planId === plan.id) main.append(panel(button('Lưu vào buổi nguồn', saveSourceDay)));
    main.append(panel(draftStatus(), div('actions', button('Bắt đầu buổi này', () => {
      try { const editingDraft = oneOffSource?.planId === plan.id && oneOff?.id === day.id; const reviewed = editingDraft ? reviewedBuilderDay(payload(), getData()) : day; startWorkout(reviewed, plan, editingDraft ? 'builder' : null, () => { oneOff = null; oneOffSource = null; }); }
      catch (error) { message(error.message, true); }
    }, 'primary'),
      button('Đưa buổi lên', () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); const from = current.days.findIndex(item => item.id === day.id); current.days = moveSlot(current.days, from, from - 1); })),
      button('Đưa buổi xuống', () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); const from = current.days.findIndex(item => item.id === day.id); current.days = moveSlot(current.days, from, from + 1); })),
      button('Xóa buổi', () => confirmAction(`Xóa template buổi ${day.name}? Lịch sử đã tập không đổi.`, () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); current.days = current.days.filter(item => item.id !== day.id); selectedDayId = null; }, 'Đã xóa template buổi.')), 'danger'))));
  }

  function renderDayEditor(day, saveDay, onDraft = () => {}) {
    const box = panel(h2(`Thiết kế buổi · ${day.name}`));
    const rename = node('form', { class: 'form-grid' }, [field('Tên buổi', 'name', day.name, { required: true }), node('button', { type: 'submit', class: 'secondary', text: 'Lưu tên buổi' })]);
    rename.addEventListener('input', () => { day.name = rename.querySelector('input').value; onDraft(day); });
    rename.addEventListener('submit', event => { event.preventDefault(); const name = rename.querySelector('input').value.trim(); if (!name || name.length > 160) { message('Tên buổi phải có 1–160 ký tự.', true); return; } saveDay({ ...day, name }); });
    box.append(rename, p('Giá trị bài mới mặc định: 2 hiệp, 8–12 reps, RIR 2, nghỉ 90 giây. Đây là cấu hình có thể sửa, không phải đơn tập cá nhân hóa.', 'hint'));
    const pickerHost = div('picker-host');
    const editDraft = async changed => {
      const saved = await onDraft(changed);
      if (saved === false) return false;
      render(); main.querySelector('[data-add-exercise]')?.focus(); return true;
    };
    function openPicker(mode, slot, trigger) {
      const picker = createExercisePicker({ mode, slot, day, catalog: () => libraryExercises(getData().customExercises), helpers,
        onConfirm: ids => editDraft(mode === 'add' ? addPickedExercises(day, ids, libraryExercises(getData().customExercises), id) :
          replacePickedExercise(day, slot.id, ids[0], libraryExercises(getData().customExercises))),
        onClose: () => { pickerHost.replaceChildren(); trigger.focus(); } });
      pickerHost.replaceChildren(picker.element); picker.focus();
    }
    const addTrigger = button('Thêm bài bằng bộ chọn', () => openPicker('add', null, addTrigger), 'primary');
    addTrigger.dataset.addExercise = '';
    box.append(addTrigger, pickerHost);
    if (!day.exercises.length) box.append(p('Chưa có bài. Tìm và thêm bài từ thư viện ở trên.', 'empty'));
    day.exercises.forEach((slot, index) => {
      const card = node('details', { class: 'recipe-detail' }, [node('summary', { text: `${index + 1}. ${slot.name} · ${slot.sets} × ${slot.repMin}–${slot.repMax} · RIR ${slot.targetRIR ?? 'chưa định nghĩa'} · ${slot.restSeconds}s` })]);
      const definition = libraryExercises(getData().customExercises, true).find(item => item.id === slot.exerciseId);
      if (definition) card.append(p(`${definition.primaryMuscles.map(value => labelFor(MUSCLES, value)).join(', ')} · ${labelFor(PATTERNS, definition.movementPattern)}`, 'hint'));
      const form = node('form', { class: 'form-grid' }, [field('Hiệp', 'sets', slot.sets, { type: 'number', min: 1, max: 20, step: 1, required: true }), field('Reps tối thiểu', 'repMin', slot.repMin, { type: 'number', min: 1, max: 100, step: 1, required: true }), field('Reps tối đa', 'repMax', slot.repMax, { type: 'number', min: 1, max: 100, step: 1, required: true }), field('RIR (số hoặc khoảng)', 'targetRIR', slot.targetRIR ?? ''), field('Nghỉ (giây)', 'restSeconds', slot.restSeconds, { type: 'number', min: 0, max: 1800, step: 1, required: true }), field('Ghi chú bài', 'notes', slot.notes, { tag: 'textarea' }), node('button', { type: 'submit', class: 'primary', text: 'Lưu thông số bài' })]);
      form.addEventListener('input', () => { Object.assign(slot, Object.fromEntries(new FormData(form))); onDraft(day); });
      form.addEventListener('submit', event => { event.preventDefault(); try { const raw = Object.fromEntries(new FormData(form)); const updated = { id: slot.id, ...validateSlot({ ...slot, ...raw, targetRIR: raw.targetRIR === '' ? null : raw.targetRIR }) }; saveDay({ ...day, exercises: day.exercises.map(item => item.id === slot.id ? updated : item) }); } catch (error) { message(error.message, true); } });
      const up = button('↑ Lên', () => editDraft({ ...day, exercises: moveSlot(day.exercises, index, index - 1) })); up.disabled = index === 0;
      const down = button('↓ Xuống', () => editDraft({ ...day, exercises: moveSlot(day.exercises, index, index + 1) })); down.disabled = index === day.exercises.length - 1;
      const replaceTrigger = button('Thay bài', () => openPicker('replace', slot, replaceTrigger));
      card.append(form, div('actions', up, down, replaceTrigger, button('Bỏ bài khỏi buổi', () => confirmAction(`Bỏ ${slot.name} khỏi bản nháp buổi này? Lịch sử không đổi.`, () => editDraft({ ...day, exercises: day.exercises.filter(item => item.id !== slot.id) })), 'danger')));
      box.append(card);
    });
    main.append(box);
  }

  function oneOffView() {
    if (recovery()) return;
    if (!oneOff) oneOff = { id: id(), name: 'Buổi riêng hôm nay', exercises: [] };
    main.append(panel(h2(oneOffSource ? 'Bản nháp chỉnh buổi custom' : 'Buổi riêng hôm nay'), p('Tự lưu bản nháp trên thiết bị. Chỉ nút lưu kế hoạch mới/cập nhật nguồn hoặc bắt đầu mới chuyển thành dữ liệu chính thức.', 'hint'), draftStatus()));
    if (recoveryWarning) main.append(panel(p(recoveryWarning, 'notice')));
    renderDayEditor(oneOff, async changed => { oneOff = structuredClone(changed); if (!await persist()) return false; render(); return true; }, changed => { oneOff = structuredClone(changed); return persist(); });
    const actions = div('actions', button('Bắt đầu buổi đã duyệt', async () => {
      try { const day = reviewedBuilderDay(payload(), getData()); await startWorkout(day, null, 'builder', () => { oneOff = null; oneOffSource = null; }); }
      catch (error) { message(error.message, true); }
    }, 'primary'), button('Lưu thành kế hoạch mới', async () => {
      try {
        await drafts.commit('builder', next => {
          const day = reviewedBuilderDay(payload(), next); if (!day.name || !day.exercises.length) throw new Error('Buổi cần tên và ít nhất một bài.');
          const now = new Date().toISOString(); next.plans.push({ id: id(), name: day.name, days: [day], createdAt: now, updatedAt: now });
        });
        oneOff = null; oneOffSource = null; render(); message('Đã lưu kế hoạch mới và dọn bản nháp.');
      } catch (error) { message(`Chưa lưu kế hoạch: ${error.message}`, true); }
    }), button('Bỏ bản nháp tạo buổi', () => confirmAction('Bỏ bản nháp tạo buổi? Các kế hoạch và lịch sử đã lưu vẫn còn.', async () => {
      try { await drafts.discard('builder'); oneOff = null; oneOffSource = null; render(); }
      catch (error) { message(error.message, true); }
    }), 'danger'));
    if (oneOffSource) actions.append(button('Lưu vào buổi nguồn', saveSourceDay));
    actions.append(button('Thử lưu bản nháp lại', persist));
    main.append(panel(actions));
  }

  async function saveSourceDay() {
    try {
      await drafts.commit('builder', next => {
        const day = reviewedBuilderDay(payload(), next), source = oneOffSource;
        const current = next.plans.find(plan => plan.id === source?.planId);
        ensureUnchanged(current, source?.plan);
        const index = current.days.findIndex(item => item.id === day.id);
        if (index < 0) throw new Error('Buổi nguồn không còn. Hãy lưu thành kế hoạch mới.');
        current.days[index] = day; current.updatedAt = new Date().toISOString();
      });
      oneOff = null; oneOffSource = null; render(); message('Đã lưu buổi nguồn và dọn bản nháp.'); return true;
    } catch (error) { message(`Chưa lưu buổi nguồn: ${error.message}`, true); return false; }
  }

  function setOneOff(day, after = () => {}) {
    const apply = async () => {
      try { await drafts.transition('builder', { day: structuredClone(day), source: null }, next => { next.planningDraft.planner = null; });
        oneOff = structuredClone(day); oneOffSource = null; after();
      } catch (error) { message(`Chưa chuyển bản nháp: ${error.message}`, true); }
    };
    if ((oneOff?.exercises.length && oneOff.id !== day.id) || getData().planningDraft?.builder) confirmAction('Thay buổi chưa lưu trong builder bằng bản nháp này? Lưu buổi cũ thành mẫu trước nếu muốn giữ.', apply);
    else apply();
  }
  return { libraryView, plansView, oneOffView, setOneOff, checkChoices, reset() { oneOff = null; oneOffSource = null; editingPlanId = null; } };
}
