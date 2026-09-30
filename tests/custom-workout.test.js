import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExercise, validateSlot, libraryExercises, alternativesFor, moveSlot, snapshotWorkout, deletePlan, removeCustomExercise, nextPlanDay, validatePlanningData, originalPlanCopy, duplicatePlan } from '../js/custom-workout.js';
import { emptyData, createBackup, parseBackup } from '../js/data.js';
import { PROGRAM, programDay } from '../js/program.js';

const exercise = { id: 'e1', ...{ name: 'My row', primaryMuscles: ['back'], secondaryMuscles: ['biceps'], movementPattern: 'horizontal-pull', equipment: ['cable'], notes: '' }, isCustom: true, createdAt: '2026-09-30', updatedAt: '2026-09-30', archived: false };
const slot = { id: 'slot1', exerciseId: 'e1', name: 'My row', sets: 3, repMin: 8, repMax: 12, targetRIR: 2, restSeconds: 120, notes: '' };
const plan = { id: 'p1', name: 'My plan', days: [{ id: 'd1', name: 'Pull', exercises: [slot] }], createdAt: '2026-09-30', updatedAt: '2026-09-30' };

test('custom exercise metadata and training parameters are validated', () => {
  assert.equal(validateExercise(exercise).name, 'My row');
  assert.throws(() => validateExercise({ ...exercise, name: '' }));
  assert.throws(() => validateExercise({ ...exercise, primaryMuscles: ['unknown'] }));
  assert.equal(validateSlot(slot).sets, 3);
  assert.throws(() => validateSlot({ ...slot, repMin: 15, repMax: 8 }));
  assert.throws(() => validateSlot({ ...slot, sets: 0 }));
  assert.throws(() => validateSlot({ ...slot, targetRIR: 11 }));
});

test('reordering slots and editing templates do not mutate completed snapshots', () => {
  const day = { ...plan.days[0], exercises: [slot, { ...slot, id: 'slot2', name: 'Other' }] };
  const snapshot = snapshotWorkout(day, plan);
  const moved = moveSlot(day.exercises, 0, 1);
  assert.equal(moved[0].id, 'slot2');
  assert.equal(day.exercises[0].id, 'slot1');
  day.exercises[0].sets = 5;
  plan.name = 'Changed';
  assert.equal(snapshot.exercises[0].sets, 3);
  assert.equal(snapshot.planName, 'My plan');
});

test('plan deletion preserves history and falls back to original when active', () => {
  const state = { plans: [plan], activePlanId: 'p1', sessions: [{ id: 's1', workoutSnapshot: snapshotWorkout(plan.days[0], plan) }], draft: null };
  const history = structuredClone(state.sessions);
  deletePlan(state, 'p1');
  assert.deepEqual(state.sessions, history);
  assert.equal(state.activePlanId, null);
  assert.equal(state.plans.length, 0);
});

test('referenced exercises archive while unused custom exercises can be deleted', () => {
  const state = { customExercises: [structuredClone(exercise)], plans: [plan], sessions: [], draft: null };
  assert.equal(removeCustomExercise(state, 'e1'), 'archived');
  assert.equal(state.customExercises[0].archived, true);
  state.plans = [];
  assert.equal(removeCustomExercise(state, 'e1'), 'deleted');
  assert.equal(state.customExercises.length, 0);
});

test('library alternatives match purpose and exclude archived exercises', () => {
  const library = libraryExercises([exercise, { ...exercise, id: 'e2', archived: true }]);
  const rows = alternativesFor(exercise, library);
  assert.ok(rows.some(item => item.exercise.movementPattern === 'horizontal-pull'));
  assert.ok(!rows.some(item => item.exercise.id === 'e2' || item.exercise.id === 'e1'));
});

test('custom plan sequence ignores one-off sessions and follows named day IDs', () => {
  const custom = { ...plan, days: [plan.days[0], { id: 'd2', name: 'Push', exercises: [slot] }] };
  assert.equal(nextPlanDay(custom, []).id, 'd1');
  assert.equal(nextPlanDay(custom, [{ date: '2026-09-30', workoutSnapshot: { planId: 'p1', dayId: 'd1' } }]).id, 'd2');
  assert.equal(nextPlanDay(custom, [{ date: '2026-09-30', workoutSnapshot: { planId: null, dayId: 'temporary' } }]).id, 'd1');
  const oneOff = snapshotWorkout(custom.days[0]);
  assert.equal(oneOff.planId, null);
});

test('planning backup validates plan references and snapshots without live templates', () => {
  assert.doesNotThrow(() => validatePlanningData({ customExercises: [exercise], plans: [plan], activePlanId: 'p1' }));
  assert.throws(() => validatePlanningData({ customExercises: [exercise], plans: [plan], activePlanId: 'missing' }));
});
test('original plan copies preserve all weeks and source definitions', () => {
  const before = structuredClone(PROGRAM); let index = 0;
  for (const week of [1, 2, 3, 6, 12]) {
    const copy = originalPlanCopy(week, () => `copy${index++}`);
    assert.doesNotThrow(() => validatePlanningData({ customExercises: [], plans: [copy], activePlanId: copy.id }));
    for (const [dayIndex, day] of copy.days.entries()) {
      const source = programDay(Object.keys(PROGRAM)[dayIndex], week);
      assert.deepEqual(day.exercises.map(item => item.sets), source.exercises.map(item => item.sets));
      assert.deepEqual(day.exercises.map(item => item.name), source.exercises.map(item => item.name));
    }
  }
  assert.deepEqual(PROGRAM, before);
});
test('custom snapshot backup round trips after its plan is deleted and rejects broken live references', () => {
  const state = emptyData(); state.customExercises.push(structuredClone(exercise)); state.plans.push(structuredClone(plan)); state.activePlanId = plan.id;
  state.sessions.push({ id: 'session', workout: 'CUSTOM', week: 1, date: '2026-09-30', notes: '', workoutSnapshot: snapshotWorkout(plan.days[0], plan), sets: [
    { id: 'set1', exerciseId: exercise.id, exerciseIndex: 0, exerciseName: slot.name, setNumber: 1, weight: 30, reps: 10, rir: 2, unit: 'kg' }
  ] });
  deletePlan(state, plan.id);
  assert.deepEqual(parseBackup(createBackup(state)).data, state);
  const badIndex = structuredClone(state); badIndex.sessions[0].sets[0].exerciseIndex = 99;
  assert.throws(() => createBackup(badIndex), /hiệp/);
  const broken = emptyData(); broken.plans.push(structuredClone(plan));
  assert.throws(() => createBackup(broken), /tham chiếu/);
});
test('duplicating a long-named plan keeps valid names and independent day/slot IDs', () => {
  const source = { ...structuredClone(plan), name: 'A'.repeat(160) }; let index = 0;
  const copy = duplicatePlan(source, () => `duplicate${index++}`);
  assert.equal(copy.name.length, 160);
  assert.notEqual(copy.id, source.id); assert.notEqual(copy.days[0].id, source.days[0].id);
  assert.notEqual(copy.days[0].exercises[0].id, source.days[0].exercises[0].id);
  copy.days[0].exercises[0].sets = 7; assert.notEqual(source.days[0].exercises[0].sets, 7);
  assert.doesNotThrow(() => validatePlanningData({ customExercises: [exercise], plans: [copy], activePlanId: copy.id }));
});
