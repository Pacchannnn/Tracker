import { PROGRAM, programDay, setCount, targetRir, nextWorkout, weekGuidance } from './program.js';
import { emptyData, loadData, updateData, validateSet, validateFood, validateEntry, validateCheckin, dailyTotals, localDate, weekStart, validDate, diaryDate, foodSnapshotForEntry, createBackup, parseBackup, ensureUnchanged } from './data.js';
import { navigationGroup } from './navigation.js';

const main = document.querySelector('#main');
const notice = document.querySelector('#notice');
const tabs = [...document.querySelectorAll('[data-view]')];
const trainingNav = document.querySelector('#training-nav');
const viewTitle = document.querySelector('#view-title');
let data;
let view = 'dashboard';
let editingFood = null;
let editingEntry = null;
let editingCheckin = null;
let editingSet = null;
let foodDateSelection = { mode: 'today', date: localDate() };
let backupUrl = null;
let restoreSafetyUrl = null;
let restorePreview = null;
let selectedProgram = 'A';

function node(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === 'text') element.textContent = value;
    else if (key === 'class') element.className = value;
    else if (key === 'onClick') element.addEventListener('click', value);
    else if (key === 'value') element.value = value;
    else if (value !== null && value !== undefined) element.setAttribute(key, value);
  }
  for (const child of children) element.append(child);
  return element;
}
const button = (label, action, kind = 'secondary') => node('button', { type: 'button', class: kind, text: label, onClick: action });
const p = (text, cls = '') => node('p', { text, class: cls });
const h2 = text => node('h2', { text });
const h3 = text => node('h3', { text });
const panel = (...children) => node('section', { class: 'panel' }, children);
const div = (cls, ...children) => node('div', { class: cls }, children);
const fmt = value => Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
const id = () => crypto.randomUUID();

function field(label, name, value = '', options = {}) {
  const input = node(options.tag || 'input', { name, type: options.type || 'text', value: value ?? '', min: options.min, max: options.max, step: options.step, required: options.required ? '' : null });
  if (options.tag === 'textarea') input.textContent = value ?? '';
  if (options.tag === 'select') {
    for (const choice of options.choices) input.append(node('option', { value: choice, text: choice }));
    input.value = value;
  }
  const wrapper = node('label', { class: 'field' });
  wrapper.append(node('span', { text: label }), input);
  return wrapper;
}

function message(text, error = false) {
  notice.hidden = false;
  notice.className = `notice${error ? ' error' : ''}`;
  notice.textContent = text;
  notice.scrollIntoView({ block: 'nearest' });
}

function confirmAction(question, accept) {
  const dialog = node('dialog', {}, [h2('Xác nhận'), p(question)]);
  const cancel = button('Hủy', () => dialog.close());
  const proceed = button('Tiếp tục', () => { dialog.close(); accept(); }, 'danger');
  dialog.append(div('actions', cancel, proceed));
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  cancel.focus();
}

async function mutate(change, success = 'Đã lưu.') {
  try {
    data = await updateData(localStorage, navigator.locks, change);
    render();
    message(success);
    return true;
  } catch (error) { message(error.message || 'Không thể lưu dữ liệu.', true); return false; }
}

function show(next) {
  try { data = loadData(localStorage); }
  catch (error) { message(error.message, true); return; }
  view = next;
  notice.hidden = true;
  updateNavigation();
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
tabs.forEach(tab => tab.addEventListener('click', () => show(tab.getAttribute('data-view'))));
window.addEventListener('storage', event => {
  if (event.key !== 'vshape-tracker') return;
  try { data = loadData(localStorage); message('Dữ liệu đã đổi ở tab khác. Mở lại mục hiện tại để xem bản mới nhất.'); }
  catch (error) { message(error.message, true); }
});
function refreshTodayDiary() {
  if (view !== 'nutrition' || foodDateSelection.mode !== 'today') return;
  const shown = main.querySelector('input[name=date]');
  if (shown && shown.value !== localDate()) render();
}
window.addEventListener('focus', refreshTodayDiary);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshTodayDiary(); });

