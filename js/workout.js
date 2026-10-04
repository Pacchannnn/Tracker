import { setCount } from './program.js?v=20';

export function previousExerciseSets(sessions, workout, exerciseIndex, excludeId = null, exerciseId = null) {
  const latest = [...sessions]
    .filter(item => item.id !== excludeId && (exerciseId ? item.sets.some(set => set.exerciseId === exerciseId) : item.workout === workout && item.sets.some(set => set.exerciseIndex === exerciseIndex)))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
    .at(-1);
  return latest?.sets.filter(set => exerciseId ? set.exerciseId === exerciseId : set.exerciseIndex === exerciseIndex) || [];
}

export function previousSetFor(sessions, workout, exerciseIndex, setNumber, excludeId = null, exerciseId = null) {
  const relevant = previousExerciseSets(sessions, workout, exerciseIndex, excludeId, exerciseId);
  return relevant.find(set => set.setNumber === setNumber) || relevant[0] || null;
}

export function nextIncompleteExercise(exercises, draft) {
  const index = exercises.findIndex((item, exerciseIndex) =>
    Array.from({ length: draft.workoutSnapshot ? item.sets : setCount(item, draft.week) }, (_, n) => n + 1)
      .some(setNumber => !draft.sets.some(set => set.exerciseIndex === exerciseIndex && set.setNumber === setNumber))
  );
  return index < 0 ? null : index;
}

export function restSeconds(rest) {
  if (typeof rest !== 'string') return null;
  const amount = Number(rest.match(/^\d+/)?.[0]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (rest.includes('phút')) return amount * 60;
  if (rest.includes('giây')) return amount;
  return null;
}
