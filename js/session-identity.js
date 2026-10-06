import { PROGRAM, programDay } from './program.js?v=30';
import { BUILTIN_EXERCISES, validateWorkoutSnapshot } from './custom-workout.js?v=30';

// Pure identity helpers. Runtime activation is atomic at the session-store write boundary.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
const nullableId = value => value === null || id(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const fail = detail => { throw new Error(`Session identity: ${detail}`); };
export const sessionGeneration = session => Object.hasOwn(session, 'sessionStructure') ? 'structured' : 'legacy';
export const legacyWriterAllowed = session => sessionGeneration(session) === 'legacy' && session.historyEditBase == null;

function validateSnapshot(snapshot) {
  if (!object(snapshot) || !Number.isSafeInteger(snapshot.sets) || snapshot.sets < 1 ||
    !['name', 'reps', 'rest', 'rir', 'notes', 'setupNote'].every(key => typeof snapshot[key] === 'string') ||
    !snapshot.name.trim() || !snapshot.reps.trim() || !snapshot.rest.trim() || !snapshot.rir.trim()) fail('invalid frozen snapshot');
}

function validateSavedSet(set) {
  if (!object(set) || !id(set.id) || !Number.isSafeInteger(set.exerciseIndex) || set.exerciseIndex < 0 ||
    !Number.isSafeInteger(set.setNumber) || set.setNumber < 1 || typeof set.exerciseName !== 'string' ||
    !Number.isFinite(set.weight) || set.weight < 0 || !Number.isSafeInteger(set.reps) || set.reps < 1 ||
    !Number.isFinite(set.rir) || set.rir < 0 || set.rir > 10 || (set.unit !== undefined && !['kg', 'lb'].includes(set.unit))) fail('invalid saved set');
}

export function validateSessionIdentity(session, allowHistoryBase = true) {
  if (!object(session) || !Array.isArray(session.sets)) fail('missing session/sets');
  if (sessionGeneration(session) === 'structured') {
    if (!id(session.id) || !date(session.date) || !['A', 'B', 'C', 'D', 'CUSTOM'].includes(session.workout) ||
      !Number.isInteger(session.week) || session.week < 1 || session.week > 12) fail('invalid session envelope');
    if (session.workout === 'CUSTOM') validateWorkoutSnapshot(session.workoutSnapshot);
    const structure = session.sessionStructure;
    if (!object(structure) || !Number.isSafeInteger(structure.revision) || structure.revision < 0 ||
      !['started', 'legacy-snapshot', 'legacy-program'].includes(structure.basis) ||
      !Array.isArray(structure.slots) || !Array.isArray(structure.order)) fail('invalid structure envelope');
    const positions = new Map(), successors = new Set();
    structure.slots.forEach((slot, index) => {
      if (!object(slot) || !id(slot.id) || positions.has(slot.id) || !nullableId(slot.exerciseId) ||
        !nullableId(slot.sourceSlotId) || !nullableId(slot.replacesSlotId) || !['active', 'removed', 'replaced'].includes(slot.status)) fail('invalid or duplicate slot');
      validateSnapshot(slot.snapshot); positions.set(slot.id, index);
    });
    if (structure.order.length !== positions.size || new Set(structure.order).size !== positions.size ||
      structure.order.some(value => !positions.has(value))) fail('order must be an exact registry permutation');
    structure.slots.forEach((slot, index) => {
      if (slot.replacesSlotId === null) return;
      const predecessor = positions.get(slot.replacesSlotId);
      if (predecessor === undefined || predecessor >= index || successors.has(slot.replacesSlotId) ||
        structure.slots[predecessor].status !== 'replaced') fail('invalid replacement predecessor/cycle/successor');
      successors.add(slot.replacesSlotId);
    });
    if (structure.slots.some(slot => slot.status === 'replaced' && !successors.has(slot.id))) fail('replaced slot has no successor');
    const setIds = new Set(), numbers = new Set();
    for (const set of session.sets) {
      validateSavedSet(set);
      const ordinal = positions.get(set.slotId), slot = structure.slots[ordinal];
      if (!slot || !id(set.slotId) || set.exerciseIndex !== ordinal || set.exerciseName !== slot.snapshot.name ||
        (slot.exerciseId !== null && set.exerciseId !== undefined && set.exerciseId !== slot.exerciseId)) fail('dangling/mixed or inconsistent set ownership');
      const numberKey = JSON.stringify([set.slotId, set.setNumber]);
      if (setIds.has(set.id) || numbers.has(numberKey)) fail('duplicate saved set ID or owner/setNumber');
      setIds.add(set.id); numbers.add(numberKey);
    }
  } else if (session.sets.some(set => Object.hasOwn(set, 'slotId'))) fail('slot ownership without structure');
  if (!allowHistoryBase && Object.hasOwn(session, 'historyEditBase')) fail('recursive history baseline');
  if (Object.hasOwn(session, 'historyEditBase')) {
    const base = session.historyEditBase;
    if (base === null) return;
    if (object(base) && base.kind === 'legacy-unknown' && Object.keys(base).length === 1) return;
    if (!object(base) || base.id !== session.id || !['A','B','C','D','CUSTOM'].includes(base.workout) ||
      !date(base.date) || !Number.isInteger(base.week) || base.week < 1 || base.week > 12) fail('invalid history baseline');
    validateSessionIdentity(base, false);
    base.sets.forEach(validateSavedSet);
    if (base.workout === 'CUSTOM') validateWorkoutSnapshot(base.workoutSnapshot);
  }
}

export function validateIdentityData(data) {
  if (data.sessions.some(session => object(session) && Object.hasOwn(session, 'historyEditBase'))) fail('historyEditBase is draft-only');
  for (const session of [...data.sessions, ...(data.draft ? [data.draft] : [])]) {
    // Keep legacy load/write validation unchanged; old backup validator still checks old envelopes.
    if (object(session) && (Object.hasOwn(session, 'sessionStructure') || Object.hasOwn(session, 'historyEditBase') ||
      session.sets?.some(set => object(set) && Object.hasOwn(set, 'slotId')))) validateSessionIdentity(session);
  }
}

function sourceSlots(session, notes) {
  if (!Number.isInteger(session.week) || session.week < 1 || session.week > 12) fail('missing program week');
  if (session.workout === 'CUSTOM') {
    validateWorkoutSnapshot(session.workoutSnapshot);
    return session.workoutSnapshot.exercises.map(item => ({ exerciseId: item.exerciseId, sourceSlotId: item.id,
      snapshot: { name: item.name, sets: item.sets, reps: `${item.repMin}–${item.repMax}`, rest: `${item.restSeconds} giây`,
        rir: item.targetRIR === null ? 'DATA NOT DEFINED YET' : String(item.targetRIR), notes: item.notes, setupNote: notes[`exercise:${item.exerciseId}`] ?? '' } }));
  }
  if (!Object.hasOwn(PROGRAM, session.workout) || session.workoutSnapshot !== undefined) fail('missing Original definition');
  return programDay(session.workout, session.week).exercises.map((item, index) => {
    // Exact accepted PROGRAM occurrence -> catalog definition. Never search arbitrary user names.
    const definition = BUILTIN_EXERCISES.find(exercise => exercise.name === PROGRAM[session.workout].exercises[index].name);
    if (!definition) fail('missing Original catalog definition');
    return { exerciseId: definition.id, sourceSlotId: `original:${session.workout}:${index}`,
      snapshot: { name: item.name, sets: item.sets, reps: item.reps, rest: item.rest, rir: item.rir,
        notes: item.note, setupNote: notes[`${session.workout}:${index}`] ?? '' } };
  });
}

export function createSessionStructure(session, notes = {}) {
  if (!Array.isArray(session.sets) || session.sets.length || sessionGeneration(session) !== 'legacy') fail('new structure requires a fresh session');
  const slots = sourceSlots(session, notes).map(source => ({ id: crypto.randomUUID(), ...structuredClone(source), replacesSlotId: null, status: 'active' }));
  const structure = { revision: 0, basis: 'started', slots, order: slots.map(slot => slot.id) };
  validateSessionIdentity({ ...session, sessionStructure: structure });
  slots.forEach(slot => Object.freeze(slot.snapshot));
  return structure;
}

export function materializeLegacySession(session, notes = {}) {
  if (sessionGeneration(session) === 'structured') {
    validateSessionIdentity(session);
    return { kind: 'structured', session: structuredClone(session), reasons: [] };
  }
  try {
    const sources = sourceSlots(session, notes), ids = new Set(), pairs = new Set();
    if (!Array.isArray(session.sets)) fail('missing legacy sets');
    const slots = sources.map((source, index) => ({ id: `legacy-slot:${index}`, ...structuredClone(source), replacesSlotId: null, status: 'active' }));
    const sets = session.sets.map(set => {
      validateSavedSet(set);
      const owner = slots[set.exerciseIndex], pair = JSON.stringify([set.exerciseIndex, set.setNumber]);
      if (!owner || Object.hasOwn(set, 'slotId') || set.exerciseName !== owner.snapshot.name ||
        (set.exerciseId !== undefined && set.exerciseId !== owner.exerciseId) || ids.has(set.id) || pairs.has(pair)) fail('ambiguous legacy ownership');
      ids.add(set.id); pairs.add(pair);
      return { ...structuredClone(set), slotId: owner.id };
    });
    const candidate = { ...structuredClone(session), sets, sessionStructure: { revision: 0,
      basis: session.workout === 'CUSTOM' ? 'legacy-snapshot' : 'legacy-program', slots, order: slots.map(slot => slot.id) } };
    validateSessionIdentity(candidate);
    return { kind: 'materialized', session: candidate, reasons: [] };
  } catch (error) {
    return { kind: 'ambiguous', session: structuredClone(session), reasons: [error.message] };
  }
}

export function enumerateSessionSlots(session, notes = {}) {
  const result = materializeLegacySession(session, notes);
  if (result.kind === 'ambiguous') fail(result.reasons.join('; '));
  return result.session.sessionStructure.slots;
}
export const lookupSessionSlot = (session, slotId) => enumerateSessionSlots(session).find(slot => slot.id === slotId) ?? null;
export function displaySessionSlots(session, notes = {}) {
  const result = materializeLegacySession(session, notes);
  if (result.kind === 'ambiguous') fail(result.reasons.join('; '));
  const structure = result.session.sessionStructure, byId = new Map(structure.slots.map(slot => [slot.id, slot]));
  return structure.order.map(slotId => byId.get(slotId));
}
export function resolveSetOwner(session, set) {
  const slots = enumerateSessionSlots(session);
  const owner = sessionGeneration(session) === 'structured' ? slots.find(slot => slot.id === set.slotId) : slots[set.exerciseIndex];
  if (!owner || (sessionGeneration(session) === 'structured' && slots[set.exerciseIndex]?.id !== owner.id) ||
    set.exerciseName !== owner.snapshot.name || (set.exerciseId !== undefined && owner.exerciseId !== set.exerciseId)) fail('unresolved set owner');
  return owner;
}
export function createHistoryEditBase(completed) {
  const base = structuredClone(completed);
  validateSessionIdentity({ ...completed, historyEditBase: base });
  return base;
}
export const legacyHistoryEditBase = (session, completed) => completed.some(item => item.id === session.id) ? { kind: 'legacy-unknown' } : null;