function updateNavigation() {
  const group = navigationGroup(view);
  const titles = { today: 'Hôm nay', training: 'Tập luyện', food: 'Ăn uống', progress: 'Tiến độ', settings: 'Cài đặt' };
  viewTitle.textContent = titles[group];
  trainingNav.hidden = group !== 'training';
  tabs.forEach(tab => {
    const active = tab.dataset.group ? tab.dataset.group === group : tab.dataset.subview === view;
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}

function render() {
  main.replaceChildren();
  ({ dashboard: dashboardView, program: programView, workout: workoutView, history: historyView, nutrition: nutritionView, checkins: checkinsView, settings: settingsView })[view]();
}

function latestCheckin(key) { return [...data.checkins].filter(item => item[key] !== null).sort((a, b) => b.date.localeCompare(a.date))[0]; }
function currentWeekCount() { const start = weekStart(); return data.sessions.filter(item => item.date >= start && item.date <= localDate()).length; }

function dashboardView() {
  const today = nextWorkout(data.sessions, data.draft);
  const weight = latestCheckin('weight');
  const waist = latestCheckin('waist');
  const latest = [...data.checkins].sort((a, b) => b.date.localeCompare(a.date))[0];
  const totals = dailyTotals(data.entries, localDate());
  const intro = panel(p(`BUỔI KẾ TIẾP · ${today}`, 'eyebrow'), h2(PROGRAM[today].title), p(`${PROGRAM[today].exercises.length} bài tập · tiếp tục thứ tự A → B → C → D khi lỡ buổi.`, 'summary'));
  intro.classList.add('hero-panel');
  intro.append(button(data.draft ? `Tiếp tục buổi ${today} →` : `Bắt đầu buổi ${today} →`, () => openWorkout(today), 'primary'));
  const nutrition = panel(div('row', h2('Dinh dưỡng hôm nay'), button('Mở nhật ký', () => show('nutrition'))), div('stat-pair',
    div('', node('strong', { text: `${fmt(totals.calories)} / ${fmt(data.settings.calories)}` }), node('small', { text: 'kcal đã ghi / mục tiêu' })),
    div('', node('strong', { text: `${fmt(totals.protein)} / ${fmt(data.settings.protein)}` }), node('small', { text: 'g protein đã ghi / mục tiêu' }))));
  if (!data.entries.some(item => item.date === localDate())) nutrition.append(p('Chưa ghi món ăn nào hôm nay.', 'hint'));
  const week = panel(p('TUẦN CHƯƠNG TRÌNH', 'eyebrow'), h2(`${data.settings.week} / 12`), p(weekGuidance(data.settings.week), 'hint'), div('stat-pair',
    div('', node('strong', { text: `${currentWeekCount()} / 4` }), node('small', { text: 'buổi tuần này' })),
    div('', node('strong', { text: weight ? `${fmt(weight.weight)} kg` : '—' }), node('small', { text: 'cân gần nhất' }))));
  const checkin = panel(h2('Check-in gần nhất'), latest ? p(`${latest.date}${latest.weight !== null ? ` · ${fmt(latest.weight)} kg` : ''}${latest.waist !== null ? ` · ${fmt(latest.waist)} cm eo` : ''}`, 'summary') : p('Chưa có cân nặng hoặc số đo eo. Ghi lần đầu để thấy thay đổi.', 'hint'), button('Ghi check-in', () => show('checkins')));
  main.append(div('dashboard-layout', div('stack', intro, nutrition), div('stack', week, checkin)), h2('Đi nhanh đến'), div('quick-links',
    quickLink('Chương trình A/B/C/D', 'Bài, số hiệp, RIR', () => show('program')),
    quickLink('Thêm món ăn', 'Nhật ký theo ngày', () => show('nutrition')),
    quickLink('Xem lịch sử', 'Buổi tập đã lưu', () => show('history'))));
}
function stat(label, value) { return div('stat', node('small', { text: label }), node('strong', { text: value })); }
function quickLink(label, detail, action) {
  const link = button(label, action);
  link.append(node('small', { text: detail }));
  return link;
}

function programView() {
  const days = div('program-days');
  for (const [key, workout] of Object.entries(PROGRAM)) {
    const choice = node('button', { type: 'button', 'aria-label': `Buổi ${key}: ${workout.day} · ${workout.title}`, 'aria-pressed': key === selectedProgram ? 'true' : 'false', onClick: () => { selectedProgram = key; render(); } }, [node('strong', { text: key }), node('span', { text: `${workout.day} · ${workout.title.split(' · ')[0]}` })]);
    days.append(choice);
  }
  const chosen = programDay(selectedProgram, data.settings.week);
  const details = panel(div('row', div('', p(`BUỔI ${selectedProgram}`, 'eyebrow'), h2(chosen.title)), button('Bắt đầu buổi →', () => openWorkout(selectedProgram), 'primary')), p(`${chosen.day} · Tuần ${data.settings.week}`, 'hint'));
  chosen.exercises.forEach((item, index) => details.append(div('program-line', node('strong', { text: `${index + 1}. ${item.name}` }), node('span', { text: `${item.sets} × ${item.reps} · nghỉ ${item.rest} · RIR ${item.rir}` }), item.note ? p(item.note, 'hint') : document.createTextNode(''))));
  const guidance = panel(h2('Nguyên tắc buổi tập'), p(weekGuidance(data.settings.week), 'warning'), p('Nếu lỡ buổi, tiếp tục thứ tự A → B → C → D; không nhồi hai buổi trong một ngày.', 'hint'), p('Ứng dụng chỉ ghi chép, không tự quyết định tăng hoặc giảm tải.', 'hint'));
  if (selectedProgram === 'B' || selectedProgram === 'D') guidance.append(p('Gối: nếu đau nhói, kẹt, lỏng/khuỵu khi tập, dừng bài. Theo dõi sưng hoặc đau tăng sau buổi và sáng hôm sau. Xem MASTER_PLAN.md.', 'warning'));
  guidance.append(p('Cardio: bắt đầu 2 lần/tuần, 15–20 phút đi bộ phẳng hoặc xe đạp tại chỗ nếu gối dung nạp; chi tiết trong MASTER_PLAN.md.', 'hint'));
  main.append(days, div('program-detail', details, guidance));
}

async function openWorkout(key) {
  data = loadData(localStorage);
  if (data.draft && data.draft.workout !== key) {
    const oldDraftId = data.draft.id;
    confirmAction('Đổi buổi sẽ bỏ bản nháp hiện tại. Tiếp tục?', async () => {
      if (await mutate(next => {
        if (next.draft?.id !== oldDraftId) throw new Error('Bản nháp đã đổi ở tab khác. Hãy mở lại buổi tập.');
        next.draft = null;
      }, 'Đã bỏ bản nháp cũ.')) openWorkout(key);
    });
    return;
  }
  if (!data.draft || data.draft.workout !== key) {
    if (!await mutate(next => {
      if (next.draft) throw new Error('Một tab khác đã mở buổi tập. Hãy mở lại mục Tập luyện.');
      next.draft = { id: id(), workout: key, date: localDate(), week: next.settings.week, sets: [], notes: '' };
    }, `Đã mở buổi ${key}.`)) return;
  }
  show('workout');
}

function previousSets(key, exerciseIndex, excludeId) {
  const session = [...data.sessions].filter(item => item.workout === key && item.id !== excludeId).sort((a, b) => b.date.localeCompare(a.date))[0];
  return session?.sets.filter(set => set.exerciseIndex === exerciseIndex) ?? [];
}

function workoutView() {
  if (!data.draft) {
    const box = panel(h2('Chọn buổi tập'), p('Mở A/B/C/D để ghi từng hiệp. Bản nháp tự lưu trên trình duyệt.', 'summary'));
    box.append(div('actions', ...Object.keys(PROGRAM).map(key => button(`Buổi ${key}`, () => openWorkout(key), 'primary'))));
    main.append(box); return;
  }
  const draft = data.draft;
  const workout = PROGRAM[draft.workout];
  const header = panel(h2(`Buổi ${draft.workout} · ${workout.title}`), p(`Tuần ${draft.week} · ${draft.date} · ${draft.sets.length} hiệp đã ghi`, 'summary'), p('Ghi DB theo mỗi tay; barbell tính cả thanh. Với máy, ghi đúng đơn vị và tên máy trong ghi chú buổi. Theo MASTER_PLAN.md.', 'hint'));
  if (draft.workout === 'B' || draft.workout === 'D') header.append(p('Điều kiện bài chân: chỉ thực hiện khi đã được phép trở lại tập sức mạnh và không có hạn chế riêng sau mổ; không tập xuyên qua đau/sưng/mất vững. Xem MASTER_PLAN.md.', 'warning'));
  const details = div('form-grid', field('Ngày tập', 'date', draft.date, { type: 'date' }), field('Ghi chú buổi', 'notes', draft.notes));
  details.querySelectorAll('input').forEach(input => input.addEventListener('change', () => mutate(next => {
    const date = details.querySelector('[name=date]').value;
    if (!validDate(date)) throw new Error('Ngày tập không hợp lệ.');
    next.draft.date = date;
    next.draft.notes = details.querySelector('[name=notes]').value.trim();
  }, 'Đã lưu bản nháp.')));
  header.append(details);
  main.append(header);
  const group = panel(h2('Ghi từng hiệp'));
  const nextExercise = workout.exercises.findIndex((item, index) => draft.sets.filter(set => set.exerciseIndex === index).length < setCount(item, draft.week));
  workout.exercises.forEach((item, index) => group.append(exerciseBlock(item, index, draft, index === nextExercise)));
  main.append(group);
  const end = panel(h2('Hoàn thành buổi tập'), p('Các hiệp đã ghi được lưu trong lịch sử. Bạn có thể mở lại để sửa sau.', 'hint'), div('actions', button('Hoàn thành & lưu buổi', completeWorkout, 'primary'), button('Bỏ bản nháp', () => confirmAction('Xóa bản nháp buổi tập hiện tại?', () => mutate(next => { next.draft = null; }, 'Đã bỏ bản nháp.')), 'danger')));
  main.append(end);
}

function exerciseBlock(item, index, draft, isNext = false) {
  const saved = draft.sets.filter(set => set.exerciseIndex === index).sort((a, b) => a.setNumber - b.setNumber);
  const previous = previousSets(draft.workout, index, draft.id);
  const wrapper = div(`exercise${isNext ? ' is-next' : ''}`, h3(`${index + 1}. ${item.name}`), p(`${setCount(item, draft.week)} hiệp × ${item.reps} · Nghỉ ${item.rest} · RIR mục tiêu ${targetRir(item, draft.week)}`, 'exercise-meta'));
  if (item.note) wrapper.append(p(item.note, 'hint'));
  if (previous.length) wrapper.append(p(`Lần trước: ${previous.map(set => `${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}`).join(' | ')}`, 'hint'));
  const list = node('ul', { class: 'set-list' });
  for (const set of saved) {
    const line = node('li', {}, [node('span', { text: `Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}` })]);
    line.append(button('Sửa', () => { editingSet = set.id; render(); }));
    line.append(button('Xóa', () => confirmAction(`Xóa hiệp ${set.setNumber} của bài này?`, () => mutate(next => { next.draft.sets = next.draft.sets.filter(item => item.id !== set.id); }, 'Đã xóa hiệp.')), 'danger'));
    list.append(line);
  }
  wrapper.append(list);
  const nextSet = Array.from({ length: setCount(item, draft.week) }, (_, i) => i + 1).find(n => !saved.some(set => set.setNumber === n));
  const edit = saved.find(set => set.id === editingSet);
  if (nextSet !== undefined || edit) {
    const setNumber = edit?.setNumber ?? nextSet;
    const form = node('form', { class: 'set-form' }, [
      field(`Hiệp ${setNumber} · tạ`, 'weight', edit?.weight ?? '', { type: 'number', min: '0', step: 'any', required: true }),
      field('Đơn vị', 'unit', edit?.unit || 'kg', { tag: 'select', choices: ['kg', 'lb'] }),
      field('Số lần', 'reps', edit?.reps ?? '', { type: 'number', min: '1', step: '1', required: true }),
      field('RIR', 'rir', edit?.rir ?? '', { type: 'number', min: '0', max: '10', step: 'any', required: true }),
      node('button', { type: 'submit', class: 'primary', text: edit ? 'Lưu thay đổi hiệp' : 'Lưu hiệp' })
    ]);
    if (edit) form.append(button('Hủy sửa', () => { editingSet = null; render(); }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const done = await mutate(next => {
        const set = validateSet(values);
        if (next.draft?.id !== draft.id) throw new Error('Bản nháp đã đổi ở tab khác. Hãy mở lại buổi tập.');
        if (edit) {
          const current = next.draft.sets.find(item => item.id === edit.id);
          ensureUnchanged(current, edit);
          Object.assign(current, set);
        }
        else next.draft.sets.push({ id: id(), exerciseIndex: index, exerciseName: item.name, setNumber, ...set });
      }, `Đã lưu hiệp ${setNumber}.`);
      if (done && edit) { editingSet = null; render(); }
    });
    wrapper.append(form);
  }
  return wrapper;
}

async function completeWorkout() {
  if (!data.draft?.sets.length) { message('Hãy ghi ít nhất một hiệp trước khi hoàn thành.', true); return; }
  const draftId = data.draft.id;
  const saved = await mutate(next => {
    if (next.draft?.id !== draftId || !next.draft.sets.length) throw new Error('Bản nháp đã đổi ở tab khác. Hãy mở lại buổi tập.');
    const session = { ...next.draft, updatedAt: new Date().toISOString() };
    const index = next.sessions.findIndex(item => item.id === session.id);
    if (index >= 0) next.sessions[index] = session;
    else next.sessions.push(session);
    next.draft = null;
  }, 'Đã lưu buổi tập.');
  if (saved) show('history');
}

function historyView() {
  main.append(panel(h2('Lịch sử tập'), p('Mở lại một buổi để sửa hiệp, ngày hoặc ghi chú. Lịch sử giữ tên bài tại thời điểm ghi.', 'hint')));
  const sessions = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date));
  if (!sessions.length) { main.append(panel(p('Chưa có buổi tập nào. Mở một buổi và lưu ít nhất một hiệp.', 'empty'))); return; }
  for (const session of sessions) {
    const box = panel(h3(`${session.date} · Buổi ${session.workout}`), p(`${session.sets.length} hiệp${session.notes ? ` · ${session.notes}` : ''}`, 'summary'));
    const list = node('ul', { class: 'history-list' });
    for (const set of session.sets) list.append(node('li', { text: `${set.exerciseName} · Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}` }));
    box.append(list, div('actions', button('Mở để sửa', () => {
      const expectedDraft = data.draft ? structuredClone(data.draft) : null;
      const open = async () => { if (await mutate(next => {
        if (expectedDraft) ensureUnchanged(next.draft, expectedDraft);
        else if (next.draft) throw new Error('Một tab khác đang có bản nháp. Hãy kiểm tra trước khi mở buổi cũ.');
        const current = next.sessions.find(item => item.id === session.id);
        ensureUnchanged(current, session);
        next.draft = structuredClone(current);
      }, 'Đã mở buổi để sửa.')) show('workout'); };
      if (data.draft) confirmAction('Mở buổi cũ sẽ thay bản nháp đang có. Tiếp tục?', open);
      else open();
    }), button('Xóa buổi', () => confirmAction(`Xóa buổi ${session.workout} ngày ${session.date}?`, () => mutate(next => { next.sessions = next.sessions.filter(item => item.id !== session.id); }, 'Đã xóa buổi tập.')), 'danger')));
    main.append(box);
  }
}

