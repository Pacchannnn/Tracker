import test from 'node:test';
import assert from 'node:assert/strict';
import * as readers from '../js/session-readers.js';
import { createStartedSession } from '../js/session-runtime.js';
import { representativeState } from './fixtures/representative-state.js';

const current = () => {
  const snapshot = representativeState().draft.workoutSnapshot;
  snapshot.exercises[1] = { ...snapshot.exercises[0], id: 'second-template' };
  return createStartedSession({ workout: 'CUSTOM', workoutSnapshot: snapshot, week: 1, date: '2026-10-05' });
};
const saved = (session, index, number = 1) => ({ id: `set-${index}-${number}`, slotId: session.sessionStructure.slots[index].id, exerciseIndex: index,
  exerciseId: session.sessionStructure.slots[index].exerciseId, exerciseName: session.sessionStructure.slots[index].snapshot.name,
  setNumber: number, weight: 20 + index, unit: 'kg', reps: 10, rir: 2 });

test('focus and next incomplete follow order and slot ownership without deduping exercise occurrences', () => {
  const s = current(); s.sessionStructure.order = [s.sessionStructure.slots[1].id, s.sessionStructure.slots[0].id, s.sessionStructure.slots[2].id];
  s.sets = [saved(s, 0), saved(s, 0, 2)];
  assert.equal(readers.nextIncompleteSlot(s), s.sessionStructure.slots[1].id);
  assert.equal(readers.nextSetNumber(s, s.sessionStructure.slots[1]), 1);
  assert.equal(readers.setsForSlot(s, s.sessionStructure.slots[1].id).length, 0);
  assert.equal(readers.setsForSlot(s, s.sessionStructure.slots[0].id).length, 2);
});

test('inactive imported rows are skipped by focus/new logging but their saved records remain readable', () => {
  const s = current(); s.sessionStructure.slots[0].status = 'removed'; s.sets = [saved(s, 0)];
  assert.equal(readers.nextIncompleteSlot(s), s.sessionStructure.slots[1].id);
  assert.equal(readers.nextSetNumber(s, s.sessionStructure.slots[0]), null);
  assert.equal(readers.setsForSlot(s, s.sessionStructure.slots[0].id)[0].weight, 20);
  s.sessionStructure.slots.forEach(slot => slot.status = 'removed'); assert.equal(readers.nextIncompleteSlot(s), null);
});

test('multiple previous occurrences require explicit choice; Quick Fill copies values only from selected owner', () => {
  const s = current(), previous = current(); previous.date = '2026-10-04'; previous.sets = [saved(previous, 0), saved(previous, 1)];
  const result = readers.previousOccurrences([previous], s, s.sessionStructure.slots[0]);
  assert.equal(result.occurrences.length, 2);
  assert.equal(readers.previousValues(result, null, 1), null);
  const selected = readers.previousValues(result, result.occurrences[1].id, 1);
  assert.deepEqual(selected, { weight: 21, unit: 'kg', reps: 10, rir: 2 });
  assert.ok(!Object.hasOwn(selected, 'slotId'));
});

test('an empty duplicate occurrence still requires selection and cannot borrow another occurrence values', () => {
  const s = current(), previous = current(); previous.date = '2026-10-04'; previous.sets = [saved(previous, 0)];
  const result = readers.previousOccurrences([previous], s, s.sessionStructure.slots[1]);
  assert.equal(result.occurrences.length, 2);
  assert.equal(readers.previousValues(result, null, 1), null);
  assert.equal(readers.previousValues(result, previous.sessionStructure.slots[1].id, 1), null);
  assert.equal(readers.previousValues(result, previous.sessionStructure.slots[0].id, 1).weight, 20);
});

test('latest matching session ordering, exact exercise ID, and current session exclusion prevent misleading fill', () => {
  const s = current(), old = current(), newer = current(); old.date = '2026-10-03'; newer.date = '2026-10-04';
  old.sets = [saved(old, 0)]; newer.sets = [saved(newer, 1)]; s.sets = [saved(s, 0)];
  const result = readers.previousOccurrences([s, old, newer], s, s.sessionStructure.slots[0]);
  assert.equal(result.sessionId, newer.id); assert.equal(readers.previousValues(result, newer.sessionStructure.slots[1].id, 1).weight, 21);
  newer.sessionStructure.slots[0].exerciseId = 'other'; newer.sessionStructure.slots[1].exerciseId = 'other'; newer.sets[0].exerciseId = 'other';
  assert.equal(readers.previousOccurrences([newer], s, s.sessionStructure.slots[0]).occurrences.length, 0);
});

test('legacy custom snapshots keep empty duplicate occurrences in the explicit choice', () => {
  const s = current(), old = representativeState().sessions[0];
  old.workoutSnapshot.exercises[1] = { ...old.workoutSnapshot.exercises[0], id: 'another-template' };
  const result = readers.previousOccurrences([old], s, s.sessionStructure.slots[1]);
  assert.equal(result.occurrences.length, 2);
  assert.equal(readers.previousValues(result, null, 1), null);
  assert.equal(readers.previousValues(result, 'legacy-empty:1', 1), null);
});

test('legacy Original previous uses exact source index + historical name, never display index or same-name guessing', () => {
  const s = createStartedSession({ workout: 'A', date: '2026-10-05', week: 1 }), slot = s.sessionStructure.slots[0];
  const legacy = { id: 'old', workout: 'A', date: '2026-10-04', sets: [{ id: 'one', exerciseIndex: 0, exerciseName: slot.snapshot.name, setNumber: 1, weight: 15, reps: 10, rir: 3 }] };
  assert.equal(readers.previousValues(readers.previousOccurrences([legacy], s, slot), null, 1).weight, 15);
  legacy.sets[0].exerciseIndex = 1; assert.equal(readers.previousOccurrences([legacy], s, slot).occurrences.length, 0);
  legacy.sets[0].exerciseIndex = 0; legacy.sets[0].exerciseName = 'changed'; assert.equal(readers.previousOccurrences([legacy], s, slot).occurrences.length, 0);
});

test('legacy conflicting groups/duplicate set IDs or numbers are view-only, never quick-filled', () => {
  const s = current(), old = representativeState().sessions[0];
  old.sets.push({ ...old.sets[0], id: 'another' });
  const result = readers.previousOccurrences([old], s, s.sessionStructure.slots[0]);
  assert.ok(result.occurrences.length); assert.equal(result.occurrences[0].quickFillAllowed, false);
  assert.equal(readers.previousValues(result, null, 1), null);
});

test('safe legacy live preview uses deterministic IDs without mutating input; ambiguous preview cannot log or focus', () => {
  const s = representativeState().sessions[0], before = structuredClone(s), result = readers.runtimeView(s);
  assert.equal(result.ambiguous, false); assert.equal(result.slots[0].id, 'legacy-slot:0'); assert.deepEqual(s, before);
  s.sets[0].exerciseIndex = 999; const ambiguous = readers.runtimeView(s);
  assert.equal(ambiguous.ambiguous, true); assert.deepEqual(ambiguous.slots, []); assert.equal(readers.nextIncompleteSlot(s), null);
});

test('malformed structured readers fail closed instead of consulting current template', () => {
  const s = current(); s.sessionStructure.order.pop(); assert.throws(() => readers.runtimeView(s));
  assert.throws(() => readers.previousOccurrences([s], current(), current().sessionStructure.slots[0]));
});
