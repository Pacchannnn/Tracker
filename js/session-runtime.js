import { validateSet, validDate, localDate, ensureUnchanged } from './data.js?v=30';
import { createSessionStructure, materializeLegacySession, sessionGeneration, validateSessionIdentity, createHistoryEditBase, legacyHistoryEditBase } from './session-identity.js?v=30';
import { liveStructureAllowed, applyLiveStructure } from './session-structure.js?v=30';

const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const stale = () => { throw new Error('Buổi tập đã đổi. Phần đang nhập chưa lưu; hãy giữ phần cần dùng và mở lại để xem bản mới.'); };
export function guardSession(current, expected) {
  if ((current?.id ?? null) !== (expected?.id ?? null) ||
    (current?.sessionStructure?.revision ?? null) !== (expected?.sessionStructure?.revision ?? null) || !same(current, expected)) stale();
}

export function createStartedSession(spec, exerciseNotes = {}) {
  const session = { id: crypto.randomUUID(), workout: spec.workout, date: spec.date ?? localDate(), week: spec.week,
    ...(spec.workoutSnapshot ? { workoutSnapshot: clone(spec.workoutSnapshot) } : {}), sets: [], notes: spec.notes ?? '', historyEditBase: null };
  session.sessionStructure = createSessionStructure(session, exerciseNotes);
  validateSessionIdentity(session);
  return session;
}

function activateDraft(draft, data) {
  const candidate = clone(draft);
  if (!Object.hasOwn(candidate, 'historyEditBase')) candidate.historyEditBase = legacyHistoryEditBase(candidate, data.sessions);
  const result = materializeLegacySession(candidate, data.exerciseNotes);
  return { session: result.session, ambiguous: result.kind === 'ambiguous' };
}
function increment(session) {
  if (sessionGeneration(session) !== 'structured') return;
  if (session.sessionStructure.revision >= Number.MAX_SAFE_INTEGER) throw new Error('Revision vượt giới hạn. Hãy giữ bản sao buổi tập.');
  session.sessionStructure.revision++;
}
function exactSet(session, command, ambiguous) {
  const matches = session.sets.filter(set => set.id === command.setId);
  if (matches.length !== 1 || (!ambiguous && matches[0].slotId !== command.slotId)) throw new Error('Không xác định được đúng hiệp/bài cần sửa. Hãy mở lại buổi tập.');
  return matches[0];
}

export function copySessionForRecovery(session) {
  if (sessionGeneration(session) !== 'structured') throw new Error('Ownership còn mơ hồ; giữ/export bản nháp hoặc mở lại nguồn. Không thể tạo bản sao có identity bằng cách đoán.');
  validateSessionIdentity(session);
  const copy = clone(session), ids = new Map(copy.sessionStructure.slots.map(slot => [slot.id, crypto.randomUUID()]));
  copy.id = crypto.randomUUID();
  copy.sessionStructure.slots = copy.sessionStructure.slots.map(slot => ({ ...slot, id: ids.get(slot.id), replacesSlotId: slot.replacesSlotId === null ? null : ids.get(slot.replacesSlotId) }));
  copy.sessionStructure.order = copy.sessionStructure.order.map(id => ids.get(id));
  copy.sets = copy.sets.map(set => ({ ...set, id: crypto.randomUUID(), slotId: ids.get(set.slotId) }));
  delete copy.historyEditBase;
  increment(copy); copy.updatedAt = new Date().toISOString(); validateSessionIdentity(copy);
  return copy;
}

export function applySessionCommand(data, expected, command) {
  guardSession(data.draft, expected);
  if (!data.draft) stale();
  if (command.type === 'discard') { data.draft = null; return; }
  if (['add','remove','reorder','replace'].includes(command.type) && !liveStructureAllowed(data.draft, data.sessions)) throw new Error('Buổi không có identity live hợp lệ hoặc đang sửa lịch sử. Không đổi cấu trúc.');
  const { session, ambiguous } = activateDraft(data.draft, data);
  switch (command.type) {
    case 'add': case 'remove': case 'reorder': case 'replace': applyLiveStructure(session, command, data); break;
    case 'log': {
      if (ambiguous) throw new Error('Ownership buổi cũ còn mơ hồ. Không ghi hiệp mới/Quick Fill; giữ bản nháp và xem lại dữ liệu.');
      const ordinal = session.sessionStructure.slots.findIndex(slot => slot.id === command.slotId), slot = session.sessionStructure.slots[ordinal];
      if (!slot || slot.status !== 'active' || !Number.isSafeInteger(command.setNumber) || command.setNumber < 1 || command.setNumber > slot.snapshot.sets ||
        session.sets.some(set => set.slotId === slot.id && set.setNumber === command.setNumber)) throw new Error('Bài/hiệp không còn hợp lệ hoặc đã được ghi. Hãy xem lại buổi tập.');
      session.sets.push({ id: crypto.randomUUID(), slotId: slot.id, exerciseIndex: ordinal, exerciseName: slot.snapshot.name,
        ...(slot.exerciseId === null ? {} : { exerciseId: slot.exerciseId }), setNumber: command.setNumber, ...validateSet(command.values) });
      break;
    }
    case 'edit': Object.assign(exactSet(session, command, ambiguous), validateSet(command.values)); break;
    case 'delete': {
      const set = exactSet(session, command, ambiguous);
      session.sets = session.sets.filter(item => item.id !== set.id); break;
    }
    case 'metadata': {
      const keys = Object.keys(command.patch ?? {});
      if (!keys.length || keys.some(key => !['date','notes'].includes(key))) throw new Error('Thay đổi buổi tập không hợp lệ.');
      if ('date' in command.patch && !validDate(command.patch.date)) throw new Error('Ngày tập không hợp lệ.');
      if ('notes' in command.patch && typeof command.patch.notes !== 'string') throw new Error('Ghi chú buổi không hợp lệ.');
      Object.assign(session, command.patch); break;
    }
    case 'complete': {
      if (!session.sets.length) throw new Error('Ghi ít nhất một hiệp trước khi hoàn thành.');
      const base = session.historyEditBase, index = data.sessions.findIndex(item => item.id === session.id);
      if (base?.kind === 'legacy-unknown') throw new Error('Không biết baseline lịch sử lúc mở buổi cũ. Giữ/export, tạo bản sao riêng hoặc mở lại nguồn mới nhất.');
      if (base !== null && (index < 0 || !same(data.sessions[index], base))) throw new Error('Nguồn lịch sử đã đổi hoặc bị xóa. Bản nháp của bạn vẫn được giữ; không ghi đè/khôi phục nguồn cũ.');
      if (base === null && index >= 0) throw new Error('ID đã có trong lịch sử. Giữ bản nháp và xem lại nguồn.');
      increment(session); delete session.historyEditBase; session.updatedAt = new Date().toISOString(); validateSessionIdentity(session);
      if (index >= 0) data.sessions[index] = session; else data.sessions.push(session);
      data.draft = null; return;
    }
    case 'copy-history': {
      if (!session.sets.length) throw new Error('Bản sao lịch sử cần ít nhất một hiệp đã ghi.');
      data.sessions.push(copySessionForRecovery(session)); data.draft = null; return;
    }
    default: throw new Error('Lệnh buổi tập không được hỗ trợ.');
  }
  increment(session); validateSessionIdentity(session); data.draft = session;
}