function nutritionView() {
  main.append(panel(h2('Dinh dưỡng'), p('Tự nhập thông tin từ nhãn hoặc nguồn bạn tin cậy. Ứng dụng không có dữ liệu macro mặc định.', 'hint')));
  const foodDate = diaryDate(foodDateSelection);
  const dateField = field('Ngày', 'date', foodDate, { type: 'date' });
  dateField.querySelector('input').addEventListener('change', event => {
    if (!validDate(event.target.value)) { message('Ngày không hợp lệ.', true); return; }
    foodDateSelection = { mode: event.target.value === localDate() ? 'today' : 'selected', date: event.target.value };
    render();
  });
  const totals = dailyTotals(data.entries, foodDate);
  const summary = panel(h2('Tổng trong ngày'), dateField, div('stats',
    stat('Calories', `${fmt(totals.calories)} / ${fmt(data.settings.calories)} kcal`),
    stat('Protein', `${fmt(totals.protein)} / ${fmt(data.settings.protein)} g`),
    stat('Carbs', `${fmt(totals.carbs)} g`), stat('Fat', `${fmt(totals.fat)} g`)));
  summary.append(p('Mục tiêu carbs: DATA NOT DEFINED YET · Chất béo theo plan khoảng 60–75 g/ngày.', 'hint'));
  summary.append(button('Về hôm nay', () => { foodDateSelection = { mode: 'today', date: localDate() }; render(); }));
  main.append(summary);
  renderFoodLibrary();
  renderFoodEntries(foodDate);
}

