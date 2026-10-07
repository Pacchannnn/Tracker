import test from 'node:test';
import assert from 'node:assert/strict';
import * as progress from '../js/progress.js';

const page = (...args) => {
  assert.equal(typeof progress.exerciseHistoryPage, 'function', 'history paging projection exists');
  return progress.exerciseHistoryPage(...args);
};

function savedHistory(count, name = 'Row') {
  return [{
    id: 'saved-session', date: '2026-10-08', workout: 'CUSTOM',
    workoutSnapshot: { name: 'Saved workout', planId: 'saved-plan' },
    sets: Array.from({ length: count }, (_, index) => ({
      id: `set-${index + 1}`, slotId: index % 2 ? 'slot-second' : 'slot-first',
      exerciseId: index % 2 ? 'exercise-second' : 'exercise-first', exerciseIndex: index % 2,
      exerciseName: name, setNumber: index + 1, weight: index + 0.5,
      unit: index % 2 ? 'lb' : 'kg', reps: 10 + index, rir: index % 3 ? 2 : null,
      notes: `Saved note ${index + 1}`
    })).reverse()
  }];
}

for (const [count, visible, hasMore] of [
  [0, 0, false], [1, 1, false], [19, 19, false], [20, 20, false],
  [21, 20, true], [40, 20, true], [41, 20, true], [73, 20, true]
]) test(`initial history page shows ${visible} of ${count} saved sets`, () => {
  const result = page(savedHistory(count), 'Row');
  assert.equal(result.total, count);
  assert.equal(result.items.length, visible);
  assert.equal(result.hasMore, hasMore);
  assert.deepEqual(result.items.map(item => item.id), Array.from({ length: visible }, (_, index) => `set-${index + 1}`));
});

test('successive limits reveal 20, 40, 60 and all 73 saved rows without duplicates or missing values', () => {
  const sessions = savedHistory(73);
  let previous = [];
  for (const [limit, visible, hasMore] of [[20, 20, true], [40, 40, true], [60, 60, true], [80, 73, false]]) {
    const result = page(sessions, 'Row', limit);
    assert.equal(result.total, 73);
    assert.equal(result.items.length, visible);
    assert.equal(result.hasMore, hasMore);
    assert.deepEqual(result.items.slice(0, previous.length), previous);
    assert.equal(new Set(result.items.map(item => item.id)).size, visible);
    result.items.forEach((item, index) => assert.deepEqual(item, {
      date: '2026-10-08', workout: 'CUSTOM', workoutName: 'Saved workout',
      id: `set-${index + 1}`, slotId: index % 2 ? 'slot-second' : 'slot-first',
      exerciseId: index % 2 ? 'exercise-second' : 'exercise-first', exerciseIndex: index % 2,
      exerciseName: 'Row', setNumber: index + 1, weight: index + 0.5,
      unit: index % 2 ? 'lb' : 'kg', reps: 10 + index, rir: index % 3 ? 2 : null,
      notes: `Saved note ${index + 1}`
    }));
    previous = result.items;
  }
});

