import { validDate } from './data.js?v=40';

export function readLifeData(load) {
  try { return { status: 'available', data: structuredClone(load()) }; }
  catch { return { status: 'unavailable', reason: { code: 'canonical-load-error', message: 'Chưa đọc được dữ liệu JSON. Kho ảnh được đọc riêng.' } }; }
}

// Re-resolve a derivation's identity against the latest canonical snapshot.
// This never reopens a workout, repairs a record, or reads an image.
export function resolveLifeSource(data, photos, ref) {
  const changed = () => { throw new Error('Bản ghi đã thay đổi hoặc không còn ở ngày này.'); };
  if (!ref || !validDate(ref.date)) return changed();
  if (ref.kind === 'day') return { kind: 'day', date: ref.date };
  const collections = { journal: 'journalEntries', nutrition: 'entries', workout: 'sessions', cardio: 'cardioEntries', checkin: 'checkins', knee: 'kneeEntries' };
  if (ref.kind === 'set') {
    if (!Array.isArray(data?.sessions) || new Set(data.sessions.map(item => item.id)).size !== data.sessions.length) return changed();
    const session = data?.sessions?.find(item => item.id === ref.sessionId && item.date === ref.date);
    if (!Array.isArray(session?.sets) || new Set(session.sets.map(item => item.id)).size !== session.sets.length) return changed();
    const record = session?.sets?.find(item => item.id === ref.id);
    if (!record || (ref.slotId !== null ? record.slotId !== ref.slotId : record.slotId != null || record.exerciseIndex !== ref.legacyIndex)) return changed();
    return structuredClone({ kind: ref.kind, date: ref.date, record, session });
  }
  const records = ref.kind === 'photo' ? photos : data?.[collections[ref.kind]];
  if (!Array.isArray(records) || typeof ref.id !== 'string') return changed();
  if (new Set(records.map(item => item.id)).size !== records.length) return changed();
  if (ref.kind === 'journal' && new Set(records.map(item => item.date)).size !== records.length) return changed();
  const matches = records.filter(item => item.id === ref.id && item.date === ref.date);
  if (matches.length !== 1) return changed();
  return structuredClone({ kind: ref.kind, date: ref.date, record: matches[0] });
}