function renderFoodLibrary() {
  const box = panel(h2('Thư viện món ăn'));
  const editing = data.foods.find(item => item.id === editingFood);
  const form = node('form', { class: 'form-grid' }, [
    field('Tên món', 'name', editing?.name || '', { required: true }),
    field('Khẩu phần (ví dụ 100 g)', 'serving', editing?.serving || '', { required: true }),
    field('Calories / khẩu phần', 'calories', editing?.calories ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Protein (g)', 'protein', editing?.protein ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Carbs (g)', 'carbs', editing?.carbs ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Fat (g)', 'fat', editing?.fat ?? '', { type: 'number', min: '0', step: 'any', required: true }),
    field('Ghi chú nguồn/nhãn', 'notes', editing?.notes || '')
  ]);
  form.append(node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu thay đổi món' : 'Thêm món' }));
  if (editing) form.append(button('Hủy sửa', () => { editingFood = null; render(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      const food = validateFood(raw);
      if (editing) {
        const index = next.foods.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.foods[index], editing);
        next.foods[index] = { ...editing, ...food };
      }
      else next.foods.push({ id: id(), ...food });
    }, editing ? 'Đã sửa món. Bữa cũ vẫn giữ macro đã ghi.' : 'Đã thêm món.');
    if (done) { editingFood = null; render(); }
  });
  box.append(form);
  if (!data.foods.length) box.append(p('Chưa có món nào. Nhập macro từ nhãn thực phẩm để bắt đầu.', 'empty'));
  for (const food of data.foods) {
    box.append(div('list-card', h3(food.name), p(`${food.serving} · ${fmt(food.calories)} kcal · P ${fmt(food.protein)} · C ${fmt(food.carbs)} · F ${fmt(food.fat)}`, 'summary'), food.notes ? p(food.notes, 'hint') : document.createTextNode(''), div('actions', button('Sửa', () => { editingFood = food.id; render(); }), button('Xóa', () => {
      confirmAction(`Xóa món ${food.name} khỏi thư viện? Các bữa đã ghi vẫn giữ nguyên.`, () => mutate(next => { next.foods = next.foods.filter(item => item.id !== food.id); }, 'Đã xóa món khỏi thư viện.'));
    }, 'danger'))));
  }
  main.append(box);
}

function renderFoodEntries(foodDate) {
  const box = panel(h2('Nhật ký ăn trong ngày'));
  const editing = data.entries.find(item => item.id === editingEntry);
  if (data.foods.length || editing) {
    const form = node('form', { class: 'form-grid' }, [
      field('Bữa', 'meal', editing?.meal || 'Breakfast', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] }),
      field('Món', 'foodId', editing?.foodId || data.foods[0]?.id || '', { tag: 'select', choices: [] }),
      field('Số khẩu phần', 'servings', editing?.servings ?? 1, { type: 'number', min: '0.01', step: 'any', required: true })
    ]);
    const select = form.querySelector('[name=foodId]');
    select.replaceChildren(...data.foods.map(food => node('option', { value: food.id, text: `${food.name} · ${food.serving}` })));
    if (editing && !data.foods.some(food => food.id === editing.foodId)) select.prepend(node('option', { value: editing.foodId, text: `${editing.food.name} (đã xóa khỏi thư viện)` }));
    select.value = editing?.foodId || data.foods[0]?.id || '';
    form.append(node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu thay đổi bữa' : 'Ghi bữa ăn' }));
    if (editing) form.append(button('Hủy sửa', () => { editingEntry = null; render(); }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(form));
      const done = await mutate(next => {
        const entry = validateEntry({ ...raw, date: diaryDate(foodDateSelection) });
        const current = editing ? next.entries.find(item => item.id === editing.id) : null;
        if (editing) ensureUnchanged(current, editing);
        const snapshot = foodSnapshotForEntry(current, raw.foodId, next.foods);
        const record = { id: editing?.id || id(), foodId: raw.foodId, food: snapshot, ...entry };
        if (editing) next.entries[next.entries.findIndex(item => item.id === editing.id)] = record;
        else next.entries.push(record);
      }, 'Đã lưu bữa ăn.');
      if (done) { editingEntry = null; render(); }
    });
    box.append(form);
  } else box.append(p('Tạo một món trong thư viện trước khi ghi bữa ăn.', 'empty'));
  const entries = data.entries.filter(item => item.date === foodDate);
  if (!entries.length) box.append(p('Chưa có bữa ăn cho ngày này.', 'empty'));
  for (const entry of entries) box.append(div('list-card', h3(`${entry.meal} · ${entry.food.name}`), p(`${fmt(entry.servings)} × ${entry.food.serving} · ${fmt(entry.food.calories * entry.servings)} kcal · P ${fmt(entry.food.protein * entry.servings)} · C ${fmt(entry.food.carbs * entry.servings)} · F ${fmt(entry.food.fat * entry.servings)}`, 'summary'), div('actions', button('Sửa', () => { editingEntry = entry.id; render(); }), button('Xóa', () => confirmAction('Xóa bữa ăn này?', () => mutate(next => { next.entries = next.entries.filter(item => item.id !== entry.id); }, 'Đã xóa bữa ăn.')), 'danger'))));
  main.append(box);
}

