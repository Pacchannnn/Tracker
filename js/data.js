export const STORAGE_KEY = 'vshape-tracker';
export const SCHEMA_VERSION = 1;
export const emptyData = () => ({
  schemaVersion: SCHEMA_VERSION,
  settings: { week: 1, calories: 2400, protein: 120 },
  sessions: [], foods: [], entries: [], checkins: [], draft: null
});

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.valueOf()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8));
}

function number(value, label, { min = 0, max = 100000, integer = false, optional = false } = {}) {
  if (value === '' || value === null || value === undefined) {
    if (optional) return null;
    throw new Error(`${label} là bắt buộc.`);
  }
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) throw new Error(`${label} không hợp lệ.`);
  return result;
}

export function validateSet(raw) {
  const result = { weight: number(raw.weight, 'Tạ'), reps: number(raw.reps, 'Số lần', { min: 1, max: 1000, integer: true }), rir: number(raw.rir, 'RIR', { max: 10 }) };
  if (raw.unit !== undefined) {
    if (!['kg', 'lb'].includes(raw.unit)) throw new Error('Đơn vị tạ không hợp lệ.');
    result.unit = raw.unit;
  }
  return result;
}

export function validateFood(raw) {
  const name = String(raw.name ?? '').trim();
  const serving = String(raw.serving ?? '').trim();
  if (!name || !serving) throw new Error('Tên món và khẩu phần là bắt buộc.');
  return {
    name, serving, notes: String(raw.notes ?? '').trim(),
    calories: number(raw.calories, 'Calories'), protein: number(raw.protein, 'Protein'),
    carbs: number(raw.carbs, 'Carbs'), fat: number(raw.fat, 'Fat')
  };
}

export function validateEntry(raw) {
  if (!validDate(raw.date)) throw new Error('Ngày không hợp lệ.');
  const meal = String(raw.meal ?? '').trim();
  if (!meal) throw new Error('Bữa ăn là bắt buộc.');
  return { date: raw.date, meal, servings: number(raw.servings, 'Số khẩu phần', { min: 0.01, max: 100 }) };
}

export function validateCheckin(raw) {
  if (!validDate(raw.date)) throw new Error('Ngày không hợp lệ.');
  const weight = number(raw.weight, 'Cân nặng', { max: 1000, optional: true });
  const waist = number(raw.waist, 'Vòng eo', { max: 1000, optional: true });
  const sleep = number(raw.sleep, 'Giấc ngủ', { max: 24, optional: true });
  const knee = String(raw.knee ?? '').trim();
  const notes = String(raw.notes ?? '').trim();
  if (weight === null && waist === null && sleep === null && !knee && !notes) throw new Error('Nhập ít nhất một chỉ số hoặc ghi chú.');
  return { date: raw.date, weight, waist, sleep, knee, notes };
}

