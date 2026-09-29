import { PROGRAM, programDay, setCount, targetRir, nextWorkout, weekGuidance } from './program.js';
import { emptyData, loadData, updateData, validateSet, validateFood, validateEntry, validateCheckin, validateCardio, validateKnee, dailyTotals, localDate, weekStart, validDate, diaryDate, foodSnapshotForEntry, createBackup, parseBackup, ensureUnchanged } from './data.js';
import { navigationGroup } from './navigation.js?v=2';
import { previousSetFor, nextIncompleteExercise, restSeconds } from './workout.js';
import { weeklySummary, exerciseHistory } from './progress.js';
import { recentFoods, copyDayEntries, savedMealFromEntries, useSavedMeal, validateRecipe, recipeTotals } from './nutrition.js';

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
let focusMode = false;
let focusIndex = 0;
let restTimer = null;
let editingExerciseNote = null;
let editingCardio = null;
let editingKnee = null;
let progressSubView = 'overview';
let selectedExercise = '';
let nutritionSubView = 'daily';
let editingSavedMeal = null;
let editingRecipe = null;

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
    for (const choice of options.choices) input.append(node('option', { value: typeof choice === 'string' ? choice : choice.value, text: typeof choice === 'string' ? choice : choice.label }));
    input.value = value;
  }
  const wrapper = node('label', { class: options.type === 'checkbox' ? 'field checkbox-field' : options.tag === 'textarea' ? 'field span-all' : 'field' });
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
  ({ dashboard: dashboardView, program: programView, workout: workoutView, history: historyView, 'gym-logs': gymLogsView, nutrition: nutritionView, checkins: checkinsView, settings: settingsView })[view]();
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
  const checkin = panel(h2('Check-in gần nhất'), latest ? p(`${latest.date}${latest.weight !== null ? ` · ${fmt(latest.weight)} kg` : ''}${latest.waist !== null ? ` · ${fmt(latest.waist)} cm eo` : ''}`, 'summary') : p('Chưa có cân nặng hoặc số đo eo. Ghi lần đầu để thấy thay đổi.', 'hint'), button('Ghi check-in', () => { progressSubView = 'checkins'; show('checkins'); }));
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
  chosen.exercises.forEach((item, index) => details.append(div('program-line', node('strong', { text: `${index + 1}. ${item.name}` }), node('span', { text: `${item.sets} × ${item.reps} · nghỉ ${item.rest} · RIR ${item.rir}` }), item.note ? p(item.note, 'hint') : document.createTextNode(''), data.exerciseNotes[`${selectedProgram}:${index}`] ? p(`Ghi chú riêng: ${data.exerciseNotes[`${selectedProgram}:${index}`]}`, 'hint') : document.createTextNode(''))));
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
    restTimer = null;
    focusIndex = 0;
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
  if (restTimer) main.append(restTimerPanel());
  const nextExercise = nextIncompleteExercise(workout.exercises, draft);
  if (focusMode && !workout.exercises[focusIndex]) focusIndex = nextExercise ?? 0;
  const group = panel(div('row', h2(focusMode ? `Bài ${focusIndex + 1} / ${workout.exercises.length}` : 'Ghi từng hiệp'),
    button(focusMode ? 'Xem toàn bộ' : 'Chế độ tập trung', () => { focusMode = !focusMode; focusIndex = nextExercise ?? 0; render(); })));
  if (focusMode) {
    group.append(exerciseBlock(workout.exercises[focusIndex], focusIndex, draft, true), div('actions',
      button('← Bài trước', () => { focusIndex = Math.max(0, focusIndex - 1); render(); }),
      button('Bài sau →', () => { focusIndex = Math.min(workout.exercises.length - 1, focusIndex + 1); render(); })));
  } else workout.exercises.forEach((item, index) => group.append(exerciseBlock(item, index, draft, index === nextExercise)));
  main.append(group);
  const end = panel(h2('Hoàn thành buổi tập'), p('Các hiệp đã ghi được lưu trong lịch sử. Bạn có thể mở lại để sửa sau.', 'hint'), div('actions', button('Hoàn thành & lưu buổi', completeWorkout, 'primary'), button('Bỏ bản nháp', () => confirmAction('Xóa bản nháp buổi tập hiện tại?', () => mutate(next => { next.draft = null; }, 'Đã bỏ bản nháp.')), 'danger')));
  main.append(end);
}