function checkinsView() {
  const editing = data.checkins.find(item => item.id === editingCheckin);
  const box = panel(h2('Check-in cơ thể'), p('Cân nặng và vòng eo là dữ liệu quan sát. Ghi chú gối không phải chẩn đoán hoặc chỉ dẫn tăng tải.', 'hint'));
  const form = node('form', { class: 'form-grid' }, [
    field('Ngày', 'date', editing?.date || localDate(), { type: 'date', required: true }),
    field('Cân nặng (kg)', 'weight', editing?.weight ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Vòng eo (cm)', 'waist', editing?.waist ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Ngủ (giờ)', 'sleep', editing?.sleep ?? '', { type: 'number', min: '0', max: '24', step: 'any' }),
    field('Gối: đau / sưng / mất vững (tùy chọn)', 'knee', editing?.knee || '', { tag: 'textarea' }),
    field('Ghi chú khác', 'notes', editing?.notes || '', { tag: 'textarea' })
  ]);
  form.append(node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu check-in' : 'Thêm check-in' }));
  if (editing) form.append(button('Hủy sửa', () => { editingCheckin = null; render(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      const checkin = { id: editing?.id || id(), ...validateCheckin(raw) };
      if (editing) {
        const index = next.checkins.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.checkins[index], editing);
        next.checkins[index] = checkin;
      }
      else next.checkins.push(checkin);
    }, 'Đã lưu check-in.');
    if (done) { editingCheckin = null; render(); }
  });
  box.append(form);
  main.append(box);
  const history = panel(h2('Dữ liệu đã ghi'));
  if (!data.checkins.length) history.append(p('Chưa có check-in nào.', 'empty'));
  for (const item of [...data.checkins].sort((a, b) => b.date.localeCompare(a.date))) {
    history.append(div('list-card', h3(item.date), p([item.weight !== null ? `${fmt(item.weight)} kg` : '', item.waist !== null ? `${fmt(item.waist)} cm eo` : '', item.sleep !== null ? `${fmt(item.sleep)} giờ ngủ` : ''].filter(Boolean).join(' · ') || 'Ghi chú', 'summary'), item.knee ? p(`Gối: ${item.knee}`, 'hint') : document.createTextNode(''), item.notes ? p(item.notes, 'hint') : document.createTextNode(''), div('actions', button('Sửa', () => { editingCheckin = item.id; render(); window.scrollTo(0, 0); }), button('Xóa', () => confirmAction(`Xóa check-in ${item.date}?`, () => mutate(next => { next.checkins = next.checkins.filter(entry => entry.id !== item.id); }, 'Đã xóa check-in.')), 'danger'))));
  }
  main.append(history);
}