export function dailyTotals(entries, date) {
  return entries.filter(entry => entry.date === date).reduce((total, entry) => {
    for (const key of ['calories', 'protein', 'carbs', 'fat']) total[key] += entry.food[key] * entry.servings;
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function loadData(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return emptyData();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Dữ liệu đã lưu bị lỗi. Hãy giữ nguyên trình duyệt và dùng bản sao lưu nếu có.'); }
  if (!data || data.schemaVersion !== SCHEMA_VERSION || !data.settings || !['sessions', 'foods', 'entries', 'checkins'].every(key => Array.isArray(data[key]))) {
    throw new Error('Định dạng dữ liệu lưu không được hỗ trợ. Không ghi đè dữ liệu cũ.');
  }
  return data;
}

export function saveData(storage, data) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { throw new Error('Không thể lưu trên trình duyệt. Kiểm tra dung lượng hoặc quyền lưu trữ.'); }
}

export async function updateData(storage, locks, change) {
  if (!locks?.request) throw new Error('Trình duyệt không hỗ trợ lưu an toàn giữa nhiều tab. Hãy dùng Chrome, Edge hoặc Firefox phiên bản mới.');
  return locks.request('vshape-tracker-write', () => {
    const next = structuredClone(loadData(storage));
    change(next);
    saveData(storage, next);
    return next;
  });
}

export function ensureUnchanged(current, expected) {
  if (!current || JSON.stringify(current) !== JSON.stringify(expected)) {
    throw new Error('Mục này đã đổi ở tab khác. Hãy mở lại trước khi sửa.');
  }
}

export function foodSnapshotForEntry(existing, foodId, foods) {
  if (existing?.foodId === foodId && existing.food) return structuredClone(existing.food);
  const food = foods.find(item => item.id === foodId);
  if (!food) throw new Error('Hãy chọn một món ăn.');
  return { name: food.name, serving: food.serving, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat };
}

export function localDate(date = new Date()) {
  const year = date.getFullYear();
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function diaryDate(selection, now = new Date()) {
  return selection.mode === 'selected' ? selection.date : localDate(now);
}

export function weekStart(date = new Date()) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  return localDate(day);
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => typeof value === 'string' && value.length > 0;
const isNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validMacros = food => isObject(food) && typeof food.name === 'string' && typeof food.serving === 'string' &&
  ['calories', 'protein', 'carbs', 'fat'].every(key => isNumber(food[key]));

function validateBackupData(data) {
  if (!isObject(data) || data.schemaVersion !== SCHEMA_VERSION) throw new Error('Phiên bản dữ liệu không tương thích.');
  if (!isObject(data.settings) || !Number.isInteger(data.settings.week) || data.settings.week < 1 || data.settings.week > 12 ||
    !isNumber(data.settings.calories) || !isNumber(data.settings.protein)) throw new Error('Cài đặt trong bản sao lưu không hợp lệ.');
  if (!['sessions', 'foods', 'entries', 'checkins'].every(key => Array.isArray(data[key]))) throw new Error('Bản sao lưu thiếu danh sách dữ liệu cần thiết.');
  const validSession = item => isObject(item) && isId(item.id) && ['A', 'B', 'C', 'D'].includes(item.workout) &&
    validDate(item.date) && Number.isInteger(item.week) && item.week >= 1 && item.week <= 12 && Array.isArray(item.sets) &&
    item.sets.every(set => isObject(set) && isId(set.id) && Number.isInteger(set.exerciseIndex) && set.exerciseIndex >= 0 &&
      typeof set.exerciseName === 'string' && Number.isInteger(set.setNumber) && set.setNumber > 0 && isNumber(set.weight) &&
      Number.isInteger(set.reps) && set.reps > 0 && isNumber(set.rir) && (!set.unit || ['kg', 'lb'].includes(set.unit)));
  if (!data.sessions.every(validSession) || (data.draft !== null && data.draft !== undefined && !validSession(data.draft))) throw new Error('Có buổi tập hoặc hiệp không hợp lệ trong bản sao lưu.');
  if (!data.foods.every(food => isObject(food) && isId(food.id) && validMacros(food))) throw new Error('Có thực phẩm không hợp lệ trong bản sao lưu.');
  if (!data.entries.every(item => isObject(item) && isId(item.id) && validDate(item.date) && typeof item.meal === 'string' &&
    isNumber(item.servings) && item.servings > 0 && isId(item.foodId) && validMacros(item.food))) throw new Error('Có bữa ăn không hợp lệ trong bản sao lưu.');
  if (!data.checkins.every(item => isObject(item) && isId(item.id) && validDate(item.date) &&
    ['weight', 'waist', 'sleep'].every(key => item[key] === null || isNumber(item[key])) &&
    typeof item.knee === 'string' && typeof item.notes === 'string')) throw new Error('Có check-in không hợp lệ trong bản sao lưu.');
  for (const key of ['sessions', 'foods', 'entries', 'checkins']) {
    if (new Set(data[key].map(item => item.id)).size !== data[key].length) throw new Error(`ID trùng trong ${key}.`);
  }
}

export function createBackup(data, date = new Date()) {
  validateBackupData(data);
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: date.toISOString(), data }, null, 2);
}

export function parseBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('File không phải JSON hợp lệ.'); }
  const wrapped = isObject(parsed) && Object.hasOwn(parsed, 'data');
  const data = wrapped ? parsed.data : parsed;
  if (wrapped && parsed.schemaVersion !== SCHEMA_VERSION) throw new Error('Phiên bản bản sao lưu không tương thích.');
  validateBackupData(data);
  return {
    data: structuredClone(data),
    exportedAt: wrapped && typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
    counts: {
      sessions: data.sessions.length,
      sets: data.sessions.reduce((sum, item) => sum + item.sets.length, 0),
      foods: data.foods.length,
      entries: data.entries.length,
      checkins: data.checkins.length
    }
  };
}
