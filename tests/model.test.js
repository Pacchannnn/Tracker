import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM, programDay, setCount, todayWorkout, targetRir, weekGuidance, nextWorkout } from '../js/program.js';
import { emptyData, validateSet, validateFood, validateEntry, validateCheckin, validateCardio, validateKnee, dailyTotals, loadData, saveData, diaryDate, foodSnapshotForEntry, updateData, createBackup, parseBackup, ensureUnchanged } from '../js/data.js';

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

test('selected program day shows plan-derived sets and RIR for the current week', () => {
  const firstWeek = programDay('A', 1);
  assert.equal(firstWeek.title, 'Thân trên · ưu tiên xô');
  assert.equal(firstWeek.exercises[0].sets, 2);
  assert.equal(firstWeek.exercises[0].reps, '8–12');
  assert.equal(firstWeek.exercises[0].rir, '3–4');
  assert.equal(programDay('B', 3).exercises[0].rir, '2–3');
  assert.throws(() => programDay('Z', 1));
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

test('today diary follows the local day while a chosen past date stays selected', () => {
  const tomorrow = new Date('2026-10-01T09:00:00');
  assert.equal(diaryDate({ mode: 'today', date: '2026-09-30' }, tomorrow), '2026-10-01');
  assert.equal(diaryDate({ mode: 'selected', date: '2026-09-28' }, tomorrow), '2026-09-28');
});

test('next workout follows completed sessions, including missed weekdays', () => {
  assert.equal(nextWorkout([]), 'A');
  assert.equal(nextWorkout([{ workout: 'A', date: '2026-09-28' }]), 'B');
  assert.equal(nextWorkout([{ workout: 'A', date: '2026-09-28' }, { workout: 'B', date: '2026-09-30' }]), 'C');
  assert.equal(nextWorkout([{ workout: 'D', date: '2026-09-29' }]), 'A');
  assert.equal(nextWorkout([{ workout: 'A', date: '2026-09-28' }], { workout: 'A' }), 'A');
});

test('edits preserve the logged food snapshot unless the food is replaced', () => {
  const old = { foodId: 'food-1', food: { name: 'Food', serving: '1 cup', calories: 100, protein: 8, carbs: 10, fat: 2 } };
  const updated = { id: 'food-1', name: 'Food', serving: '1 cup', calories: 200, protein: 16, carbs: 20, fat: 4 };
  assert.equal(foodSnapshotForEntry(old, 'food-1', [updated]).calories, 100);
  assert.equal(dailyTotals([{ date: '2026-09-28', servings: 2, food: foodSnapshotForEntry(old, 'food-1', [updated]) }], '2026-09-28').calories, 200);
  assert.equal(foodSnapshotForEntry(old, 'food-2', [{ ...updated, id: 'food-2' }]).calories, 200);
});

test('serialized writes reread the latest state across tabs', async () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  let queue = Promise.resolve();
  const locks = { request: (_name, callback) => {
    const operation = queue.then(callback);
    queue = operation.catch(() => {});
    return operation;
  } };
  const tabA = emptyData();
  const tabB = emptyData();
  await Promise.all([
    updateData(storage, locks, next => { next.sessions.push({ id: 'session-1' }); }),
    updateData(storage, locks, next => { next.foods.push({ id: 'food-1' }); })
  ]);
  assert.equal(tabA.sessions.length + tabB.foods.length, 0);
  assert.equal(loadData(storage).sessions.length, 1);
  assert.equal(loadData(storage).foods.length, 1);
});

test('an edit refuses to overwrite a record changed in another tab', () => {
  assert.doesNotThrow(() => ensureUnchanged({ id: '1', notes: 'old' }, { id: '1', notes: 'old' }));
  assert.throws(() => ensureUnchanged({ id: '1', notes: 'new' }, { id: '1', notes: 'old' }), /tab khác/);
  assert.throws(() => ensureUnchanged(undefined, { id: '1' }), /tab khác/);
});

test('backup round trip includes timestamp and preview counts', () => {
  const data = emptyData();
  data.sessions.push({ id: 's1', workout: 'A', date: '2026-09-30', week: 1, notes: '', sets: [{ id: 'set1', exerciseIndex: 0, exerciseName: 'Lat pulldown', setNumber: 1, weight: 40, unit: 'kg', reps: 10, rir: 2 }] });
  data.foods.push({ id: 'f1', name: 'Food', serving: '1', calories: 100, protein: 8, carbs: 10, fat: 2, notes: '' });
  const text = createBackup(data, new Date('2026-09-30T12:00:00Z'));
  const parsed = parseBackup(text);
  assert.equal(parsed.exportedAt, '2026-09-30T12:00:00.000Z');
  assert.deepEqual(parsed.counts, { sessions: 1, sets: 1, foods: 1, entries: 0, checkins: 0, cardio: 0, knee: 0, savedMeals: 0, recipes: 0 });
  assert.deepEqual(parsed.data, data);
});

test('restore rejects corrupt and incompatible files without changing storage', () => {
  assert.throws(() => parseBackup('{bad'), /JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ schemaVersion: 99, data: emptyData() })), /Phiên bản/);
  assert.throws(() => parseBackup(JSON.stringify({ schemaVersion: 1, exportedAt: '2026-09-30T12:00:00.000Z', data: emptyData() })), /khớp/);
  assert.throws(() => parseBackup(JSON.stringify({ ...emptyData(), sessions: [{ id: 'bad' }] })), /buổi tập/);
  assert.throws(() => parseBackup(JSON.stringify({ ...emptyData(), entries: [{ id: 'e1', date: '2026-09-30', meal: 'Lunch', servings: 1, foodId: 'f1', food: { calories: 'oops' } }] })), /bữa ăn/);
  assert.equal(parseBackup(JSON.stringify(emptyData())).data.schemaVersion, 4);
});