test('same-name rows retain existing date/set order and separate saved owners across sessions', () => {
  const sessions = [
    { id: 'older-session', date: '2026-10-06', workout: 'A', sets: [
      { id: 'old-2', slotId: 'old-slot', exerciseId: 'old-exercise', exerciseName: 'Row', setNumber: 2, weight: 15, reps: 9, rir: null },
      { id: 'unrelated', exerciseName: 'Curl', setNumber: 1, weight: 10, reps: 12, rir: 2 },
      { id: 'old-1', slotId: 'old-slot', exerciseName: 'Row', setNumber: 1, weight: 12, unit: 'kg', reps: 10, rir: 3 }
    ] },
    { id: 'new-first-session', date: '2026-10-08', workout: 'CUSTOM', workoutSnapshot: { name: 'Historical plan' }, sets: [
      { id: 'new-2', slotId: 'replacement-slot', exerciseId: 'different-exercise', exerciseName: 'Row', setNumber: 2, weight: 37, unit: 'lb', reps: 8, rir: 1 },
      { id: 'new-first-1', slotId: 'removed-slot', exerciseId: 'previous-exercise', exerciseName: 'Row', setNumber: 1, weight: 35, unit: 'lb', reps: 9, rir: 2 }
    ] },
    { id: 'new-second-session', date: '2026-10-08', workout: 'B', sets: [
      { id: 'new-second-1', slotId: 'another-slot', exerciseName: 'Row', setNumber: 1, weight: 20, unit: 'kg', reps: 11, rir: 3 }
    ] }
  ];
  const expected = [
    { date: '2026-10-08', workout: 'CUSTOM', workoutName: 'Historical plan', id: 'new-first-1', slotId: 'removed-slot', exerciseId: 'previous-exercise', exerciseName: 'Row', setNumber: 1, weight: 35, unit: 'lb', reps: 9, rir: 2 },
    { date: '2026-10-08', workout: 'B', workoutName: 'Buổi B', id: 'new-second-1', slotId: 'another-slot', exerciseName: 'Row', setNumber: 1, weight: 20, unit: 'kg', reps: 11, rir: 3 },
    { date: '2026-10-08', workout: 'CUSTOM', workoutName: 'Historical plan', id: 'new-2', slotId: 'replacement-slot', exerciseId: 'different-exercise', exerciseName: 'Row', setNumber: 2, weight: 37, unit: 'lb', reps: 8, rir: 1 },
    { date: '2026-10-06', workout: 'A', workoutName: 'Buổi A', id: 'old-1', slotId: 'old-slot', exerciseName: 'Row', setNumber: 1, weight: 12, unit: 'kg', reps: 10, rir: 3 },
    { date: '2026-10-06', workout: 'A', workoutName: 'Buổi A', id: 'old-2', slotId: 'old-slot', exerciseId: 'old-exercise', exerciseName: 'Row', setNumber: 2, weight: 15, reps: 9, rir: null }
  ];
  assert.deepEqual(progress.exerciseHistory(sessions, 'Row'), expected);
  assert.deepEqual(page(sessions, 'Row', 3), { items: expected.slice(0, 3), total: 5, hasMore: true });
  assert.deepEqual(page(sessions, 'Row', 20), { items: expected, total: 5, hasMore: false });
});

test('a fresh name or data context uses the initial limit without retaining a prior expanded page', () => {
  const sessions = [...savedHistory(73), ...savedHistory(41, 'Curl')];
  assert.equal(page(sessions, 'Row', 80).items.length, 73);
  assert.equal(page(sessions, 'Curl').items.length, 20);
  assert.equal(page(savedHistory(40), 'Row').items.length, 20);
  assert.equal(page(sessions, 'Row').items.length, 20);
  assert.deepEqual(page(sessions, 'Missing'), { items: [], total: 0, hasMore: false });
});

test('paging accepts frozen saved input and leaves every source session, set and snapshot unchanged', () => {
  const sessions = savedHistory(73);
  const before = structuredClone(sessions);
  const freeze = value => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  freeze(sessions);
  for (const limit of [20, 40, 60, 80]) page(sessions, 'Row', limit);
  assert.deepEqual(sessions, before);
});

test('history limits must be positive safe integers and cap only visible rows', () => {
  const sessions = savedHistory(21);
  for (const invalid of [0, -1, 1.5, NaN, Infinity, '20', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => page(sessions, 'Row', invalid), RangeError);
  }
  assert.equal(page(sessions, 'Row', 1).items.length, 1);
  assert.deepEqual(page(sessions, 'Row', 21), { items: progress.exerciseHistory(sessions, 'Row'), total: 21, hasMore: false });
  assert.equal(page(sessions, 'Row', 100).items.length, 21);
});