// Own accepted writes advance this page's baseline. External events never reset it implicitly.
export function createSessionStore({ getData, write, acceptData = () => {}, commitPlanning }) {
  let expected, initialized = false, epoch = 0, pending = 0, queue = Promise.resolve(), state = { state: 'idle' };
  const listeners = new Set(), publish = value => { state = value; listeners.forEach(listener => listener(value)); };
  const initialize = () => { if (!initialized) { expected = clone(getData().draft ?? null); initialized = true; } };
  function run(baseline, change, planningKind = null, strictBaseline = false) {
    initialize(); const intent = clone(baseline ?? null), generation = epoch;
    if (!same(intent, expected)) { publish({ state: 'error', message: 'Màn hình buổi tập cũ. Hãy mở lại trước khi lưu.' }); return Promise.reject(new Error(state.message)); }
    pending++; publish({ state: 'saving' });
    const operation = queue.then(async () => {
      if (generation !== epoch) throw new Error('Thao tác cũ đã hủy sau khi mở lại dữ liệu.');
      if ((intent?.id ?? null) !== (expected?.id ?? null)) stale();
      // Structural review is tied to the captured screen, even across this tab's queue.
      // Preserve established log/log serialization only while slots and order are unchanged.
      const structure = session => session?.sessionStructure && [session.sessionStructure.slots, session.sessionStructure.order];
      if (strictBaseline || !same(structure(intent), structure(expected))) guardSession(expected, intent);
      const boundary = apply => planningKind ? commitPlanning(planningKind, apply) : write(apply);
      const next = await boundary(data => {
        if (generation !== epoch) throw new Error('Thao tác cũ đã hủy.');
        guardSession(data.draft ?? null, expected);
        change(data, clone(expected));
      });
      if (generation === epoch) { expected = clone(next.draft ?? null); acceptData(next); }
      return next;
    });
    queue = operation.catch(() => {});
    return operation.then(next => { pending--; if (generation === epoch && !pending) publish({ state: 'saved' }); return next; }, error => {
      pending--; if (generation === epoch) publish({ state: 'error', message: error.message }); throw error;
    });
  }
  return {
    command: (command, baseline) => {
      const intent = clone(command);
      return run(baseline, (data, expected) => applySessionCommand(data, expected, intent), null, ['add','remove','reorder','replace'].includes(intent.type));
    },
    start: (spec, baseline, { planningKind = null, plan = null } = {}) => {
      const intent = clone(spec), source = clone(plan);
      return run(baseline, data => {
        if (source) ensureUnchanged(data.plans.find(item => item.id === source.id), source);
        data.draft = createStartedSession({ ...intent, week: intent.week ?? data.settings.week }, data.exerciseNotes);
      }, planningKind);
    },
    reopen: (source, baseline) => {
      const reviewed = clone(source);
      return run(baseline, data => {
        const current = data.sessions.find(item => item.id === reviewed.id); ensureUnchanged(current, reviewed);
        const candidate = clone(current); candidate.historyEditBase = createHistoryEditBase(current);
        data.draft = materializeLegacySession(candidate, data.exerciseNotes).session;
      });
    },
    removeHistory: (source, baseline) => {
      const reviewed = clone(source);
      return run(baseline, data => {
        const current = data.sessions.find(item => item.id === reviewed.id); ensureUnchanged(current, reviewed);
        data.sessions = data.sessions.filter(item => item.id !== reviewed.id);
      });
    },
    reset() { epoch++; expected = clone(getData().draft ?? null); initialized = true; publish({ state: 'idle' }); },
    status: () => state,
    subscribe(listener) { listeners.add(listener); listener(state); return () => listeners.delete(listener); },
    flush: () => queue
  };
}
