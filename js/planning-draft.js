import { validateSlot, libraryExercises, validateWorkoutSnapshot } from './custom-workout.js?v=30';
import { createPlannerRequest, validatePlannerOutput } from './planner.js?v=30';

export const emptyPlanningDraft = () => ({ revision: 0, builder: null, planner: null });
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const scalar = value => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) || value === null;
const bounded = value => JSON.stringify(value).length <= 250000;
export const requestKey = preferences => JSON.stringify(preferences);

export function plannerPayload(preferences, result = null, generatedPreferences = null) {
  const key = requestKey(preferences);
  return { preferences: structuredClone(preferences), result: generatedPreferences && requestKey(generatedPreferences) === key ? structuredClone(result) : null, requestKey: key };
}

export function validateDraftPayload(kind, payload) {
  const bad = () => { throw new Error('Bản nháp không hợp lệ hoặc quá lớn. Giữ bản sao trước khi bỏ bản nháp.'); };
  if (!object(payload) || !bounded(payload)) bad();
  if (kind === 'builder') {
    const day = payload.day;
    if (!object(day) || typeof day.id !== 'string' || !day.id || typeof day.name !== 'string' || !Array.isArray(day.exercises) || day.exercises.length > 100) bad();
    const ids = new Set();
    for (const slot of day.exercises) {
      if (!object(slot) || typeof slot.id !== 'string' || !slot.id || ids.has(slot.id) || typeof slot.exerciseId !== 'string' || typeof slot.name !== 'string' ||
        !['sets', 'repMin', 'repMax', 'targetRIR', 'restSeconds', 'notes'].every(key => scalar(slot[key]))) bad();
      ids.add(slot.id);
    }
    if (payload.source !== null && (!object(payload.source) || typeof payload.source.planId !== 'string' || !object(payload.source.plan))) bad();
  } else if (kind === 'planner') {
    if (!object(payload.preferences) || payload.requestKey !== requestKey(payload.preferences)) bad();
    for (const [key, value] of Object.entries(payload.preferences)) {
      if (['muscles', 'equipment', 'include', 'exclude'].includes(key)) { if (!Array.isArray(value) || value.length > 200 || !value.every(item => typeof item === 'string')) bad(); }
      else if (!scalar(value)) bad();
    }
    if (payload.result !== null) {
      if (!object(payload.result) || !['draft', 'conflict'].includes(payload.result.status)) bad();
      if (payload.result.status === 'draft') {
        const day = payload.result.workout;
        validateWorkoutSnapshot({ ...day, planId: null, planName: 'Draft', dayId: day?.id });
      } else if (!Array.isArray(payload.result.conflicts) || !payload.result.conflicts.every(item => typeof item === 'string')) bad();
    }
  } else bad();
  return payload;
}

export function validatePlanningDraft(value) {
  if (!object(value) || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error('Vùng bản nháp không hợp lệ.');
  for (const kind of ['builder', 'planner']) {
    const slot = value[kind];
    if (slot === null) continue;
    if (!object(slot) || typeof slot.savedAt !== 'string' || !Number.isFinite(Date.parse(slot.savedAt))) throw new Error('Thời điểm bản nháp không hợp lệ.');
    validateDraftPayload(kind, slot.payload);
  }
}

export function reviewedBuilderDay(payload, data) {
  validateDraftPayload('builder', payload);
  const available = libraryExercises(data.customExercises);
  const missing = payload.day.exercises.filter(slot => !available.some(item => item.id === slot.exerciseId));
  if (missing.length) throw new Error('Có bài không còn trong thư viện. Hãy bỏ hoặc thay bài đó trước khi lưu/bắt đầu.');
  return { ...payload.day, name: payload.day.name.trim(), exercises: payload.day.exercises.map(slot => ({ id: slot.id, ...validateSlot({ ...slot, targetRIR: slot.targetRIR === '' ? null : slot.targetRIR }) })) };
}

export function recoverPlannerResult(payload, data) {
  validateDraftPayload('planner', payload);
  if (!payload.result || payload.requestKey !== requestKey(payload.preferences)) return null;
  if (payload.result.status === 'conflict') return structuredClone(payload.result);
  return validatePlannerOutput(payload.result, createPlannerRequest(payload.preferences), libraryExercises(data.customExercises));
}

// One queue per page. Every write still goes through updateData + the origin Web Lock.
export function createDraftStore({ getData, write }) {
  let expected, queue = Promise.resolve(), state = { state: 'idle' }, pending = 0, epoch = 0;
  const listeners = new Set();
  const publish = value => { state = value; for (const listener of listeners) listener(state); };
  const initialize = () => { if (expected === undefined) expected = JSON.stringify(getData().planningDraft); };
  function run(kind, payload, change) {
    initialize(); const generation = epoch; pending++;
    publish({ state: 'saving' });
    const operation = queue.then(async () => {
      if (generation !== epoch) throw new Error('Bản nháp đã được mở lại; thao tác cũ đã hủy.');
      if (payload !== null && payload !== undefined) validateDraftPayload(kind, payload);
      const next = await write(data => {
        if (JSON.stringify(data.planningDraft) !== expected) throw new Error('Bản nháp đã đổi ở tab khác. Phần đang nhập chưa lưu; sao chép phần cần giữ rồi tải lại trang để mở bản nháp mới.');
        const revision = Number.isSafeInteger(data.planningDraft?.revision) ? data.planningDraft.revision : 0;
        if (revision >= Number.MAX_SAFE_INTEGER) throw new Error('Revision bản nháp vượt giới hạn.');
        if (change) change(data);
        const envelope = { ...emptyPlanningDraft(), ...(object(data.planningDraft) ? structuredClone(data.planningDraft) : {}) };
        envelope.revision = revision + 1;
        if (payload !== undefined) envelope[kind] = payload === null ? null : { savedAt: new Date().toISOString(), payload: structuredClone(payload) };
        data.planningDraft = envelope;
      });
      expected = JSON.stringify(next.planningDraft);
      return next;
    });
    queue = operation.catch(() => {});
    return operation.then(next => { pending--; if (!pending) publish({ state: 'saved', savedAt: next.planningDraft[kind]?.savedAt }); return next; }, error => {
      pending--; publish({ state: 'error', message: error.message }); throw error;
    });
  }
  return {
    save: (kind, payload) => run(kind, structuredClone(payload)),
    discard: kind => run(kind, null),
    commit: (kind, change) => run(kind, null, change),
    transition: (kind, payload, change) => run(kind, payload, change),
    flush: () => queue,
    status: () => state,
    subscribe(listener) { listeners.add(listener); listener(state); return () => listeners.delete(listener); },
    reset() { epoch++; expected = JSON.stringify(getData().planningDraft); publish({ state: 'idle' }); },
    recover(kind) {
      initialize();
      const envelope = getData().planningDraft;
      if (!object(envelope) || !Number.isSafeInteger(envelope.revision) || envelope.revision < 0) throw new Error('Vùng bản nháp bị lỗi.');
      const slot = envelope[kind];
      if (slot === null) return null;
      if (!slot || typeof slot.savedAt !== 'string' || !Number.isFinite(Date.parse(slot.savedAt))) throw new Error('Bản nháp có thời điểm không hợp lệ.');
      validateDraftPayload(kind, slot.payload);
      return structuredClone(slot);
    }
  };
}