function exerciseBlock(item, index, draft, isNext = false) {
  const saved = draft.sets.filter(set => set.exerciseIndex === index).sort((a, b) => a.setNumber - b.setNumber);
  const previous = previousSets(draft.workout, index, draft.id);
  const wrapper = div(`exercise${isNext ? ' is-next' : ''}`, h3(`${index + 1}. ${item.name}`), p(`${setCount(item, draft.week)} hiệp × ${item.reps} · Nghỉ ${item.rest} · RIR mục tiêu ${targetRir(item, draft.week)}`, 'exercise-meta'));
  if (item.note) wrapper.append(p(item.note, 'hint'));
  const noteKey = `${draft.workout}:${index}`;
  const ownNote = data.exerciseNotes[noteKey] || '';
  if (ownNote) wrapper.append(p(`Ghi chú setup: ${ownNote}`, 'hint'));
  if (editingExerciseNote === noteKey) {
    const noteForm = node('form', { class: 'form-grid' }, [field('Máy, ghế, tay cầm hoặc kỹ thuật cá nhân', 'note', ownNote, { tag: 'textarea', required: true }), node('button', { type: 'submit', class: 'primary', text: 'Lưu ghi chú' })]);
    noteForm.addEventListener('submit', async event => {
      event.preventDefault();
      const value = noteForm.querySelector('[name=note]').value.trim();
      if (!value) { message('Ghi chú không được để trống.', true); return; }
      const saved = await mutate(next => {
        if ((next.exerciseNotes[noteKey] || '') !== ownNote) throw new Error('Ghi chú đã đổi ở tab khác. Hãy mở lại.');
        next.exerciseNotes[noteKey] = value;
      }, 'Đã lưu ghi chú riêng.');
      if (saved) { editingExerciseNote = null; render(); }
    });
    noteForm.append(button('Hủy', () => { editingExerciseNote = null; render(); }));
    wrapper.append(noteForm);
  } else wrapper.append(button(ownNote ? 'Sửa ghi chú riêng' : 'Thêm ghi chú riêng', () => { editingExerciseNote = noteKey; render(); }));
  if (ownNote) wrapper.append(button('Xóa ghi chú riêng', () => confirmAction('Xóa ghi chú setup của bài này?', () => mutate(next => {
    if (next.exerciseNotes[noteKey] !== ownNote) throw new Error('Ghi chú đã đổi ở tab khác. Hãy mở lại.');
    delete next.exerciseNotes[noteKey];
  }, 'Đã xóa ghi chú riêng.')), 'danger'));
  if (previous.length) wrapper.append(p(`Lần trước: ${previous.map(set => `${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}`).join(' | ')}`, 'hint'));
  const list = node('ul', { class: 'set-list' });
  for (const set of saved) {
    const line = node('li', {}, [node('span', { text: `Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}` })]);
    line.append(button('Sửa', () => { editingSet = set.id; render(); }));
    const rest = restSeconds(item.rest);
    if (rest) line.append(button('Nghỉ sau hiệp', () => {
      restTimer = { exercise: item.name, planRest: item.rest, duration: rest, remaining: rest, endAt: Date.now() + rest * 1000, running: true };
      render();
    }));
    line.append(button('Xóa', () => confirmAction(`Xóa hiệp ${set.setNumber} của bài này?`, () => mutate(next => { next.draft.sets = next.draft.sets.filter(item => item.id !== set.id); }, 'Đã xóa hiệp.')), 'danger'));
    list.append(line);
  }
  wrapper.append(list);
  const nextSet = Array.from({ length: setCount(item, draft.week) }, (_, i) => i + 1).find(n => !saved.some(set => set.setNumber === n));
  const edit = saved.find(set => set.id === editingSet);
  if (nextSet !== undefined || edit) {
    const setNumber = edit?.setNumber ?? nextSet;
    const previousSet = previousSetFor(data.sessions, draft.workout, index, setNumber, draft.id);
    const form = node('form', { class: 'set-form' }, [
      field(`Hiệp ${setNumber} · tạ`, 'weight', edit?.weight ?? '', { type: 'number', min: '0', step: 'any', required: true }),
      field('Đơn vị', 'unit', edit?.unit || 'kg', { tag: 'select', choices: ['kg', 'lb'] }),
      field('Số lần', 'reps', edit?.reps ?? '', { type: 'number', min: '1', step: '1', required: true }),
      field('RIR', 'rir', edit?.rir ?? '', { type: 'number', min: '0', max: '10', step: 'any', required: true }),
      node('button', { type: 'submit', class: 'primary', text: edit ? 'Lưu thay đổi hiệp' : 'Lưu hiệp' })
    ]);
    if (!edit && previousSet) {
      const quickFill = button('Dùng số lần trước', () => {
        form.querySelector('[name=weight]').value = previousSet.weight;
        form.querySelector('[name=unit]').value = previousSet.unit || 'kg';
        form.querySelector('[name=reps]').value = previousSet.reps;
        form.querySelector('[name=rir]').value = previousSet.rir;
        form.querySelector('[name=weight]').focus();
      });
      quickFill.classList.add('span-all');
      form.prepend(p(`Hiệp ${setNumber} lần trước: ${fmt(previousSet.weight)} ${previousSet.unit || 'kg'} × ${previousSet.reps} · RIR ${fmt(previousSet.rir)}`, 'hint'), quickFill);
    }
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
      if (done && !edit && focusMode && data.draft) {
        const nextIndex = nextIncompleteExercise(PROGRAM[draft.workout].exercises, data.draft);
        if (nextIndex !== null) { focusIndex = nextIndex; render(); }
      }
    });
    wrapper.append(form);
  }
  return wrapper;
}

