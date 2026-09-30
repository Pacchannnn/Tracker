import test from 'node:test';
import assert from 'node:assert/strict';
import { previousSetFor, nextIncompleteExercise, restSeconds } from '../js/workout.js';

test('quick fill uses the same set from the latest completed matching workout', () => {
  const sessions = [
    { id: 'old', workout: 'A', date: '2026-09-20', sets: [{ exerciseIndex: 0, setNumber: 1, weight: 30, reps: 10, rir: 2 }] },
    { id: 'new', workout: 'A', date: '2026-09-28', sets: [
      { exerciseIndex: 0, setNumber: 1, weight: 40, unit: 'kg', reps: 11, rir: 2 },
      { exerciseIndex: 0, setNumber: 2, weight: 42, unit: 'kg', reps: 9, rir: 3 }
    ] }
  ];
  assert.equal(previousSetFor(sessions, 'A', 0, 2)?.weight, 42);
  assert.equal(previousSetFor(sessions, 'A', 0, 3)?.weight, 40);
  assert.equal(previousSetFor(sessions, 'B', 0, 1), null);
});

test('focus mode finds the next exercise with a missing planned set', () => {
  const exercises = [{ sets: 2 }, { sets: 2 }];
  const draft = { week: 3, sets: [{ exerciseIndex: 0, setNumber: 1 }, { exerciseIndex: 0, setNumber: 2 }] };
  assert.equal(nextIncompleteExercise(exercises, draft), 1);
  draft.sets.push({ exerciseIndex: 1, setNumber: 1 }, { exerciseIndex: 1, setNumber: 2 });
  assert.equal(nextIncompleteExercise(exercises, draft), null);
});

test('rest duration uses the minimum defined duration without inventing a value', () => {
  assert.equal(restSeconds('2 phút'), 120);
  assert.equal(restSeconds('60–90 giây'), 60);
  assert.equal(restSeconds('DATA NOT DEFINED YET'), null);
});
test('custom sessions keep configured three sets in week one and match previous exercise IDs', () => {
  const exercises = [{ sets: 3, exerciseId: 'e1', name: 'Row' }];
  const draft = { id: 'new', week: 1, workoutSnapshot: { exercises }, sets: [{ exerciseIndex: 0, setNumber: 1 }, { exerciseIndex: 0, setNumber: 2 }] };
  assert.equal(nextIncompleteExercise(exercises, draft), 0);
  const previous = [{ id: 'old', workout: 'CUSTOM', date: '2026-09-29', sets: [{ exerciseIndex: 2, exerciseId: 'e1', setNumber: 1, weight: 20 }] }];
  assert.equal(previousSetFor(previous, 'CUSTOM', 0, 1, null, 'e1').weight, 20);
});