function settingsView() {
  const box = panel(h2('Cài đặt'), p('Tuần chương trình được chọn thủ công. Calories và protein là mức thử ban đầu từ MASTER_PLAN.md; thay đổi tại đây không sửa plan.', 'hint'));
  const form = node('form', { class: 'form-grid' }, [
    field('Tuần chương trình (1–12)', 'week', data.settings.week, { type: 'number', min: '1', max: '12', step: '1', required: true }),
    field('Calories mục tiêu / ngày', 'calories', data.settings.calories, { type: 'number', min: '0', step: 'any', required: true }),
    field('Protein mục tiêu (g/ngày)', 'protein', data.settings.protein, { type: 'number', min: '0', step: 'any', required: true })
  ]);
  form.append(node('button', { type: 'submit', class: 'primary', text: 'Lưu cài đặt' }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    mutate(next => {
      const week = Number(raw.week), calories = Number(raw.calories), protein = Number(raw.protein);
      if (!Number.isInteger(week) || week < 1 || week > 12) throw new Error('Tuần phải từ 1 đến 12.');
      if (!Number.isFinite(calories) || calories < 0 || !Number.isFinite(protein) || protein < 0) throw new Error('Mục tiêu phải là số không âm.');
      next.settings = { week, calories, protein };
    }, 'Đã lưu cài đặt.');
  });
  box.append(form);
  main.append(box);
  const backup = panel(h2('Sao lưu dữ liệu'), p('Bản JSON chứa toàn bộ dữ liệu cấu trúc trên trình duyệt này. Hãy giữ file riêng tư. Ảnh (nếu có trong tương lai) chưa nằm trong bản JSON.', 'hint'), div('actions', button('Chuẩn bị file JSON', exportData, 'primary'), button('Sao chép JSON', copyData)), div('actions', node('span', { id: 'backup-link' })), p('Nếu trình duyệt không tải file, dùng Sao chép JSON và lưu nội dung vào file .json riêng tư.', 'hint'));
  const fileField = field('Chọn file JSON để khôi phục', 'restoreFile', '', { type: 'file' });
  fileField.querySelector('input').setAttribute('accept', '.json,application/json');
  fileField.querySelector('input').addEventListener('change', previewRestore);
  backup.append(h3('Khôi phục dữ liệu'), p('Kiểm tra file và xem trước trước khi thay thế dữ liệu hiện tại.', 'hint'), fileField, div('restore-preview'));
  main.append(backup);
  renderRestorePreview();
}