function restTimerPanel() {
  const timer = panel(h3('Đồng hồ nghỉ'), p(`${restTimer.exercise} · theo plan: ${restTimer.planRest}. Khoảng nghỉ dùng mức thấp làm mặc định.`, 'hint'));
  const display = node('strong', { class: 'timer-count', text: timerText() });
  timer.append(display, div('actions',
    button('Bắt đầu', () => { restTimer.remaining = restTimer.duration; restTimer.endAt = Date.now() + restTimer.duration * 1000; restTimer.running = true; updateTimerDisplay(); }),
    button('Tạm dừng', () => { if (restTimer.running) restTimer.remaining = Math.max(0, Math.ceil((restTimer.endAt - Date.now()) / 1000)); restTimer.running = false; updateTimerDisplay(); }),
    button('Tiếp tục', () => { if (!restTimer.running && restTimer.remaining > 0) { restTimer.endAt = Date.now() + restTimer.remaining * 1000; restTimer.running = true; updateTimerDisplay(); } }),
    button('Đặt lại', () => { restTimer.remaining = restTimer.duration; restTimer.running = false; updateTimerDisplay(); }),
    button('Bỏ qua', () => { restTimer = null; render(); })));
  return timer;
}

function timerText() {
  if (!restTimer) return '';
  const seconds = restTimer.running ? Math.max(0, Math.ceil((restTimer.endAt - Date.now()) / 1000)) : restTimer.remaining;
  return seconds === 0 ? 'Nghỉ xong' : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  if (!restTimer) return;
  if (restTimer.running && Date.now() >= restTimer.endAt) { restTimer.remaining = 0; restTimer.running = false; }
  const display = document.querySelector('.timer-count');
  if (display) display.textContent = timerText();
}
setInterval(updateTimerDisplay, 1000);

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
  if (saved) { restTimer = null; show('history'); }
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

