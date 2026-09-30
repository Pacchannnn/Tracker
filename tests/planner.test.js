import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlannerRequest, suggestWorkout, validatePlannerOutput } from '../js/planner.js';
const library = [
  { id: 'a', name: 'Press', primaryMuscles: ['chest'], equipment: ['machine'], movementPattern: 'horizontal-push', notes: '' },
  { id: 'b', name: 'Fly', primaryMuscles: ['chest'], equipment: ['cable'], movementPattern: 'shoulder-fly', notes: '' },
  { id: 'c', name: 'Row', primaryMuscles: ['back'], equipment: ['machine'], movementPattern: 'horizontal-pull', notes: '' }
];
const request = overrides => createPlannerRequest({ muscles: ['chest'], equipment: ['machine'], count: 1, sets: 2, repMin: 8, repMax: 12, targetRIR: '2', restSeconds: 90, workSeconds: 40, ...overrides });
test('local planner respects equipment, requested exercises and exclusions without activating a plan', () => {
  const result = suggestWorkout(request({ muscles: ['chest', 'back'], include: ['c'], count: 2 }), library, () => 'id');
  assert.equal(result.status, 'draft'); assert.equal(result.source, 'local');
  assert.deepEqual(result.workout.exercises.map(item => item.exerciseId), ['c', 'a']);
  assert.equal(result.activePlanId, undefined);
  assert.equal(suggestWorkout(request({ exclude: ['a'] }), library).status, 'conflict');
});
test('planner reports conflicting choices, duration and explicit health constraints', () => {
  assert.equal(suggestWorkout(request({ include: ['a'], exclude: ['a'] }), library).status, 'conflict');
  assert.equal(suggestWorkout(request({ include: ['b'] }), library).status, 'conflict');
  assert.equal(suggestWorkout(request({ minutes: 1 }), library).status, 'conflict');
  assert.equal(suggestWorkout(request({ healthRestrictions: 'Do not load my knee' }), library).status, 'conflict');
  assert.throws(() => request({ repMin: 15, repMax: 8 }));
});
test('planner detects an uncovered muscle and does not silently drop it', () => {
  const result = suggestWorkout(request({ muscles: ['chest', 'back'], count: 1 }), library);
  assert.equal(result.status, 'conflict');
  assert.match(result.conflicts.join(' '), /nhóm cơ/);
});
test('provider output validation refuses arbitrary exercises and ignored user constraints', () => {
  const raw = request({ include: ['a'] });
  const draft = suggestWorkout(raw, library);
  assert.doesNotThrow(() => validatePlannerOutput(draft, raw, library));
  const tampered = structuredClone(draft); tampered.workout.exercises[0].exerciseId = 'c';
  assert.throws(() => validatePlannerOutput(tampered, raw, library));
  const changedSets = structuredClone(draft); changedSets.workout.exercises[0].sets = 10;
  assert.throws(() => validatePlannerOutput(changedSets, raw, library));
});
