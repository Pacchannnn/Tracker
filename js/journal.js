import { validDate } from './data.js?v=30';

export const MOODS = [
  { value: 'drained', label: 'Mệt', mark: '·' },
  { value: 'low', label: 'Chùng', mark: '··' },
  { value: 'steady', label: 'Bình thường', mark: '—' },
  { value: 'good', label: 'Ổn', mark: '✦' },
  { value: 'bright', label: 'Rất tốt', mark: '✦✦' }
];

function cleanTags(source) {
  const tags = Array.isArray(source) ? source : String(source ?? '').split(',');
  const seen = new Set();
  return tags.map(tag => String(tag).trim()).filter(tag => {
    const key = tag.toLocaleLowerCase('vi');
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function recentJournalTags(entries, limit = 8) {
  const newest = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  return cleanTags(newest.flatMap(item => item.tags)).slice(0, limit);
}

export function toggleJournalTag(text, tag) {
  const value = String(tag).trim();
  const key = value.toLocaleLowerCase('vi');
  const tags = cleanTags(text);
  const next = tags.some(item => item.toLocaleLowerCase('vi') === key)
    ? tags.filter(item => item.toLocaleLowerCase('vi') !== key) : [...tags, value];
  if (!value || value.includes(',') || next.length > 20 || next.some(item => item.length > 40)) throw new Error('Tối đa 20 thẻ, mỗi thẻ có 1–40 ký tự và không chứa dấu phẩy.');
  return next.join(', ');
}

export function validateJournal(raw) {
  if (!validDate(raw.date)) throw new Error('Ngày nhật ký không hợp lệ.');
  const mood = String(raw.mood ?? '');
  if (mood && !MOODS.some(item => item.value === mood)) throw new Error('Trạng thái ngày không hợp lệ.');
  const title = String(raw.title ?? '').trim();
  const note = String(raw.note ?? '').trim();
  const tags = cleanTags(raw.tags);
  if (!mood && !title && !note && !tags.length) throw new Error('Chọn trạng thái, thẻ hoặc viết một ghi chú.');
  if (title.length > 120 || note.length > 20000 || tags.length > 20 || tags.some(tag => tag.length > 40)) throw new Error('Nhật ký quá dài. Hãy rút ngắn tiêu đề, ghi chú hoặc thẻ.');
  return { date: raw.date, mood, title, note, tags };
}

export function monthDays(year, month) {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month, 0).getDate();
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) =>
    `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)];
}

export function normalizeJournalText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd').toLocaleLowerCase('vi').trim().replace(/\s+/g, ' ');
}

function journalRecords(entries) {
  if (!Array.isArray(entries) || !entries.every(entry => entry && typeof entry.id === 'string' && entry.id &&
    validDate(entry.date) && typeof entry.title === 'string' && typeof entry.note === 'string' &&
    Array.isArray(entry.tags) && entry.tags.every(tag => typeof tag === 'string'))) {
    throw new Error('Có dữ liệu nhật ký không thể tìm đọc. Dữ liệu được giữ nguyên; hãy kiểm tra bản sao lưu.');
  }
  return entries;
}

export function journalTagOptions(entries) {
  const options = new Map();
  for (const entry of [...journalRecords(entries)].sort((a,b) => b.date.localeCompare(a.date))) {
    for (const label of entry.tags) {
      const key = normalizeJournalText(label);
      if (key && !options.has(key)) options.set(key, label);
    }
  }
  return [...options.values()];
}

export function retrieveJournalEntries(entries, { query = '', tags = [], limit = 30 } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Số lượng nhật ký cần xem không hợp lệ.');
  const chosen = tags ?? [];
  if (!Array.isArray(chosen) || !chosen.every(tag => typeof tag === 'string')) throw new Error('Bộ lọc thẻ không hợp lệ.');
  const text = normalizeJournalText(query), keys = chosen.map(normalizeJournalText).filter(Boolean);
  const matches = journalRecords(entries).filter(entry =>
    (!text || [entry.title, entry.note, ...entry.tags].some(value => normalizeJournalText(value).includes(text))) &&
    keys.every(key => entry.tags.some(tag => normalizeJournalText(tag) === key)))
    .sort((a,b) => b.date.localeCompare(a.date));
  return { entries: matches.slice(0, limit), total: matches.length, hasMore: matches.length > limit };
}