function gymLogsView() {
  main.append(panel(h2('Cardio & ghi nhận gối'), p('Chỉ ghi lại hoạt động và triệu chứng. Ứng dụng không chẩn đoán hoặc xác nhận gối an toàn để tăng tải.', 'hint')));
  const cardio = data.cardioEntries.find(item => item.id === editingCardio);
  const cardioBox = panel(h2('Cardio'));
  const cardioForm = node('form', { class: 'form-grid' }, [
    field('Ngày', 'date', cardio?.date || localDate(), { type: 'date', required: true }),
    field('Hoạt động', 'activity', cardio?.activity || '', { required: true }),
    field('Thời lượng (phút)', 'durationMinutes', cardio?.durationMinutes ?? '', { type: 'number', min: '1', step: 'any', required: true }),
    field('Quãng đường (km, tùy chọn)', 'distanceKm', cardio?.distanceKm ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Cường độ tự ghi (tùy chọn)', 'intensity', cardio?.intensity || ''),
    field('Ghi chú', 'notes', cardio?.notes || '', { tag: 'textarea' }),
    node('button', { type: 'submit', class: 'primary', text: cardio ? 'Lưu cardio' : 'Thêm cardio' })
  ]);
  if (cardio) cardioForm.append(button('Hủy sửa', () => { editingCardio = null; render(); }));
  cardioForm.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(cardioForm));
    const saved = await mutate(next => {
      const record = { id: cardio?.id || id(), ...validateCardio(raw) };
      if (cardio) {
        const index = next.cardioEntries.findIndex(item => item.id === cardio.id);
        ensureUnchanged(next.cardioEntries[index], cardio);
        next.cardioEntries[index] = record;
      } else next.cardioEntries.push(record);
    }, 'Đã lưu cardio.');
    if (saved) { editingCardio = null; render(); }
  });
  cardioBox.append(cardioForm);
  if (!data.cardioEntries.length) cardioBox.append(p('Chưa ghi cardio.', 'empty'));
  for (const item of [...data.cardioEntries].sort((a, b) => b.date.localeCompare(a.date))) cardioBox.append(div('list-card',
    h3(`${item.date} · ${item.activity}`), p(`${fmt(item.durationMinutes)} phút${item.distanceKm !== null ? ` · ${fmt(item.distanceKm)} km` : ''}${item.intensity ? ` · ${item.intensity}` : ''}`, 'summary'),
    item.notes ? p(item.notes, 'hint') : document.createTextNode(''), div('actions',
      button('Sửa', () => { editingCardio = item.id; render(); }),
      button('Xóa', () => confirmAction(`Xóa cardio ngày ${item.date}?`, () => mutate(next => {
        ensureUnchanged(next.cardioEntries.find(entry => entry.id === item.id), item);
        next.cardioEntries = next.cardioEntries.filter(entry => entry.id !== item.id);
      }, 'Đã xóa cardio.')), 'danger'))));
  main.append(cardioBox);

  const knee = data.kneeEntries.find(item => item.id === editingKnee);
  const kneeBox = panel(h2('Ghi nhận gối'));
  const statusChoices = [{ value: 'unknown', label: 'Chưa ghi' }, { value: 'no', label: 'Không' }, { value: 'yes', label: 'Có' }];
  const kneeForm = node('form', { class: 'form-grid' }, [
    field('Ngày', 'date', knee?.date || localDate(), { type: 'date', required: true }),
    field('Thời điểm', 'moment', knee?.moment || 'after', { tag: 'select', choices: [
      { value: 'during', label: 'Trong buổi tập' }, { value: 'after', label: 'Sau buổi tập' }, { value: 'next-morning', label: 'Sáng hôm sau' }
    ] }),
    field('Đau (0–10, tùy chọn)', 'pain', knee?.pain ?? '', { type: 'number', min: '0', max: '10', step: '1' }),
    field('Sưng', 'swelling', knee?.swelling || 'unknown', { tag: 'select', choices: statusChoices }),
    field('Mất vững', 'instability', knee?.instability || 'unknown', { tag: 'select', choices: statusChoices }),
    field('Cứng', 'stiffness', knee?.stiffness || 'unknown', { tag: 'select', choices: statusChoices }),
    field('Ghi chú', 'notes', knee?.notes || '', { tag: 'textarea' }),
    node('button', { type: 'submit', class: 'primary', text: knee ? 'Lưu ghi nhận gối' : 'Thêm ghi nhận gối' })
  ]);
  if (knee) kneeForm.append(button('Hủy sửa', () => { editingKnee = null; render(); }));
  kneeForm.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(kneeForm));
    const saved = await mutate(next => {
      const record = { id: knee?.id || id(), ...validateKnee(raw) };
      if (knee) {
        const index = next.kneeEntries.findIndex(item => item.id === knee.id);
        ensureUnchanged(next.kneeEntries[index], knee);
        next.kneeEntries[index] = record;
      } else next.kneeEntries.push(record);
    }, 'Đã lưu ghi nhận gối.');
    if (saved) { editingKnee = null; render(); }
  });
  kneeBox.append(kneeForm);
  if (!data.kneeEntries.length) kneeBox.append(p('Chưa có ghi nhận gối có cấu trúc.', 'empty'));
  const statusText = value => ({ yes: 'có', no: 'không', unknown: 'chưa ghi' })[value];
  const momentText = value => ({ during: 'Trong buổi tập', after: 'Sau buổi tập', 'next-morning': 'Sáng hôm sau' })[value];
  for (const item of [...data.kneeEntries].sort((a, b) => b.date.localeCompare(a.date))) kneeBox.append(div('list-card',
    h3(`${item.date} · ${momentText(item.moment)}`), p(`Đau: ${item.pain ?? 'chưa ghi'} · Sưng: ${statusText(item.swelling)} · Mất vững: ${statusText(item.instability)} · Cứng: ${statusText(item.stiffness)}`, 'summary'),
    item.notes ? p(item.notes, 'hint') : document.createTextNode(''), div('actions',
      button('Sửa', () => { editingKnee = item.id; render(); }),
      button('Xóa', () => confirmAction(`Xóa ghi nhận gối ngày ${item.date}?`, () => mutate(next => {
        ensureUnchanged(next.kneeEntries.find(entry => entry.id === item.id), item);
        next.kneeEntries = next.kneeEntries.filter(entry => entry.id !== item.id);
      }, 'Đã xóa ghi nhận gối.')), 'danger'))));
  main.append(kneeBox);
}