test('backup includes saved meals and recipes with stable snapshots', () => {
  const data = emptyData();
  const food = { name: 'Food', serving: '1', calories: 100, protein: 8, carbs: 10, fat: 2 };
  data.savedMeals.push({ id: 'm1', name: 'Lunch', items: [{ foodId: 'f1', food, servings: 1 }] });
  data.recipes.push({ id: 'r1', name: 'Recipe', description: '', servings: 2, ingredients: [{ quantity: 100, unit: 'g', name: 'Rice' }], steps: ['Cook'], tags: [], notes: '', nutritionPerServing: null });
  const restored = parseBackup(createBackup(data));
  assert.equal(restored.counts.savedMeals, 1);
  assert.equal(restored.counts.recipes, 1);
  assert.deepEqual(restored.data.savedMeals[0].items[0].food, food);
});

test('version 1 workout history migrates without deleting user data', () => {
  const old = emptyData();
  old.schemaVersion = 1;
  delete old.exerciseNotes;
  old.sessions.push({ id: 's1', workout: 'A', date: '2026-09-30', week: 1, notes: '', sets: [] });
  const memory = new Map([['vshape-tracker', JSON.stringify(old)]]);
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const loaded = loadData(storage);
  assert.equal(loaded.schemaVersion, 4);
  assert.deepEqual(loaded.exerciseNotes, {});
  assert.deepEqual(loaded.cardioEntries, []);
  assert.deepEqual(loaded.kneeEntries, []);
  assert.deepEqual(loaded.savedMeals, []);
  assert.deepEqual(loaded.recipes, []);
  assert.equal(loaded.sessions[0].id, 's1');
  assert.equal(JSON.parse(memory.get('vshape-tracker')).schemaVersion, 1);
  assert.equal(parseBackup(JSON.stringify(old)).data.sessions[0].id, 's1');
});

test('version 2 exercise notes migrate and remain intact', () => {
  const old = { ...emptyData(), schemaVersion: 2, exerciseNotes: { 'A:0': 'Ghế số 3' } };
  delete old.cardioEntries;
  delete old.kneeEntries;
  const storage = { getItem: () => JSON.stringify(old) };
  const next = loadData(storage);
  assert.equal(next.schemaVersion, 4);
  assert.equal(next.exerciseNotes['A:0'], 'Ghế số 3');
  assert.deepEqual(next.cardioEntries, []);
});

test('version 3 cardio and knee data migrate into the nutrition schema', () => {
  const old = { ...emptyData(), schemaVersion: 3, cardioEntries: [{ id: 'c1', date: '2026-09-30', activity: 'Walk', durationMinutes: 20, distanceKm: null, intensity: '', notes: '' }] };
  delete old.savedMeals;
  delete old.recipes;
  const loaded = loadData({ getItem: () => JSON.stringify(old) });
  assert.equal(loaded.schemaVersion, 4);
  assert.equal(loaded.cardioEntries[0].id, 'c1');
  assert.deepEqual(loaded.savedMeals, []);
  assert.deepEqual(loaded.recipes, []);
});

test('cardio and knee logs accept records without inventing prescriptions or symptoms', () => {
  assert.deepEqual(validateCardio({ date: '2026-09-30', activity: 'Xe đạp', durationMinutes: '20', distanceKm: '', intensity: '', notes: '' }),
    { date: '2026-09-30', activity: 'Xe đạp', durationMinutes: 20, distanceKm: null, intensity: '', notes: '' });
  assert.throws(() => validateCardio({ date: '2026-09-30', activity: 'Đi bộ', durationMinutes: '-2' }));
  assert.deepEqual(validateKnee({ date: '2026-09-30', moment: 'next-morning', pain: '3', swelling: 'unknown', instability: 'no', stiffness: 'yes', notes: '' }),
    { date: '2026-09-30', moment: 'next-morning', pain: 3, swelling: 'unknown', instability: 'no', stiffness: 'yes', notes: '' });
  assert.throws(() => validateKnee({ date: '2026-09-30', moment: 'after', pain: '', swelling: 'unknown', instability: 'unknown', stiffness: 'unknown', notes: '' }));
});
