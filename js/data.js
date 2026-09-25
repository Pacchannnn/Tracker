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

export function localDate(date = new Date()) {
  const year = date.getFullYear();
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function weekStart(date = new Date()) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  return localDate(day);
}