function nutritionView() {
  main.append(panel(h2('Dinh dưỡng'), p('Tự nhập thông tin từ nhãn hoặc nguồn bạn tin cậy. Ứng dụng không có dữ liệu macro mặc định.', 'hint')));
  const nav = div('subtabs', ...[
    ['daily', 'Nhật ký ngày'], ['foods', 'Thực phẩm'], ['saved', 'Bữa lưu sẵn'], ['recipes', 'Công thức'], ['summary', 'Tổng kết']
  ].map(([key, label]) => {
    const item = button(label, () => { nutritionSubView = key; render(); });
    item.setAttribute('aria-pressed', String(nutritionSubView === key));
    return item;
  }));
  main.append(nav);
  const foodDate = diaryDate(foodDateSelection);
  if (nutritionSubView === 'foods') { renderFoodLibrary(); return; }
  if (nutritionSubView === 'saved') { renderSavedMeals(foodDate); return; }
  if (nutritionSubView === 'recipes') { renderRecipes(foodDate); return; }
  if (nutritionSubView === 'summary') { renderNutritionSummary(); return; }
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
  const yesterday = new Date(`${foodDate}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const sourceDate = localDate(yesterday);
  summary.append(button('Sao chép ngày hôm trước', () => confirmAction(`Sao chép các món ngày ${sourceDate} vào ${foodDate}? Món đang có sẽ được giữ nguyên.`, () => mutate(next => {
    next.entries.push(...copyDayEntries(next.entries, sourceDate, foodDate, id));
  }, 'Đã sao chép nhật ký ăn.'))));
  main.append(summary);
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
  const search = field('Tìm thực phẩm', 'foodSearch');
  const results = div('food-results');
  const updateResults = () => {
    results.replaceChildren();
    const query = search.querySelector('input').value.trim().toLocaleLowerCase('vi');
    const foods = recentFoods(data.foods, data.entries).filter(food => food.name.toLocaleLowerCase('vi').includes(query));
    if (!foods.length) results.append(p(query ? 'Không tìm thấy thực phẩm phù hợp.' : 'Chưa có món nào. Nhập macro từ nhãn thực phẩm để bắt đầu.', 'empty'));
    for (const food of foods) results.append(div('list-card', h3(food.name), p(`${food.serving} · ${fmt(food.calories)} kcal · P ${fmt(food.protein)} · C ${fmt(food.carbs)} · F ${fmt(food.fat)}`, 'summary'), food.notes ? p(food.notes, 'hint') : document.createTextNode(''), div('actions', button('Sửa', () => { editingFood = food.id; render(); }), button('Xóa', () => {
      confirmAction(`Xóa món ${food.name} khỏi thư viện? Các bữa đã ghi vẫn giữ nguyên.`, () => mutate(next => { next.foods = next.foods.filter(item => item.id !== food.id); }, 'Đã xóa món khỏi thư viện.'));
    }, 'danger'))));
  };
  search.querySelector('input').addEventListener('input', updateResults);
  box.append(search, results);
  updateResults();
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
    select.replaceChildren(...recentFoods(data.foods, data.entries).map(food => node('option', { value: food.id, text: `${food.name} · ${food.serving}` })));
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
  } else box.append(p('Tạo một món trong thư viện trước khi ghi bữa ăn.', 'empty'), button('Mở thư viện thực phẩm', () => { nutritionSubView = 'foods'; render(); }));
  const entries = data.entries.filter(item => item.date === foodDate);
  if (!entries.length) box.append(p('Chưa có bữa ăn cho ngày này.', 'empty'));
  for (const entry of entries) box.append(div('list-card', h3(`${entry.meal} · ${entry.food.name}`), p(`${fmt(entry.servings)} × ${entry.food.serving} · ${fmt(entry.food.calories * entry.servings)} kcal · P ${fmt(entry.food.protein * entry.servings)} · C ${fmt(entry.food.carbs * entry.servings)} · F ${fmt(entry.food.fat * entry.servings)}`, 'summary'), div('actions', button('Sửa', () => { editingEntry = entry.id; render(); }), button('Xóa', () => confirmAction('Xóa bữa ăn này?', () => mutate(next => { next.entries = next.entries.filter(item => item.id !== entry.id); }, 'Đã xóa bữa ăn.')), 'danger'))));
  main.append(box);
}

function renderSavedMeals(foodDate) {
  const editing = data.savedMeals.find(item => item.id === editingSavedMeal);
  const box = panel(h2('Bữa ăn lưu sẵn'), p('Lưu các món đã ghi trong một bữa để dùng lại. Bữa đã ghi luôn giữ macro tại thời điểm thêm.', 'hint'));
  const form = node('form', { class: 'form-grid' }, [
    field('Tên bữa lưu sẵn', 'name', editing?.name || '', { required: true }),
    field('Lấy món từ ngày', 'date', foodDate, { type: 'date', required: true }),
    field('Bữa nguồn', 'meal', 'Breakfast', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] })
  ]);
  if (editing) form.append(field('Thay danh sách món bằng bữa nguồn (tùy chọn)', 'replaceItems', '', { type: 'checkbox' }));
  form.append(node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu thay đổi bữa mẫu' : 'Lưu bữa đang có' }));
  if (editing) form.append(button('Hủy sửa', () => { editingSavedMeal = null; render(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      if (!validDate(raw.date)) throw new Error('Ngày nguồn không hợp lệ.');
      const name = raw.name.trim();
      if (!name) throw new Error('Nhập tên bữa lưu sẵn.');
      if (editing) {
        const index = next.savedMeals.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.savedMeals[index], editing);
        next.savedMeals[index] = { ...editing, name, items: raw.replaceItems !== undefined ? savedMealFromEntries(name, next.entries, raw.date, raw.meal, id).items : editing.items };
      } else next.savedMeals.push(savedMealFromEntries(name, next.entries, raw.date, raw.meal, id));
    }, 'Đã lưu bữa ăn mẫu.');
    if (done) { editingSavedMeal = null; render(); }
  });
  box.append(form);
  if (!data.savedMeals.length) box.append(p('Chưa có bữa lưu sẵn. Ghi món trong Nhật ký ngày, rồi lưu bữa tại đây.', 'empty'));
  for (const template of data.savedMeals) {
    const card = div('list-card', h3(template.name), p(`${template.items.length} món · ${fmt(template.items.reduce((sum, item) => sum + item.food.calories * item.servings, 0))} kcal theo bản mẫu`, 'summary'));
    const list = node('ul', { class: 'history-list' });
    for (const item of template.items) list.append(node('li', { text: `${fmt(item.servings)} × ${item.food.name} · ${fmt(item.food.calories * item.servings)} kcal` }));
    const useForm = node('form', { class: 'form-grid' }, [
      field('Ngày cần ghi', 'date', foodDate, { type: 'date', required: true }),
      field('Bữa cần ghi', 'meal', 'Breakfast', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] }),
      node('button', { type: 'submit', class: 'primary', text: 'Ghi bữa mẫu' })
    ]);
    useForm.addEventListener('submit', async event => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(useForm));
      const done = await mutate(next => {
        if (!validDate(raw.date)) throw new Error('Ngày không hợp lệ.');
        const current = next.savedMeals.find(item => item.id === template.id);
        ensureUnchanged(current, template);
        next.entries.push(...useSavedMeal(current, raw.date, raw.meal, id));
      }, 'Đã ghi bữa mẫu vào nhật ký.');
      if (done) { foodDateSelection = { mode: raw.date === localDate() ? 'today' : 'selected', date: raw.date }; nutritionSubView = 'daily'; render(); }
    });
    card.append(list, useForm, div('actions', button('Sửa mẫu', () => { editingSavedMeal = template.id; render(); }),
      button('Xóa mẫu', () => confirmAction(`Xóa bữa mẫu ${template.name}? Nhật ký cũ vẫn giữ nguyên.`, () => mutate(next => {
        ensureUnchanged(next.savedMeals.find(item => item.id === template.id), template);
        next.savedMeals = next.savedMeals.filter(item => item.id !== template.id);
      }, 'Đã xóa bữa mẫu.')), 'danger')));
    box.append(card);
  }
  main.append(box);
}

function renderRecipes(foodDate) {
  const editing = data.recipes.find(item => item.id === editingRecipe);
  const box = panel(h2('Công thức'), p('Nhập nguyên liệu và dinh dưỡng từ nguồn của bạn. Nếu chưa biết đủ macro, để trống cả bốn ô; ứng dụng không tự ước tính.', 'hint'));
  const form = node('form', { class: 'form-grid' }, [
    field('Tên công thức', 'name', editing?.name || '', { required: true }),
    field('Số phần', 'servings', editing?.servings ?? 1, { type: 'number', min: '0.01', step: 'any', required: true }),
    field('Mô tả', 'description', editing?.description || ''),
    field('Nguyên liệu, mỗi dòng: số lượng | đơn vị | tên', 'ingredients', editing?.ingredients.map(item => `${item.quantity} | ${item.unit} | ${item.name}`).join('\n') || '', { tag: 'textarea', required: true }),
    field('Các bước, mỗi dòng một bước', 'steps', editing?.steps.join('\n') || '', { tag: 'textarea', required: true }),
    field('Thẻ (cách nhau bằng dấu phẩy)', 'tags', editing?.tags.join(', ') || ''),
    field('Calories / phần (tùy chọn)', 'calories', editing?.nutritionPerServing?.calories ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Protein / phần (g)', 'protein', editing?.nutritionPerServing?.protein ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Carbs / phần (g)', 'carbs', editing?.nutritionPerServing?.carbs ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Fat / phần (g)', 'fat', editing?.nutritionPerServing?.fat ?? '', { type: 'number', min: '0', step: 'any' }),
    field('Ghi chú nấu ăn', 'notes', editing?.notes || '', { tag: 'textarea' }),
    node('button', { type: 'submit', class: 'primary', text: editing ? 'Lưu công thức' : 'Thêm công thức' })
  ]);
  if (editing) form.append(button('Hủy sửa', () => { editingRecipe = null; render(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    const done = await mutate(next => {
      const recipe = { id: editing?.id || id(), ...validateRecipe(raw) };
      if (editing) {
        const index = next.recipes.findIndex(item => item.id === editing.id);
        ensureUnchanged(next.recipes[index], editing);
        next.recipes[index] = recipe;
      } else next.recipes.push(recipe);
    }, 'Đã lưu công thức.');
    if (done) { editingRecipe = null; render(); }
  });
  box.append(form);
  if (!data.recipes.length) box.append(p('Chưa có công thức nào.', 'empty'));
  for (const recipe of data.recipes) {
    const detail = node('details', { class: 'recipe-detail' }, [node('summary', { text: `${recipe.name} · ${fmt(recipe.servings)} phần` })]);
    if (recipe.description) detail.append(p(recipe.description, 'summary'));
    const ingredients = node('ul', { class: 'history-list' });
    for (const item of recipe.ingredients) ingredients.append(node('li', { text: `${fmt(item.quantity)} ${item.unit} · ${item.name}` }));
    const steps = node('ol', { class: 'history-list' });
    for (const step of recipe.steps) steps.append(node('li', { text: step }));
    detail.append(h3('Nguyên liệu'), ingredients, h3('Cách làm'), steps);
    const total = recipeTotals(recipe);
    detail.append(p(recipe.nutritionPerServing ? `Mỗi phần: ${fmt(recipe.nutritionPerServing.calories)} kcal · P ${fmt(recipe.nutritionPerServing.protein)} · C ${fmt(recipe.nutritionPerServing.carbs)} · F ${fmt(recipe.nutritionPerServing.fat)}. Toàn công thức: ${fmt(total.calories)} kcal.` : 'Dinh dưỡng: DATA NOT DEFINED YET', 'hint'));
    if (recipe.tags.length) detail.append(p(`Thẻ: ${recipe.tags.join(', ')}`, 'hint'));
    if (recipe.notes) detail.append(p(`Ghi chú: ${recipe.notes}`, 'hint'));
    if (recipe.nutritionPerServing) {
      const logForm = node('form', { class: 'form-grid' }, [
        field('Ngày ghi', 'date', foodDate, { type: 'date', required: true }),
        field('Bữa', 'meal', 'Custom', { tag: 'select', choices: ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'] }),
        field('Số phần', 'servings', 1, { type: 'number', min: '0.01', step: 'any', required: true }),
        node('button', { type: 'submit', class: 'primary', text: 'Ghi vào nhật ký ăn' })
      ]);
      logForm.addEventListener('submit', async event => {
        event.preventDefault();
        const raw = Object.fromEntries(new FormData(logForm));
        const done = await mutate(next => {
          const current = next.recipes.find(item => item.id === recipe.id);
          ensureUnchanged(current, recipe);
          const entry = validateEntry(raw);
          next.entries.push({ id: id(), ...entry, foodId: `recipe:${recipe.id}`, food: { name: recipe.name, serving: '1 phần', ...structuredClone(recipe.nutritionPerServing) } });
        }, 'Đã ghi công thức vào nhật ký.');
        if (done) { foodDateSelection = { mode: raw.date === localDate() ? 'today' : 'selected', date: raw.date }; nutritionSubView = 'daily'; render(); }
      });
      detail.append(logForm);
    }
    detail.append(div('actions', button('Sửa công thức', () => { editingRecipe = recipe.id; render(); }),
      button('Xóa công thức', () => confirmAction(`Xóa công thức ${recipe.name}? Nhật ký ăn cũ vẫn giữ nguyên.`, () => mutate(next => {
        ensureUnchanged(next.recipes.find(item => item.id === recipe.id), recipe);
        next.recipes = next.recipes.filter(item => item.id !== recipe.id);
      }, 'Đã xóa công thức.')), 'danger')));
    box.append(detail);
  }
  main.append(box);
}

function renderNutritionSummary() {
  const current = weekStart();
  const box = panel(h2('Tổng kết dinh dưỡng'), p('Trung bình chỉ tính ngày đã ghi món. Ngày trống không được tính là 0.', 'hint'));
  let hasData = false;
  for (let index = 0; index < 4; index++) {
    const date = new Date(`${current}T12:00:00`);
    date.setDate(date.getDate() - index * 7);
    const week = weeklySummary(data, localDate(date));
    if (!week.nutritionDays) continue;
    hasData = true;
    box.append(div('list-card', h3(`${week.start} → ${week.end}`), p(`${week.nutritionDays} ngày ghi ăn · ${fmt(week.calorieAverage)} kcal/ngày · ${fmt(week.proteinAverage)} g protein/ngày · đạt mục tiêu protein ${week.proteinDaysMet}/${week.nutritionDays} ngày ghi`, 'summary')));
  }
  if (!hasData) box.append(p('Chưa có ngày ăn nào được ghi trong 4 tuần gần đây.', 'empty'));
  main.append(box);
}

function checkinsView() {
  const nav = div('subtabs', button('Tổng quan tiến độ', () => { progressSubView = 'overview'; render(); }), button('Nhập & xem check-in', () => { progressSubView = 'checkins'; render(); }));
  main.append(nav);
  if (progressSubView === 'overview') { progressOverview(); return; }
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

function progressOverview() {
  const current = weekStart();
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(`${current}T12:00:00`);
    date.setDate(date.getDate() - index * 7);
    return weeklySummary(data, localDate(date));
  });
  const latest = weeks[0];
  const box = panel(h2('Tổng kết tuần'), p(`${latest.start} → ${latest.end} · chỉ tính những ngày có dữ liệu thực.`, 'hint'));
  box.append(div('stats', stat('Buổi tập', String(latest.workouts)), stat('Cardio', `${fmt(latest.cardioMinutes)} phút`),
    stat('Cân trung bình', latest.weightAverage === null ? 'Chưa có' : `${fmt(latest.weightAverage)} kg`),
    stat('Eo trung bình', latest.waistAverage === null ? 'Chưa có' : `${fmt(latest.waistAverage)} cm`)));
  box.append(p(`A ${latest.sessionCounts.A} · B ${latest.sessionCounts.B} · C ${latest.sessionCounts.C} · D ${latest.sessionCounts.D} · ${latest.kneeRecords} ghi nhận gối`, 'summary'));
  box.append(p(latest.nutritionDays ? `Đã ghi ăn ${latest.nutritionDays} ngày · trung bình ${fmt(latest.calorieAverage)} kcal, ${fmt(latest.proteinAverage)} g protein · đạt mục tiêu protein ${latest.proteinDaysMet}/${latest.nutritionDays} ngày đã ghi.` : 'Chưa có dữ liệu ăn uống trong tuần; ngày chưa ghi không được tính là ăn 0 kcal.', latest.nutritionDays ? 'summary' : 'empty'));
  main.append(box);
  const trend = panel(h2('4 tuần gần đây'), p('Trung bình chỉ dựa trên những lần bạn thực sự ghi. Chưa có dữ liệu được hiển thị riêng.', 'hint'));
  const observedWeeks = weeks.filter(week => week.workouts || week.weightAverage !== null || week.waistAverage !== null || week.nutritionDays || week.cardioMinutes || week.kneeRecords);
  if (!observedWeeks.length) trend.append(p('Chưa có dữ liệu tiến độ trong 4 tuần gần đây.', 'empty'));
  for (const week of observedWeeks) trend.append(div('list-card', h3(`${week.start} → ${week.end}`),
    p(`${week.workouts} buổi tập · cân TB ${week.weightAverage === null ? 'chưa có' : `${fmt(week.weightAverage)} kg`} · eo TB ${week.waistAverage === null ? 'chưa có' : `${fmt(week.waistAverage)} cm`}`, 'summary'),
    p(week.nutritionDays ? `${week.nutritionDays} ngày ghi ăn · ${fmt(week.calorieAverage)} kcal/ngày · ${fmt(week.proteinAverage)} g protein/ngày` : 'Chưa ghi ăn tuần này.', 'hint')));
  main.append(trend);
  const names = [...new Set(data.sessions.flatMap(session => session.sets.map(set => set.exerciseName)))].sort();
  const exerciseBox = panel(h2('Lịch sử theo bài'), p('Số liệu được ghi lại; ứng dụng không tự yêu cầu tăng tạ.', 'hint'));
  if (!names.length) exerciseBox.append(p('Chưa có hiệp tập nào để xem.', 'empty'));
  else {
    if (!names.includes(selectedExercise)) selectedExercise = names[0];
    const selector = field('Chọn bài', 'exercise', selectedExercise, { tag: 'select', choices: names });
    selector.querySelector('select').addEventListener('change', event => { selectedExercise = event.target.value; render(); });
    exerciseBox.append(selector);
    const history = exerciseHistory(data.sessions, selectedExercise);
    for (const set of history.slice(0, 20)) exerciseBox.append(div('list-card', p(`${set.date} · Buổi ${set.workout} · Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}`, 'summary')));
  }
  main.append(exerciseBox);
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
    p(`${counts.sessions} buổi tập · ${counts.sets} hiệp · ${counts.foods} thực phẩm · ${counts.entries} bữa ăn · ${counts.checkins} check-in · ${counts.cardio} cardio · ${counts.knee} ghi gối · ${counts.savedMeals} bữa lưu · ${counts.recipes} công thức · có cài đặt`, 'summary'));
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
    for (const key of ['schemaVersion', 'settings', 'sessions', 'foods', 'entries', 'checkins', 'draft', 'exerciseNotes', 'cardioEntries', 'kneeEntries', 'savedMeals', 'recipes']) next[key] = structuredClone(selected.data[key] ?? null);
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
