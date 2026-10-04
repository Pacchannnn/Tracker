import { MUSCLES, PATTERNS, EQUIPMENT, labelFor, libraryExercises, validateExercise, validateSlot, defaultSlot, moveSlot, removeCustomExercise, deletePlan, duplicatePlan, originalPlanCopy, alternativesFor, muscleMatches } from './custom-workout.js?v=17';
import { ensureUnchanged } from './data.js?v=17';

export function createGymBuilder(context) {
  const { main, getData, mutate, render, show, startWorkout, helpers } = context;
  const { node, button, field, panel, div, p, h2, h3, id, message, confirmAction } = helpers;
  let editingExercise = null, editingPlanId = null, selectedDayId = null, replacingSlot = null;
  let oneOff = null;

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
      const exercises = libraryExercises(getData().customExercises, source === 'archived').filter(item =>
        item.name.toLocaleLowerCase('vi').includes(query) && (!muscle || muscleMatches(item, muscle)) && (!pattern || item.movementPattern === pattern) &&
        (!tool || item.equipment.includes(tool)) && (source === 'all' || source === 'builtin' && !item.isCustom || source === 'custom' && item.isCustom || source === 'archived' && item.archived));
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
    const box = panel(div('row', h2(plan.name), button('← Danh sách kế hoạch', () => { editingPlanId = null; replacingSlot = null; render(); })));
    const nameForm = node('form', { class: 'form-grid' }, [field('Tên kế hoạch', 'name', plan.name, { required: true }), node('button', { type: 'submit', class: 'secondary', text: 'Đổi tên kế hoạch' })]);
    nameForm.addEventListener('submit', event => { event.preventDefault(); const name = nameForm.querySelector('input').value.trim(); mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); if (!name || name.length > 160) throw new Error('Tên kế hoạch không hợp lệ.'); current.name = name; current.updatedAt = new Date().toISOString(); }); });
    const addDay = node('form', { class: 'form-grid' }, [field('Tên buổi mới', 'dayName', '', { required: true }), node('button', { type: 'submit', class: 'primary', text: 'Thêm buổi' })]);
    addDay.addEventListener('submit', event => { event.preventDefault(); const name = addDay.querySelector('input').value.trim(); mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); if (!name || name.length > 160) throw new Error('Nhập tên buổi.'); const day = { id: id(), name, exercises: [] }; current.days.push(day); current.updatedAt = new Date().toISOString(); selectedDayId = day.id; }); });
    box.append(nameForm, addDay);
    const day = plan.days.find(item => item.id === selectedDayId) || plan.days[0];
    if (day) selectedDayId = day.id;
    const nav = div('subtabs', ...plan.days.map(item => { const choice = button(item.name, () => { selectedDayId = item.id; replacingSlot = null; render(); }); choice.setAttribute('aria-pressed', String(item.id === day?.id)); return choice; }));
    box.append(nav); main.append(box);
    if (!day) { main.append(panel(p('Thêm một buổi để thiết kế danh sách bài.', 'empty'))); return; }
    const saveDay = async changed => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); const index = current.days.findIndex(item => item.id === day.id); current.days[index] = structuredClone(changed); current.updatedAt = new Date().toISOString(); }, 'Đã lưu buổi custom.');
    renderDayEditor(day, saveDay);
    main.append(panel(div('actions', button('Bắt đầu buổi này', () => startWorkout(day, plan), 'primary'),
      button('Đưa buổi lên', () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); const from = current.days.findIndex(item => item.id === day.id); current.days = moveSlot(current.days, from, from - 1); })),
      button('Đưa buổi xuống', () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); const from = current.days.findIndex(item => item.id === day.id); current.days = moveSlot(current.days, from, from + 1); })),
      button('Xóa buổi', () => confirmAction(`Xóa template buổi ${day.name}? Lịch sử đã tập không đổi.`, () => mutate(next => { const current = next.plans.find(item => item.id === plan.id); ensureUnchanged(current, plan); current.days = current.days.filter(item => item.id !== day.id); selectedDayId = null; }, 'Đã xóa template buổi.')), 'danger'))));
  }

  function renderDayEditor(day, saveDay) {
    const library = libraryExercises(getData().customExercises);
    const box = panel(h2(`Thiết kế buổi · ${day.name}`));
    const rename = node('form', { class: 'form-grid' }, [field('Tên buổi', 'name', day.name, { required: true }), node('button', { type: 'submit', class: 'secondary', text: 'Lưu tên buổi' })]);
    rename.addEventListener('submit', event => { event.preventDefault(); const name = rename.querySelector('input').value.trim(); if (!name || name.length > 160) { message('Tên buổi phải có 1–160 ký tự.', true); return; } saveDay({ ...day, name }); });
    box.append(rename, p('Giá trị bài mới mặc định: 2 hiệp, 8–12 reps, RIR 2, nghỉ 90 giây. Đây là cấu hình có thể sửa, không phải đơn tập cá nhân hóa.', 'hint'));
    const filter = field('Tìm bài để thêm', 'addSearch');
    const add = node('form', { class: 'form-grid' }, [filter, field('Bài tập', 'exerciseId', library[0]?.id || '', { tag: 'select', choices: library.map(item => ({ value: item.id, label: item.name })) }), node('button', { type: 'submit', class: 'primary', text: 'Thêm bài vào buổi' })]);
    filter.querySelector('input').addEventListener('input', () => { const query = filter.querySelector('input').value.toLocaleLowerCase('vi'); const matches = library.filter(item => item.name.toLocaleLowerCase('vi').includes(query)); add.querySelector('select').replaceChildren(...matches.map(item => node('option', { value: item.id, text: item.name }))); });
    add.addEventListener('submit', event => { event.preventDefault(); const exercise = library.find(item => item.id === add.querySelector('select').value); if (!exercise) { message('Chọn bài trong thư viện.', true); return; } if (day.exercises.some(item => item.exerciseId === exercise.id)) { message('Bài này đã có trong buổi. Hãy chỉnh số hiệp ở bài đang có.', true); return; } saveDay({ ...day, exercises: [...day.exercises, defaultSlot(exercise, id)] }); });
    box.append(add);
    if (!day.exercises.length) box.append(p('Chưa có bài. Tìm và thêm bài từ thư viện ở trên.', 'empty'));
    day.exercises.forEach((slot, index) => {
      const card = node('details', { class: 'recipe-detail' }, [node('summary', { text: `${index + 1}. ${slot.name} · ${slot.sets} × ${slot.repMin}–${slot.repMax} · RIR ${slot.targetRIR ?? 'chưa định nghĩa'} · ${slot.restSeconds}s` })]);
      const definition = libraryExercises(getData().customExercises, true).find(item => item.id === slot.exerciseId);
      if (definition) card.append(p(`${definition.primaryMuscles.map(value => labelFor(MUSCLES, value)).join(', ')} · ${labelFor(PATTERNS, definition.movementPattern)}`, 'hint'));
      const form = node('form', { class: 'form-grid' }, [field('Hiệp', 'sets', slot.sets, { type: 'number', min: 1, max: 20, step: 1, required: true }), field('Reps tối thiểu', 'repMin', slot.repMin, { type: 'number', min: 1, max: 100, step: 1, required: true }), field('Reps tối đa', 'repMax', slot.repMax, { type: 'number', min: 1, max: 100, step: 1, required: true }), field('RIR (số hoặc khoảng)', 'targetRIR', slot.targetRIR ?? ''), field('Nghỉ (giây)', 'restSeconds', slot.restSeconds, { type: 'number', min: 0, max: 1800, step: 1, required: true }), field('Ghi chú bài', 'notes', slot.notes, { tag: 'textarea' }), node('button', { type: 'submit', class: 'primary', text: 'Lưu thông số bài' })]);
      form.addEventListener('submit', event => { event.preventDefault(); try { const raw = Object.fromEntries(new FormData(form)); const updated = { id: slot.id, ...validateSlot({ ...slot, ...raw, targetRIR: raw.targetRIR === '' ? null : raw.targetRIR }) }; saveDay({ ...day, exercises: day.exercises.map(item => item.id === slot.id ? updated : item) }); } catch (error) { message(error.message, true); } });
      const up = button('↑ Lên', () => saveDay({ ...day, exercises: moveSlot(day.exercises, index, index - 1) })); up.disabled = index === 0;
      const down = button('↓ Xuống', () => saveDay({ ...day, exercises: moveSlot(day.exercises, index, index + 1) })); down.disabled = index === day.exercises.length - 1;
      card.append(form, div('actions', up, down, button('Thay bài', () => { replacingSlot = replacingSlot === slot.id ? null : slot.id; render(); }), button('Bỏ bài khỏi buổi', () => confirmAction(`Bỏ ${slot.name} khỏi template buổi này? Lịch sử không đổi.`, () => saveDay({ ...day, exercises: day.exercises.filter(item => item.id !== slot.id) })), 'danger')));
      box.append(card);
      if (replacingSlot === slot.id) {
        const candidates = library.filter(item => !day.exercises.some(existing => existing.exerciseId === item.id));
        const alternatives = alternativesFor(definition, candidates);
        const replace = panel(h3(`Thay ${slot.name}`), p('Gợi ý có mục đích tương tự, không hoàn toàn giống nhau. Giữ hiệp/reps/RIR/nghỉ để bạn xem lại. Ghi chú setup được thay bằng ghi chú của bài mới; lưu riêng ghi chú cũ nếu cần.', 'hint'));
        const applyReplacement = exercise => { replacingSlot = null; saveDay({ ...day, exercises: day.exercises.map(item => item.id === slot.id ? { ...slot, exerciseId: exercise.id, name: exercise.name, notes: exercise.notes || '' } : item) }); };
        for (const option of alternatives) replace.append(div('list-card', h3(option.exercise.name), p(option.reason, 'hint'), button('Chọn bài thay thế', () => applyReplacement(option.exercise))));
        if (!alternatives.length) replace.append(p('Chưa có bài tương tự trong thư viện. Có thể tạo bài custom hoặc chọn thủ công.', 'empty'));
        const manual = node('form', { class: 'form-grid' }, [field('Chọn bài khác thủ công', 'replacement', candidates[0]?.id || '', { tag: 'select', choices: candidates.map(item => ({ value: item.id, label: item.name })) }), node('button', { type: 'submit', class: 'secondary', text: 'Dùng bài đã chọn' })]);
        manual.addEventListener('submit', event => { event.preventDefault(); const exercise = candidates.find(item => item.id === manual.querySelector('select').value); if (exercise) applyReplacement(exercise); else message('Chưa có bài khác để thay.', true); });
        replace.append(manual);
        replace.append(button('Hủy thay bài', () => { replacingSlot = null; render(); })); box.append(replace);
      }
    });
    main.append(box);
  }

  function oneOffView() {
    if (!oneOff) oneOff = { id: id(), name: 'Buổi riêng hôm nay', exercises: [] };
    main.append(panel(h2('Buổi riêng hôm nay'), p('Buổi này độc lập với kế hoạch đang dùng. Trước khi bắt đầu, các thay đổi ở bộ tạo buổi chỉ nằm trong màn hình này; lưu thành mẫu nếu muốn giữ qua reload.', 'hint')));
    renderDayEditor(oneOff, async changed => { oneOff = structuredClone(changed); render(); return true; });
    main.append(panel(div('actions', button('Bắt đầu buổi đã duyệt', () => startWorkout(oneOff), 'primary'), button('Lưu thành kế hoạch mới', () => mutate(next => {
      if (!oneOff.exercises.length) throw new Error('Thêm bài trước khi lưu mẫu.'); const now = new Date().toISOString(); next.plans.push({ id: id(), name: oneOff.name, days: [structuredClone(oneOff)], createdAt: now, updatedAt: now });
    }, 'Đã lưu mẫu riêng. Kế hoạch active vẫn do bạn chọn.')), button('Tạo lại buổi trống', () => confirmAction('Bỏ các thay đổi chưa lưu trong bộ tạo buổi?', () => { oneOff = null; replacingSlot = null; render(); }), 'danger'))));
  }

  function setOneOff(day, after = () => {}) {
    const apply = () => { oneOff = structuredClone(day); replacingSlot = null; after(); };
    if (oneOff?.exercises.length && oneOff.id !== day.id) confirmAction('Thay buổi chưa lưu trong builder bằng bản nháp này? Lưu buổi cũ thành mẫu trước nếu muốn giữ.', apply);
    else apply();
  }
  return { libraryView, plansView, oneOffView, setOneOff, checkChoices };
}
