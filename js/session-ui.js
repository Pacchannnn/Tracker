import { runtimeView, nextIncompleteSlot, nextSetNumber, previousOccurrences, previousValues, replacementLabel } from './session-readers.js?v=30';
import { sessionGeneration, legacyHistoryEditBase } from './session-identity.js?v=30';
import { sessionTitle } from './custom-workout.js?v=30';
import { restSeconds } from './workout.js?v=30';
import { createLiveWorkoutUI } from './live-workout-ui.js?v=30';

export function createSessionUI(context) {
  const { main, getData, getLatest, store, action: persistAction, render, show, openWorkout, nextWorkoutInfo, mutate: persistMutate, restPanel, startRest, clearRest, registerUrl, helpers } = context;
  const { node, button, panel, div, p, h2, h3, field, fmt, confirmAction, message } = helpers;
  let focusMode = false, focusSlotId = null, editingSet = null, editingNote = null;
  let pending = 0;
  const choices = new Map();
  const formSavers = new WeakMap();
  function syncBusy() {
    const busy = pending > 0 || store.status().state === 'saving';
    main.querySelectorAll('button,input,select,textarea').forEach(control => {
      if (busy) { if (control.dataset.sessionBusyDisabled === undefined) control.dataset.sessionBusyDisabled = String(control.disabled); control.disabled = true; }
      else if (control.dataset.sessionBusyDisabled !== undefined) { control.disabled = control.dataset.sessionBusyDisabled === 'true'; delete control.dataset.sessionBusyDisabled; }
    });
  }
  async function runWrite(operation) {
    pending++; syncBusy();
    try { return await operation(); } finally { pending--; syncBusy(); }
  }
  const action = (operation, success, options) => runWrite(() => persistAction(operation, success, options));
  const mutate = (change, success) => runWrite(() => persistMutate(change, success));
  const command = (intent, draft, success, options) => action(() => store.command(intent, draft), success, options);
  const controlled = element => { element.dataset.sessionControl = ''; return element; };
  const writeButton = (text, fn, kind) => controlled(button(text, fn, kind));
  function guardUnsaved(except = null) {
    if (pending || store.status().state === 'saving') { message('Đang lưu. Đợi hoàn tất trước khi đổi màn hình hoặc nhập thêm.', true); return false; }
    const dirty = dirtyForms().some(form => form !== except);
    if (dirty) message('Có phần nhập chưa lưu. Lưu hiệp/ngày/ghi chú hoặc đưa các ô về giá trị ban đầu trước khi đổi màn hình.', true);
    return !dirty;
  }
  const cleanAction = fn => (...args) => { if (guardUnsaved()) return fn(...args); };
  function dirtyForms() {
    return [...main.querySelectorAll('[data-session-form]')].filter(form =>
      [...form.querySelectorAll('input,select,textarea')].some(input => input.dataset.initialValue !== undefined && (input.validity?.badInput || input.value !== input.dataset.initialValue)));
  }
  const liveUI = createLiveWorkoutUI({ main, getData, command, render, dirtyForms,
    pendingWrite: () => pending > 0 || store.status().state === 'saving', focusSlot: id => { focusSlotId = id; }, helpers,
    saveForms: async forms => {
      for (const form of forms) { if (!await formSavers.get(form)?.(true)) return false; }
      return true;
    } });

  function statusView() {
    const status = p('', 'hint'); status.setAttribute('role', 'status');
    let connected = false;
    const unsubscribe = store.subscribe(value => {
      if (status.isConnected) connected = true; else if (connected) { unsubscribe(); return; }
      status.textContent = value.state === 'saving' ? 'Đang lưu buổi…' : value.state === 'saved' ? 'Buổi đã lưu trên thiết bị.' : value.state === 'error' ? `CHƯA LƯU: ${value.message}` : 'Hiệp được lưu sau khi bấm Lưu.';
      status.classList.toggle('error', value.state === 'error');
      if (connected) syncBusy();
    });
    queueMicrotask(() => { connected = status.isConnected; if (connected) syncBusy(); });
    return status;
  }
  function recoveryPanel(draft, ambiguous) {
    const base = draft.historyEditBase ?? legacyHistoryEditBase(draft, getData().sessions);
    if (!base && !ambiguous) return null;
    const box = panel(h2(ambiguous ? 'Giữ dữ liệu buổi cũ' : 'Đang sửa lịch sử'),
      p(base?.kind === 'legacy-unknown' ? 'Không biết baseline lúc mở buổi cũ. Không ghi đè nguồn; giữ bản nháp, lưu bản sao riêng hoặc mở lại nguồn mới nhất.' :
        ambiguous ? 'Ownership còn mơ hồ. Chỉ sửa ngày/ghi chú hoặc hiệp có ID duy nhất; không ghi hiệp mới hay Quick Fill.' : 'Hoàn thành chỉ cập nhật nguồn nếu nó vẫn giống lúc bạn mở. Nguồn bị đổi/xóa sẽ chặn ghi đè.', 'warning'));
    const raw = JSON.stringify({ schemaVersion: 8, draft }, null, 2), url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); registerUrl(url);
    box.append(p('File bản nháp riêng giúp giữ candidate; không phải bản sao toàn bộ app để nhập ở Settings.', 'hint'),
      node('a', { href: url, download: 'tracker-workout-candidate.json', text: 'Xuất bản nháp riêng', class: 'secondary' }),
      button('Sao chép bản nháp JSON', async () => { try { await navigator.clipboard.writeText(raw); message('Đã sao chép bản nháp riêng. Giữ file này riêng tư.'); } catch { message('Không thể sao chép; dùng Xuất bản nháp riêng.', true); } }));
    if (!ambiguous && draft.sets.length) box.append(writeButton('Lưu bản sao lịch sử riêng', () => confirmAction(
      `Tạo một buổi riêng ngày ${draft.date}, ${draft.sets.length} hiệp? Buổi này được tính thêm vào lịch sử; không ghi đè nguồn.`, async () => {
        if (guardUnsaved() && await command({ type: 'copy-history' }, draft, 'Đã lưu bản sao riêng.')) { clearRest(); show('history'); }
      }), 'secondary'));
    if (base) box.append(button('Xem nguồn mới nhất', () => {
      let source; try { source = getLatest().sessions.find(item => item.id === draft.id); } catch (error) { message(error.message, true); return; }
      const preview = panel(h3(source ? `${source.date} · ${sessionTitle(source)} · nguồn mới nhất` : 'Nguồn đã bị xóa'),
        p(source ? `${source.sets.length} hiệp · ${source.notes || 'Không có ghi chú'}` : 'Candidate vẫn được giữ; không tự khôi phục nguồn.', 'hint'));
      if (source) {
        for (const set of source.sets) preview.append(p(`${set.exerciseName} · ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${set.rir}`));
        preview.append(writeButton('Mở lại nguồn mới nhất', () => confirmAction('Thay candidate đang sửa bằng nguồn mới nhất? Hãy export phần cần giữ trước; tự áp dụng lại thay đổi sau khi mở.', async () => {
          if (await action(() => store.reopen(source, draft), 'Đã mở nguồn mới nhất với baseline mới.')) { editingSet = null; show('workout'); }
        })));
      }
      box.querySelector('[data-source-preview]')?.remove(); preview.dataset.sourcePreview = ''; box.append(preview);
    }));
    return box;
  }

  function setList(draft, sets, slotId, canEdit = true) {
    const list = node('ul', { class: 'set-list' });
    for (const set of sets) {
      const line = node('li', {}, [node('span', { text: `Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}` })]);
      if (canEdit && draft.sets.filter(item => item.id === set.id).length === 1) {
        line.append(button('Sửa', cleanAction(() => { editingSet = set.id; render(); })), writeButton('Xóa', cleanAction(() => confirmAction(`Xóa hiệp ${set.setNumber} của ${set.exerciseName}?`, () => command({ type: 'delete', setId: set.id, slotId }, draft, 'Đã xóa đúng hiệp.'))), 'danger'));
      }
      list.append(line);
    }
    return list;
  }
  function setForm(draft, slot, edit = null, previous = null) {
    const number = edit?.setNumber ?? nextSetNumber(draft, slot);
    if (number === null) return null;
    const form = node('form', { class: 'set-form', 'data-workout-set-form': '', 'data-session-form': '' }, [
      field(`Hiệp ${number} · tạ`, 'weight', edit?.weight ?? '', { type: 'number', min: '0', step: 'any', required: true }),
      field('Đơn vị', 'unit', edit?.unit || 'kg', { tag: 'select', choices: ['kg','lb'] }),
      field('Số lần', 'reps', edit?.reps ?? '', { type: 'number', min: '1', step: '1', required: true }),
      field('RIR', 'rir', edit?.rir ?? '', { type: 'number', min: '0', max: '10', step: 'any', required: true }),
      controlled(node('button', { type: 'submit', class: 'primary', text: edit ? 'Lưu thay đổi hiệp' : 'Lưu hiệp' }))
    ]);
    form.querySelectorAll('input,select').forEach(input => { input.dataset.initialValue = input.value; controlled(input); });
    if (!edit && previous?.occurrences.length) {
      const key = `${draft.id}:${slot.id}`, quick = button('Dùng số lần trước', () => {
        const values = previousValues(previous, choices.get(key), number); if (!values) return;
        for (const [name, value] of Object.entries(values)) form.querySelector(`[name=${name}]`).value = value;
        form.querySelector('[name=weight]').focus();
      });
      quick.disabled = !previousValues(previous, choices.get(key), number); quick.classList.add('span-all');
      if (previous.occurrences.length > 1) {
        const select = field('Chọn lần xuất hiện trước để điền', 'previousOccurrence', choices.get(key) || '', { tag: 'select', choices: [
          { value: '', label: 'Chọn một occurrence' }, ...previous.occurrences.map(item => ({ value: item.id, label: `${item.label}${item.quickFillAllowed ? '' : ' · chỉ xem'}` }))] });
        select.classList.add('span-all'); select.querySelector('select').addEventListener('change', event => { choices.set(key, event.target.value); quick.disabled = !previousValues(previous, event.target.value, number); });
        form.prepend(select);
      }
      form.prepend(p(`Lần trước ${previous.date}: ${previous.occurrences.map(item => `${item.label}: ${item.sets.map(set => `${set.weight} ${set.unit || 'kg'} × ${set.reps}`).join(' | ')}${item.quickFillAllowed ? '' : ' (ownership mơ hồ, chỉ xem)'}`).join('; ')}`, 'hint'), quick);
    }
    if (edit) form.append(button('Hủy sửa', () => { if (guardUnsaved(form)) { editingSet = null; render(); } }));
    const save = async (deferRender = false) => {
      if (!deferRender && !guardUnsaved(form)) return false;
      const values = Object.fromEntries(new FormData(form));
      const intent = edit ? { type: 'edit', setId: edit.id, slotId: slot?.id ?? null, values } : { type: 'log', slotId: slot.id, setNumber: number, values };
      if (await command(intent, deferRender ? getData().draft : draft, edit ? 'Đã lưu thay đổi hiệp.' : `Đã lưu hiệp ${number}.`, { renderAfter: !deferRender })) {
        editingSet = null;
        form.querySelectorAll('input,select').forEach(input => { if (input.dataset.initialValue !== undefined) input.dataset.initialValue = input.value; });
        if (focusMode && getData().draft) focusSlotId = nextIncompleteSlot(getData().draft) ?? slot?.id ?? null;
        if (!deferRender) render();
        return true;
      }
      return false;
    };
    formSavers.set(form, save);
    form.addEventListener('submit', event => { event.preventDefault(); save(); });
    return form;
  }
  function setupNotes(slot) {
    const match = /^original:([ABCD]):(\d+)$/.exec(slot.sourceSlotId ?? ''), key = match ? `${match[1]}:${match[2]}` : `exercise:${slot.exerciseId ?? slot.id}`;
    const own = getData().exerciseNotes[key] || '', box = div('');
    if (slot.snapshot.setupNote) box.append(p(`Setup đã giữ cho buổi: ${slot.snapshot.setupNote}`, 'hint'));
    if (own) box.append(p(`Ghi chú dùng lại cho buổi sau: ${own}`, 'hint'));
    if (editingNote === key) {
      const form = node('form', { class: 'form-grid', 'data-session-form': '' }, [field('Máy, ghế, tay cầm hoặc kỹ thuật cá nhân', 'note', own, { tag: 'textarea', required: true }), node('button', { type: 'submit', class: 'primary', text: 'Lưu ghi chú' })]);
      form.querySelector('textarea').dataset.initialValue = own;
      form.addEventListener('submit', async event => {
        event.preventDefault(); if (!guardUnsaved(form)) return; const value = form.querySelector('[name=note]').value.trim(); if (!value) { message('Ghi chú không được để trống.', true); return; }
        if (await mutate(next => { if ((next.exerciseNotes[key] || '') !== own) throw new Error('Ghi chú đã đổi ở tab khác. Hãy mở lại.'); next.exerciseNotes[key] = value; }, 'Đã lưu ghi chú dùng lại; setup snapshot buổi này giữ nguyên.')) { editingNote = null; render(); }
      });
      form.append(button('Hủy', () => { if (guardUnsaved(form)) { editingNote = null; render(); } })); box.append(form);
    } else box.append(button(own ? 'Sửa ghi chú riêng' : 'Thêm ghi chú riêng', cleanAction(() => { editingNote = key; render(); })));
    if (own) box.append(button('Xóa ghi chú riêng', cleanAction(() => confirmAction('Xóa ghi chú dùng lại cho buổi sau? Snapshot buổi đang tập giữ nguyên.', () => mutate(next => {
      if (next.exerciseNotes[key] !== own) throw new Error('Ghi chú đã đổi ở tab khác.'); delete next.exerciseNotes[key];
    }, 'Đã xóa ghi chú dùng lại.'))), 'danger'));
    return box;
  }
  function exerciseBlock(draft, slot, index, display = draft) {
    const snapshot = slot.snapshot, sets = display.sets.filter(set => set.slotId === slot.id).sort((a,b) => a.setNumber - b.setNumber);
    const box = div(`exercise${slot.id === nextIncompleteSlot(draft) ? ' is-next' : ''}`, h3(`${index + 1}. ${snapshot.name}`),
      p(`${snapshot.sets} hiệp × ${snapshot.reps} · Nghỉ ${snapshot.rest} · RIR mục tiêu ${snapshot.rir}`, 'exercise-meta'));
    if (snapshot.notes) box.append(p(snapshot.notes, 'hint'));
    const replacement = replacementLabel(display, slot); if (replacement) box.append(p(replacement, 'summary'));
    box.append(setupNotes(slot), setList(draft, sets, slot.id));
    const structural = liveUI.controls(draft, slot); if (structural) box.append(structural);
    if (sets.length && restSeconds(snapshot.rest)) box.append(button('Nghỉ sau hiệp', cleanAction(() => startRest(snapshot.name, snapshot.rest))));
    if (slot.status !== 'active') box.append(p(`${slot.status === 'removed' ? 'Dừng bài' : 'Bài đã thay'} · đã ghi ${sets.length}/${snapshot.sets} hiệp. Giữ phần đã ghi; không ghi hiệp mới vào đây.`, 'hint'));
    const edit = sets.find(set => set.id === editingSet);
    if (edit || slot.status === 'active') {
      const form = setForm(draft, slot, edit, previousOccurrences(getData().sessions, draft, slot)); if (form) box.append(form);
    }
    return box;
  }
  function workoutView() {
    const draft = getData().draft;
    if (!draft) {
      const next = nextWorkoutInfo(); main.append(panel(h2('Chọn buổi tập'), p(`${next.planName} · ${next.title}`, 'summary'),
        div('actions', button('Mở buổi kế tiếp', next.begin, 'primary'), button('Tạo buổi riêng', () => show('builder')), button('Xem kế hoạch', () => show('plans'))),
        div('actions', ...['A','B','C','D'].map(key => button(`Buổi ${key}`, () => openWorkout(key), 'primary'))))); return;
    }
    const view = runtimeView(draft, getData().exerciseNotes), display = view.session;
    const header = panel(h2(sessionTitle(draft)), p(`${draft.workoutSnapshot?.planName || `Original Plan · tuần ${draft.week}`} · ${draft.date} · ${draft.sets.length} hiệp đã ghi`, 'summary'),
      p('Ghi DB theo mỗi tay; barbell tính cả thanh. Ghi đúng đơn vị/tên máy. Theo MASTER_PLAN.md.', 'hint'), statusView());
    if (['B','D'].includes(draft.workout)) header.append(p('Bài chân chỉ khi được phép trở lại tập sức mạnh và không có hạn chế riêng sau mổ; không tập xuyên đau/sưng/mất vững. Xem MASTER_PLAN.md.', 'warning'));
    if (sessionGeneration(draft) === 'legacy' && !view.ambiguous) header.append(p('Buổi cũ: nội dung khởi tạo từ quy tắc cũ khi bạn lưu thay đổi đầu tiên.', 'hint'));
    const details = node('form', { class: 'form-grid', 'data-session-form': '' }, [field('Ngày tập', 'date', draft.date, { type: 'date', required: true }), field('Ghi chú buổi', 'notes', draft.notes),
      controlled(node('button', { type: 'submit', class: 'secondary', text: 'Lưu ngày & ghi chú' }))]);
    details.querySelectorAll('input').forEach(input => { input.dataset.initialValue = input.value; controlled(input); });
    details.addEventListener('submit', event => { event.preventDefault(); if (guardUnsaved(details)) command({ type: 'metadata', patch: Object.fromEntries(new FormData(details)) }, draft, 'Đã lưu ngày và ghi chú buổi.'); });
    header.append(details); main.append(header);
    const structuralHeader = liveUI.header(draft); if (structuralHeader) main.append(structuralHeader);
    const recovery = recoveryPanel(draft, view.ambiguous); if (recovery) main.append(recovery);
    const rest = restPanel(); if (rest) main.append(rest);
    if (view.ambiguous) {
      const box = panel(h2('Hiệp cũ — giữ tên/ownership đã lưu'), p(view.reasons.join('; '), 'hint'));
      for (const set of draft.sets) {
        box.append(h3(set.exerciseName), setList(draft, [set], null));
        if (set.id === editingSet && draft.sets.filter(item => item.id === set.id).length === 1) box.append(setForm(draft, null, set));
      }
      main.append(box);
    } else {
      const active = view.slots.filter(slot => slot.status === 'active'), next = nextIncompleteSlot(display);
      if (!active.some(slot => slot.id === focusSlotId)) focusSlotId = next ?? active[0]?.id ?? null;
      const group = panel(div('row', h2(focusMode ? 'Chế độ tập trung' : 'Ghi từng hiệp'), button(focusMode ? 'Xem toàn bộ' : 'Chế độ tập trung', cleanAction(() => { focusMode = !focusMode; focusSlotId = next ?? active[0]?.id ?? null; render(); }))));
      if (focusMode && focusSlotId) {
        const index = view.slots.findIndex(slot => slot.id === focusSlotId), activeIndex = active.findIndex(slot => slot.id === focusSlotId);
        group.append(exerciseBlock(draft, view.slots[index], index, display), div('actions', button('← Bài trước', cleanAction(() => { focusSlotId = active[Math.max(0, activeIndex - 1)].id; render(); })), button('Bài sau →', cleanAction(() => { focusSlotId = active[Math.min(active.length - 1, activeIndex + 1)].id; render(); }))));
      } else if (focusMode) { group.append(p('Không còn mục đang tập. Hiệp đã ghi vẫn được giữ.', 'empty')); view.slots.forEach((slot,index) => group.append(exerciseBlock(draft,slot,index,display))); }
      else view.slots.forEach((slot,index) => group.append(exerciseBlock(draft, slot, index, display)));
      main.append(group);
    }
    main.append(panel(h2('Hoàn thành buổi tập'), p('Complete lưu buổi và đóng bản nháp trong cùng lần ghi.', 'hint'), div('actions',
      writeButton('Hoàn thành & lưu buổi', async () => {
        if (!guardUnsaved()) return;
        if (details.querySelector('[name=date]').value !== draft.date || details.querySelector('[name=notes]').value !== (draft.notes || '')) { message('Lưu ngày & ghi chú trước khi hoàn thành.', true); return; }
        const dirty = [...main.querySelectorAll('[data-workout-set-form] input,[data-workout-set-form] select')].some(input => input.dataset.initialValue !== undefined && input.value !== input.dataset.initialValue);
        if (dirty) { message('Có hiệp chưa lưu. Lưu hiệp hoặc xóa phần nhập chưa lưu trước khi hoàn thành.', true); return; }
        if (await command({ type: 'complete' }, draft, 'Đã lưu buổi tập.')) { clearRest(); show('history'); }
      }, 'primary'), writeButton('Bỏ bản nháp', () => confirmAction('Xóa bản nháp đang tập? Lịch sử nguồn nếu có vẫn được giữ.', async () => {
        if (await command({ type: 'discard' }, draft, 'Đã bỏ bản nháp.')) { clearRest(); render(); }
      }), 'danger'))));
    liveUI.appendReview();
  }
  function historyView(date = null) {
    main.append(panel(h2('Lịch sử tập'), p('Mở lại để sửa. Complete kiểm tra nguồn lịch sử trước khi ghi đè; sửa template không đổi snapshots.', 'hint')));
    const sessions = getData().sessions.filter(session => date === null || session.date === date).sort((a,b) => b.date.localeCompare(a.date));
    if (!sessions.length) { main.append(panel(p('Chưa có buổi tập nào. Ghi ít nhất một hiệp và Complete.', 'empty'))); return; }
    for (const session of sessions) {
      const box = panel(h3(`${session.date} · ${sessionTitle(session)}`), p(`${session.workoutSnapshot?.planName || 'Original Plan'} · ${session.sets.length} hiệp${session.notes ? ` · ${session.notes}` : ''}`, 'summary'));
      if (sessionGeneration(session) === 'structured') {
        for (const [index,slot] of runtimeView(session).slots.entries()) {
          const sets = session.sets.filter(set => set.slotId === slot.id);
          box.append(h3(`${index + 1}. ${slot.snapshot.name}`), p(`${slot.status === 'removed' ? 'Dừng bài' : slot.status === 'replaced' ? 'Dừng / Đã đổi bài' : 'Bài trong buổi'} · đã ghi ${sets.length}/${slot.snapshot.sets} hiệp`, 'hint'));
          const replacement = replacementLabel(session, slot); if (replacement) box.append(p(replacement, 'summary'));
          box.append(p(sets.length ? sets.map(set => `Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}`).join(' | ') : 'Chưa ghi hiệp', 'hint'));
        }
      } else {
        const list = node('ul', { class: 'history-list' }); session.sets.forEach(set => list.append(node('li', { text: `${set.exerciseName} · Hiệp ${set.setNumber}: ${fmt(set.weight)} ${set.unit || 'kg'} × ${set.reps} · RIR ${fmt(set.rir)}` }))); box.append(list);
      }
      box.append(div('actions', button('Mở để sửa', () => {
        const baseline = getData().draft, open = async () => { if (await action(() => store.reopen(session, baseline), 'Đã mở buổi với baseline lịch sử.')) { editingSet = null; focusSlotId = null; show('workout'); } };
        if (baseline) confirmAction('Mở buổi cũ sẽ thay bản nháp hiện tại. Tiếp tục?', open); else open();
      }), button('Xóa buổi', () => { const baseline = getData().draft; confirmAction(`Xóa buổi ${session.date} · ${sessionTitle(session)}?`, () => action(() => store.removeHistory(session, baseline), 'Đã xóa buổi tập.')); }, 'danger')));
      main.append(box);
    }
  }
  return { workoutView, historyView, guardUnsaved, clearReview: () => liveUI.reset(), reset() { editingSet = null; focusSlotId = null; liveUI.reset(); } };
}
