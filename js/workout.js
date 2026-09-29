import { setCount } from './program.js';

export function previousSetFor(sessions, workout, exerciseIndex, setNumber, excludeId = null) {
  const latest = [...sessions]
    .filter(item => item.workout === workout && item.id !== excludeId)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
    .at(-1);
  const relevant = latest?.sets.filter(set => set.exerciseIndex === exerciseIndex) || [];
  return relevant.find(set => set.setNumber === setNumber) || relevant[0] || null;
}

export function nextIncompleteExercise(exercises, draft) {
  const index = exercises.findIndex((item, exerciseIndex) =>
    Array.from({ length: setCount(item, draft.week) }, (_, n) => n + 1)
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
