import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM, setCount, todayWorkout, targetRir, weekGuidance } from '../js/program.js';
import { emptyData, validateSet, validateFood, validateEntry, validateCheckin, dailyTotals, loadData, saveData } from '../js/data.js';

test('program preserves plan order and first two weeks reduce three-set exercises', () => {
  assert.deepEqual(Object.keys(PROGRAM), ['A', 'B', 'C', 'D']);
  assert.equal(PROGRAM.A.exercises[0].name, 'Lat pulldown, tay cầm thoải mái');
  assert.equal(setCount(PROGRAM.A.exercises[0], 1), 2);
  assert.equal(setCount(PROGRAM.A.exercises[0], 3), 3);
  assert.equal(setCount(PROGRAM.B.exercises[2], 1), 2);
  assert.equal(todayWorkout(new Date('2026-09-28T12:00:00')), 'A');
  assert.equal(todayWorkout(new Date('2026-09-30T12:00:00')), null);
  assert.equal(targetRir(PROGRAM.B.exercises[5], 3), 'DATA NOT DEFINED YET');
  assert.match(weekGuidance(7), /giảm tải/);
});

test('set validation rejects missing and invalid numbers', () => {
  assert.throws(() => validateSet({ weight: '', reps: '10', rir: '2' }));
  assert.throws(() => validateSet({ weight: '-1', reps: '10', rir: '2' }));
  assert.throws(() => validateSet({ weight: '20', reps: '-1', rir: '2' }));
  assert.throws(() => validateSet({ weight: '20', reps: '10', rir: '11' }));
  assert.deepEqual(validateSet({ weight: '20.5', reps: '10', rir: '2' }), { weight: 20.5, reps: 10, rir: 2 });
  assert.deepEqual(validateSet({ weight: '45', reps: '10', rir: '2', unit: 'lb' }), { weight: 45, reps: 10, rir: 2, unit: 'lb' });
  assert.throws(() => validateSet({ weight: '45', reps: '10', rir: '2', unit: 'stone' }));
});

test('food, entry and check-in validation and macro totals', () => {
  assert.throws(() => validateFood({ name: '', serving: '100 g', calories: 10, protein: 1, carbs: 1, fat: 0 }));
  assert.throws(() => validateFood({ name: 'A', serving: '100 g', calories: -1, protein: 1, carbs: 1, fat: 0 }));
  assert.throws(() => validateEntry({ date: '2026-02-30', meal: 'Lunch', servings: 1 }));
  assert.throws(() => validateCheckin({ date: '2026-09-25', weight: '', waist: '', sleep: '' }));
  const food = validateFood({ name: 'A', serving: '100 g', calories: 120, protein: 10, carbs: 8, fat: 4 });
  assert.equal(food.calories, 120);
  const entry = validateEntry({ date: '2026-09-25', meal: 'Lunch', servings: '2' });
  assert.equal(dailyTotals([{ ...entry, food, date: '2026-09-25' }], '2026-09-25').calories, 240);
});

test('one versioned storage object round trips and corrupt data fails safely', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const data = emptyData();
  data.settings.week = 2;
  saveData(storage, data);
  assert.equal(loadData(storage).settings.week, 2);
  memory.set('vshape-tracker', '{bad');
  assert.throws(() => loadData(storage));
});