async function previewRestore(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10_000_000) throw new Error('File JSON quá lớn (tối đa 10 MB).');
    const parsed = parseBackup(await file.text());
    restorePreview = { ...parsed, baseline: JSON.stringify(loadData(localStorage)) };
    renderRestorePreview();
    message('Đã kiểm tra file. Xem số lượng dữ liệu trước khi khôi phục.');
  } catch (error) { restorePreview = null; renderRestorePreview(); message(error.message, true); }
}

function renderRestorePreview() {
  const box = document.querySelector('.restore-preview');
  if (!box) return;
  box.replaceChildren();
  if (!restorePreview) { if (restoreSafetyUrl) URL.revokeObjectURL(restoreSafetyUrl); restoreSafetyUrl = null; return; }
  const counts = restorePreview.counts;
  box.append(h3('Xem trước bản khôi phục'), p(`Xuất lúc: ${restorePreview.exportedAt || 'Không có thông tin (file kiểu cũ)'}`, 'hint'),
    p(`${counts.sessions} buổi tập · ${counts.sets} hiệp · ${counts.foods} thực phẩm · ${counts.entries} bữa ăn · ${counts.checkins} check-in · có cài đặt`, 'summary'));
  if (restoreSafetyUrl) URL.revokeObjectURL(restoreSafetyUrl);
  restoreSafetyUrl = URL.createObjectURL(new Blob([createBackup(data)], { type: 'application/json' }));
  box.append(node('a', { href: restoreSafetyUrl, download: `tracker-before-restore-${localDate()}.json`, class: 'secondary', text: 'Tải bản sao dữ liệu hiện tại' }));
  const acknowledged = field('Tôi đã lưu bản sao dữ liệu hiện tại', 'savedBackup', '', { type: 'checkbox' });
  const checkbox = acknowledged.querySelector('input');
  const restoreButton = button('Khôi phục từ file', restoreData, 'danger');
  restoreButton.disabled = true;
  checkbox.addEventListener('change', () => { restoreButton.disabled = !checkbox.checked; });
  box.append(acknowledged, div('actions', button('Hủy', () => { restorePreview = null; renderRestorePreview(); }), restoreButton));
}

