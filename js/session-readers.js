import { materializeLegacySession, sessionGeneration, validateSessionIdentity } from './session-identity.js?v=41';

export function runtimeView(session, exerciseNotes = {}) {
  const result = materializeLegacySession(session, exerciseNotes);
  if (result.kind === 'ambiguous') return { session: result.session, slots: [], ambiguous: true, reasons: result.reasons };
  const structure = result.session.sessionStructure, byId = new Map(structure.slots.map(slot => [slot.id, slot]));
  return { session: result.session, slots: structure.order.map(id => byId.get(id)), ambiguous: false, reasons: [] };
}
export function setsForSlot(session, slotId) {
  return runtimeView(session).session.sets.filter(set => set.slotId === slotId);
}
export function replacementLabel(session, slot) {
  if (!slot.replacesSlotId) return '';
  const predecessor = session.sessionStructure.slots.find(item => item.id === slot.replacesSlotId);
  return predecessor ? `Thay cho ${predecessor.snapshot.name}` : '';
}
const missingNumber = (session, slot) => slot.status !== 'active' ? null :
  Array.from({ length: slot.snapshot.sets }, (_, index) => index + 1).find(number => !session.sets.some(set => set.slotId === slot.id && set.setNumber === number)) ?? null;
export const nextSetNumber = (session, slot) => missingNumber(runtimeView(session).session, slot);
export function nextIncompleteSlot(session) {
  const view = runtimeView(session);
  return view.slots.find(slot => missingNumber(view.session, slot) !== null)?.id ?? null;
}

function legacyGroups(session, target) {
  const groups = new Map(), byIndex = new Map(), ids = new Set(), duplicateIds = session.sets.some(set => { const duplicate = ids.has(set.id); ids.add(set.id); return duplicate; });
  for (const set of session.sets) {
    const key = JSON.stringify([set.exerciseIndex, set.exerciseName]);
    if (!groups.has(key)) groups.set(key, { id: `legacy:${key}`, index: set.exerciseIndex, name: set.exerciseName, sets: [] });
    groups.get(key).sets.push(set);
    if (!byIndex.has(set.exerciseIndex)) byIndex.set(set.exerciseIndex, new Set());
    byIndex.get(set.exerciseIndex).add(key);
  }
  const source = /^original:([ABCD]):(\d+)$/.exec(target.sourceSlotId ?? '');
  const matches = [...groups.values()].flatMap(group => {
    const snapshot = session.workoutSnapshot?.exercises?.[group.index];
    const catalogId = snapshot?.exerciseId ?? group.sets[0].exerciseId;
    const exactId = target.exerciseId !== null && catalogId === target.exerciseId;
    const originalFallback = source && session.workout === source[1] && group.index === Number(source[2]) && group.name === target.snapshot.name;
    if (!exactId && !originalFallback) return [];
    const numbers = new Set(group.sets.map(set => set.setNumber));
    const consistentIds = new Set(group.sets.map(set => set.exerciseId).filter(value => value !== undefined)).size <= 1;
    const snapshotMatches = !session.workoutSnapshot || (snapshot?.name === group.name && snapshot?.exerciseId === catalogId);
    const quickFillAllowed = !duplicateIds && byIndex.get(group.index).size === 1 && numbers.size === group.sets.length && consistentIds && snapshotMatches &&
      Number.isSafeInteger(group.index) && group.index >= 0 && group.sets.every(set => Number.isSafeInteger(set.setNumber) && set.setNumber > 0);
    return [{ id: group.id, name: group.name, label: `Mục ${group.index + 1} · ${group.name}`, sets: structuredClone(group.sets), quickFillAllowed }];
  });
  for (const [index, slot] of (session.workoutSnapshot?.exercises ?? []).entries()) {
    if (target.exerciseId !== null && slot.exerciseId === target.exerciseId && !byIndex.has(index))
      matches.push({ id: `legacy-empty:${index}`, name: slot.name, label: `Mục ${index + 1} · ${slot.name}`, sets: [], quickFillAllowed: false });
  }
  return matches;
}
export function previousOccurrences(sessions, current, target) {
  const sorted = [...sessions].filter(session => session.id !== current.id).sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) || String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  for (const session of sorted) {
    let occurrences;
    if (sessionGeneration(session) === 'structured') {
      validateSessionIdentity(session);
      occurrences = runtimeView(session).slots.flatMap((slot, index) => {
        if (target.exerciseId === null || slot.exerciseId !== target.exerciseId) return [];
        const sets = session.sets.filter(set => set.slotId === slot.id);
        return [{ id: slot.id, name: slot.snapshot.name, label: `Mục ${index + 1} · ${slot.snapshot.name}`, sets: structuredClone(sets), quickFillAllowed: sets.length > 0 }];
      });
    } else occurrences = legacyGroups(session, target);
    if (occurrences.some(item => item.sets.length)) return { sessionId: session.id, date: session.date, occurrences };
  }
  return { sessionId: null, date: null, occurrences: [] };
}
export function previousValues(result, selectedId, number) {
  const occurrence = result.occurrences.length === 1 ? result.occurrences[0] : result.occurrences.find(item => item.id === selectedId);
  if (!occurrence?.quickFillAllowed) return null;
  const set = occurrence.sets.find(item => item.setNumber === number) ?? occurrence.sets[0];
  if (!set) return null;
  return { weight: set.weight, unit: set.unit ?? 'kg', reps: set.reps, rir: set.rir };
}
