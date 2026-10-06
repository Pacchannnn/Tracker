import { validDate, localDate, dailyTotals } from './data.js?v=30';
import { sessionTitle } from './custom-workout.js?v=30';

export function shiftCalendarDate(date, delta) {
  if (!validDate(date) || !Number.isInteger(delta)) throw new Error('Ngày không hợp lệ.');
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + delta);
  const result = localDate(next).padStart(10, '0');
  if (!validDate(result)) throw new Error('Ngày ngoài phạm vi được hỗ trợ.');
  return result;
}

// Explicit calendar dates are authoritative. ISO metadata never changes membership.
export function daySummary(data, photosMetadata, date) {
  if (!validDate(date)) throw new Error('Ngày không hợp lệ.');
  const onDate = records => records.filter(item => item.date === date);
  const journals = onDate(data.journalEntries), entries = onDate(data.entries);
  const workouts = onDate(data.sessions).map(session => ({
    id: session.id, name: sessionTitle(session),
    sourceType: session.workoutSnapshot?.planName || (session.workout === 'CUSTOM' ? 'Buổi riêng' : 'Original Plan'),
    // Count only exercises with actual saved sets; closed/replacement slots are not expanded.
    exerciseCount: new Set(session.sets.map(set => set.slotId ?? set.exerciseIndex ?? set.exerciseName)).size,
    setCount: session.sets.length, notes: session.notes || '',
    exerciseNames: [...new Set(session.sets.map(set => set.exerciseName).filter(Boolean))]
  }));
  const cardio = onDate(data.cardioEntries), checkins = onDate(data.checkins), knees = onDate(data.kneeEntries);
  const seen = new Set();
  const photos = onDate(photosMetadata).filter(photo => {
    if (seen.has(photo.id)) return false;
    seen.add(photo.id); return true;
  });
  const presence = { journal: !!journals.length, gym: !!workouts.length, cardio: !!cardio.length,
    nutrition: !!entries.length, checkin: !!checkins.length, knee: !!knees.length, photos: !!photos.length };
  return { date, journals, workouts, cardio, checkins, knees, photos, presence,
    nutrition: { totals: entries.length ? dailyTotals(entries, date) : null, itemCount: entries.length,
      mealCount: new Set(entries.map(entry => entry.meal)).size },
    empty: !Object.values(presence).some(Boolean), photoError: false,
    sources: Object.fromEntries(Object.entries({ journal: 'journal', gym: 'history', cardio: 'gym-logs',
      nutrition: 'nutrition', checkin: 'checkins', knee: 'gym-logs', photos: 'journal' }).map(([key, view]) => [key, { view, date }])) };
}

export async function readDay(data, date, readMetadata) {
  let photos = [], photoError = false;
  try { photos = await readMetadata(); } catch { photoError = true; }
  const summary = daySummary(data, photos, date);
  return { ...summary, empty: photoError && summary.empty ? null : summary.empty, photoError };
}
