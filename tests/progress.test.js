import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklySummary, exerciseHistory } from '../js/progress.js';

test('weekly summary uses only observed days and returns null for missing measurements', () => {
  const data = {
    settings: { calories: 2400, protein: 120 },
    sessions: [{ id: 's1', date: '2026-09-28', workout: 'A', sets: [] }],
    entries: [
      { date: '2026-09-28', servings: 1, food: { calories: 2000, protein: 120, carbs: 100, fat: 50 } },
      { date: '2026-09-30', servings: 1, food: { calories: 2200, protein: 100, carbs: 120, fat: 55 } }
    ],
    checkins: [{ date: '2026-09-28', weight: 70, waist: null }, { date: '2026-09-30', weight: 71, waist: 80 }],
    cardioEntries: [{ date: '2026-09-29', durationMinutes: 20 }], kneeEntries: []
  };
  const result = weeklySummary(data, '2026-09-28');
  assert.equal(result.workouts, 1);
  assert.equal(result.sessionCounts.A, 1);
  assert.equal(result.weightAverage, 70.5);
  assert.equal(result.waistAverage, 80);
  assert.equal(result.nutritionDays, 2);
  assert.equal(result.calorieAverage, 2100);
  assert.equal(result.proteinAverage, 110);
  assert.equal(result.proteinDaysMet, 1);
  assert.equal(result.cardioMinutes, 20);
  assert.equal(weeklySummary({ ...data, checkins: [], entries: [] }, '2026-09-21').weightAverage, null);
  assert.equal(weeklySummary({ ...data, checkins: [], entries: [] }, '2026-09-21').nutritionDays, 0);
});

test('exercise history reads snapshots and sorts latest first', () => {
  const data = { sessions: [
    { date: '2026-09-20', sets: [{ exerciseName: 'Row', weight: 30, reps: 10, rir: 2 }] },
    { date: '2026-09-28', sets: [{ exerciseName: 'Row', weight: 32, reps: 9, rir: 3 }, { exerciseName: 'Curl', weight: 10, reps: 12, rir: 2 }] }
  ] };
  assert.deepEqual(exerciseHistory(data.sessions, 'Row').map(item => item.weight), [32, 30]);
});
