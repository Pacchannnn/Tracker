import { dailyTotals, localDate } from './data.js?v=36';

const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function weeklySummary(data, start) {
  const end = new Date(`${start}T12:00:00`);
  end.setDate(end.getDate() + 6);
  const endDate = localDate(end);
  const inWeek = item => item.date >= start && item.date <= endDate;
  const sessions = data.sessions.filter(inWeek);
  const checkins = data.checkins.filter(inWeek);
  const entries = data.entries.filter(inWeek);
  const dates = [...new Set(entries.map(item => item.date))];
  const totals = dates.map(date => dailyTotals(entries, date));
  return {
    start, end: endDate,
    workouts: sessions.length,
    sessionCounts: Object.fromEntries(['A', 'B', 'C', 'D', 'CUSTOM'].map(key => [key, sessions.filter(item => item.workout === key).length])),
    weightAverage: average(checkins.map(item => item.weight).filter(value => value !== null)),
    waistAverage: average(checkins.map(item => item.waist).filter(value => value !== null)),
    nutritionDays: dates.length,
    calorieAverage: average(totals.map(item => item.calories)),
    proteinAverage: average(totals.map(item => item.protein)),
    proteinDaysMet: totals.filter(item => item.protein >= data.settings.protein).length,
    cardioMinutes: data.cardioEntries.filter(inWeek).reduce((sum, item) => sum + item.durationMinutes, 0),
    kneeRecords: data.kneeEntries.filter(inWeek).length
  };
}

export function exerciseHistory(sessions, name) {
  return sessions.flatMap(session => session.sets
    .filter(set => set.exerciseName === name)
    .map(set => ({ date: session.date, workout: session.workout, workoutName: session.workoutSnapshot?.name || `Buổi ${session.workout}`, ...set })))
    .sort((a, b) => b.date.localeCompare(a.date) || a.setNumber - b.setNumber);
}
