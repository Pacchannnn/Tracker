import { MUSCLES, PATTERNS, EQUIPMENT, labelFor } from './custom-workout.js?v=36';
import { filterExercises, pickerOptions, createPickerSelection, compareExercises, rankedPickerResults } from './exercise-picker.js?v=36';

export function createExercisePicker({ mode, catalog, day, slot, onConfirm, onClose, helpers, renderReview = null, contextText = null, liveReplace = false }) {
  const { node, button, field, panel, div, p, h2, h3 } = helpers;
  let busy = false;
  const selection = createPickerSelection(mode), options = pickerOptions(catalog());
  const root = panel(h2(mode === 'add' ? 'Chọn bài để thêm' : `Chọn bài thay · ${slot.name}`));
  root.classList.add('exercise-picker');
  root.append(p(contextText || 'Lọc chỉ đổi danh sách. Lựa chọn đang chờ chưa được autosave; xác nhận để đưa vào bản nháp buổi. Hủy/rời trang sẽ bỏ lựa chọn chưa xác nhận.', 'hint'),
    p('Nhóm cơ lọc theo cơ chính, gồm nhóm con Lưng/Vai. Các bộ lọc kết hợp AND. Dụng cụ trong tên ghép là lựa chọn, không phải tất cả đều bắt buộc; hãy đọc tên/setup.', 'hint'));
  const filters = div('picker-filters', field('Tìm tên bài', 'pickerQuery'), ...[
    ['Nhóm cơ chính', 'pickerMuscle', options.muscle], ['Dụng cụ', 'pickerEquipment', options.equipment], ['Kiểu chuyển động', 'pickerPattern', options.pattern]
  ].map(([label, name, choices]) => field(label, name, '', { tag: 'select', choices: [{ value: '', label: 'Tất cả' }, ...choices] })));
  const pending = div('picker-pending'), count = p('', 'summary'); count.setAttribute('role', 'status');
  const results = div('picker-results'), error = p('', 'notice error'); error.setAttribute('role', 'alert'); error.hidden = true;
  const confirm = button(mode === 'add' ? 'Xác nhận thêm bài' : 'Xác nhận thay bài', async () => {
    if (busy) return;
    busy = true; confirm.disabled = true; error.hidden = true;
    try {
      const outcome = await onConfirm(selection.ids());
      if (outcome === 'review') { busy = false; confirm.disabled = !selection.ids().length; return; }
      if (outcome === false) throw new Error('Chưa lưu thay đổi. Lựa chọn vẫn còn; giữ phần đang nhập và xử lý lỗi lưu trước khi rời trang.');
    } catch (problem) { error.textContent = problem.message; error.hidden = false; busy = false; confirm.disabled = !selection.ids().length; }
  }, 'primary');
  const close = () => { if (!busy) onClose(); };
  root.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); close(); } });
  const labels = (choices, values) => values.length ? values.map(value => labelFor(choices, value)).join(', ') : 'Chưa ghi metadata';
  function refresh(focusId = null) {
    const all = catalog(), selected = selection.ids(), blocked = new Set(day.exercises.map(item => item.exerciseId));
    const values = { query: filters.querySelector('[name=pickerQuery]').value, muscle: filters.querySelector('[name=pickerMuscle]').value,
      equipment: filters.querySelector('[name=pickerEquipment]').value, pattern: filters.querySelector('[name=pickerPattern]').value };
    const current = slot ? all.find(item => item.id === slot.exerciseId) : null;
    const filtered = filterExercises(all, values);
    const rows = mode === 'replace' ? rankedPickerResults(current, filtered.filter(item => item.id !== slot.exerciseId), values.equipment) : filtered.map(exercise => ({ exercise }));
    count.textContent = `${selected.length} bài đang chờ ${mode === 'add' ? 'thêm' : 'thay'} · ${rows.length} kết quả lọc`;
    confirm.disabled = busy || !selected.length;
    pending.replaceChildren();
    pending.append(h3('Duyệt lựa chọn đang chờ'));
    if (!selected.length) pending.append(p('Chưa chọn bài. Chọn trong kết quả bên dưới.', 'empty'));
    for (const id of selected) {
      const item = all.find(exercise => exercise.id === id);
      pending.append(div('list-card', p(`✓ ${item?.name || 'Bài không còn trong thư viện'}`, 'summary'), button('Bỏ lựa chọn', () => { selection.toggle(id); refresh(id); })));
      if (renderReview && item) pending.append(renderReview(item));
      if (mode === 'replace' && item && !liveReplace) {
        const comparison = compareExercises(current, item);
        pending.append(p(`Hiện tại: ${slot.name} → Mới: ${item.name}`, 'summary'),
          p(`Giữ nguyên mục/thứ tự và thông số: ${slot.sets} hiệp · ${slot.repMin}–${slot.repMax} reps · RIR ${slot.targetRIR ?? 'chưa định nghĩa'} · ${slot.restSeconds}s. Không đổi tạ hoặc lịch sử.`, 'hint'),
          p(`Cơ chính chung: ${labels(MUSCLES, comparison.sharedPrimary)}. Pattern: ${comparison.fromPattern ? labelFor(PATTERNS, comparison.fromPattern) : 'Chưa ghi'} → ${labelFor(PATTERNS, comparison.toPattern)}${comparison.samePattern ? ' (cùng pattern)' : ''}.`, 'hint'),
          p(`Dụng cụ: ${labels(EQUIPMENT, comparison.fromEquipment)} → ${labels(EQUIPMENT, comparison.toEquipment)}.`, 'hint'),
          p(`Ghi chú setup cũ: ${slot.notes || 'Không ghi'}\nSau thay bài: ${item.notes || 'Không ghi'}. Ghi chú cũ sẽ được thay.`, 'hint'),
          p('So sánh chỉ theo metadata đã có; không khẳng định hai bài giống hoàn toàn hoặc phù hợp y khoa.', 'hint'));
      }
      if (mode === 'replace' && item && liveReplace) {
        const comparison = compareExercises(current, item);
        pending.append(p(`Cơ chính chung: ${labels(MUSCLES, comparison.sharedPrimary)}. Pattern: ${comparison.fromPattern ? labelFor(PATTERNS, comparison.fromPattern) : 'Chưa ghi'} → ${labelFor(PATTERNS, comparison.toPattern)}.`, 'hint'),
          p(`Dụng cụ: ${labels(EQUIPMENT, comparison.fromEquipment)} → ${labels(EQUIPMENT, comparison.toEquipment)}. So sánh chỉ theo metadata; không khẳng định tương đương hoặc phù hợp y khoa.`, 'hint'));
      }
    }
    if (mode === 'add' && selected.length) pending.append(p('Bài mới dùng mặc định chỉnh được: 2 hiệp, 8–12 reps, RIR 2, nghỉ 90s. Chưa lưu vào kế hoạch nguồn.', 'hint'));
    results.replaceChildren();
    if (!rows.length) results.append(p('Không có bài phù hợp. Xóa bộ lọc để xem lại danh sách.', 'empty'));
    for (const { exercise, suggestion, reason } of rows) {
      const isSelected = selected.includes(exercise.id), existing = blocked.has(exercise.id);
      const toggle = button(existing ? `Đã có trong buổi · ${exercise.name}` : `${isSelected ? '✓ Đã chọn' : 'Chọn'} · ${exercise.name}`, () => { selection.toggle(exercise.id); refresh(exercise.id); });
      toggle.disabled = existing; toggle.setAttribute('aria-pressed', String(isSelected)); toggle.dataset.pickerId = exercise.id;
      const card = div('list-card', h3(exercise.name), p(`${exercise.isCustom ? 'Custom' : 'Bài gốc'} · ${labels(MUSCLES, exercise.primaryMuscles)} · ${labelFor(PATTERNS, exercise.movementPattern)} · ${labels(EQUIPMENT, exercise.equipment || [])}`, 'hint'));
      if (suggestion) card.append(p(`Gợi ý theo metadata: ${reason}`, 'hint'));
      card.append(toggle); results.append(card);
    }
    if (focusId) {
      const target = [...results.querySelectorAll('button')].find(item => item.dataset.pickerId === focusId && !item.disabled);
      (target || filters.querySelector('input')).focus();
    }
  }
  filters.addEventListener('input', () => refresh());
  root.append(filters, div('actions', button('Xóa bộ lọc', () => { for (const input of filters.querySelectorAll('input,select')) input.value = ''; refresh(); filters.querySelector('input').focus(); }),
    button('Bỏ tất cả lựa chọn', () => { selection.clear(); refresh(); })), count, pending, div('actions', confirm, button('Hủy chọn bài', close)), error, results);
  refresh();
  return { element: root, focus: () => filters.querySelector('input').focus() };
}