async function restoreData() {
  if (!restorePreview) return;
  const selected = restorePreview;
  const done = await mutate(next => {
    if (JSON.stringify(next) !== selected.baseline) throw new Error('Dữ liệu hiện tại đã đổi sau lúc xem trước. Hãy kiểm tra lại file trước khi khôi phục.');
    for (const key of ['schemaVersion', 'settings', 'sessions', 'foods', 'entries', 'checkins', 'draft']) next[key] = structuredClone(selected.data[key] ?? null);
  }, 'Đã khôi phục dữ liệu từ file.');
  if (done) { restorePreview = null; renderRestorePreview(); }
}

async function copyData() {
  try { await navigator.clipboard.writeText(createBackup(loadData(localStorage))); message('Đã sao chép JSON. Dán vào file .json riêng tư để sao lưu.'); }
  catch { message('Trình duyệt không cho sao chép. Hãy dùng liên kết tải file.', true); }
}

function exportData() {
  try {
    if (backupUrl) URL.revokeObjectURL(backupUrl);
    const blob = new Blob([createBackup(loadData(localStorage))], { type: 'application/json' });
    backupUrl = URL.createObjectURL(blob);
    const link = node('a', { href: backupUrl, download: `tracker-backup-${localDate()}.json`, class: 'primary', text: 'Tải file JSON' });
    document.querySelector('#backup-link').replaceChildren(link);
    message('File đã sẵn sàng. Chọn “Tải file JSON” để lưu.');
  } catch (error) { message(`Không thể xuất dữ liệu: ${error.message}`, true); }
}

try { data = loadData(localStorage); }
catch (error) { data = emptyData(); message(error.message, true); document.querySelectorAll('button').forEach(button => button.disabled = true); throw error; }
updateNavigation();
render();
