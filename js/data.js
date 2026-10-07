import { validatePlanningData, validateWorkoutSnapshot } from './custom-workout.js?v=40';
import { emptyPlanningDraft, validatePlanningDraft } from './planning-draft.js?v=40';
import { validateIdentityData, sessionGeneration } from './session-identity.js?v=40';
export const STORAGE_KEY = 'vshape-tracker';
export const SCHEMA_VERSION = 8;
export const emptyData = () => ({
  schemaVersion: SCHEMA_VERSION,
  settings: { week: 1, calories: 2400, protein: 120 },
  sessions: [], foods: [], entries: [], checkins: [], draft: null, exerciseNotes: {}, cardioEntries: [], kneeEntries: [], savedMeals: [], recipes: [], journalEntries: [],
  customExercises: [], plans: [], activePlanId: null, planningDraft: emptyPlanningDraft()
});

function migrateData(data) {
  if (data?.schemaVersion === 1) data = { ...data, schemaVersion: 2, exerciseNotes: {} };
  if (data?.schemaVersion === 2) data = { ...data, schemaVersion: 3, cardioEntries: [], kneeEntries: [] };
  if (data?.schemaVersion === 3) data = { ...data, schemaVersion: 4, savedMeals: [], recipes: [] };
  if (data?.schemaVersion === 4) data = { ...data, schemaVersion: 5, journalEntries: [] };
  if (data?.schemaVersion === 5) data = { ...data, schemaVersion: 6, customExercises: [], plans: [], activePlanId: null };
  if (data?.schemaVersion === 6) data = { ...data, schemaVersion: 7, planningDraft: emptyPlanningDraft() };
  // Additive foundation: never activate identity on drafts handled by legacy live writers.
  if (data?.schemaVersion === 7) data = { ...data, schemaVersion: 8 };
  return data;
}

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

export function validateCardio(raw) {
  if (!validDate(raw.date)) throw new Error('Ngày cardio không hợp lệ.');
  const activity = String(raw.activity ?? '').trim();
  if (!activity) throw new Error('Loại hoạt động là bắt buộc.');
  return {
    date: raw.date, activity,
    durationMinutes: number(raw.durationMinutes, 'Thời lượng', { min: 1, max: 1440 }),
    distanceKm: number(raw.distanceKm, 'Quãng đường', { max: 10000, optional: true }),
    intensity: String(raw.intensity ?? '').trim(), notes: String(raw.notes ?? '').trim()
  };
}

export function validateKnee(raw) {
  if (!validDate(raw.date)) throw new Error('Ngày ghi gối không hợp lệ.');
  const moment = String(raw.moment ?? '');
  if (!['during', 'after', 'next-morning'].includes(moment)) throw new Error('Thời điểm ghi gối không hợp lệ.');
  const pain = number(raw.pain, 'Mức đau', { max: 10, integer: true, optional: true });
  const status = key => ['unknown', 'no', 'yes'].includes(raw[key]) ? raw[key] : (() => { throw new Error(`${key} không hợp lệ.`); })();
  const swelling = status('swelling'), instability = status('instability'), stiffness = status('stiffness');
  const notes = String(raw.notes ?? '').trim();
  if (pain === null && [swelling, instability, stiffness].every(value => value === 'unknown') && !notes) throw new Error('Ghi ít nhất một triệu chứng hoặc ghi chú.');
  return { date: raw.date, moment, pain, swelling, instability, stiffness, notes };
}

export function dailyTotals(entries, date) {
  return entries.filter(entry => entry.date === date).reduce((total, entry) => {
    for (const key of ['calories', 'protein', 'carbs', 'fat']) {
      const value = entry.food[key];
      total[key] = total[key] === null || value === null || value === undefined ? null : total[key] + value * entry.servings;
    }
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function loadData(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return emptyData();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Dữ liệu đã lưu bị lỗi. Hãy giữ nguyên trình duyệt và dùng bản sao lưu nếu có.'); }
  data = migrateData(data);
  if (!data || data.schemaVersion !== SCHEMA_VERSION || !data.settings || !['sessions', 'foods', 'entries', 'checkins', 'cardioEntries', 'kneeEntries', 'savedMeals', 'recipes', 'journalEntries', 'customExercises', 'plans'].every(key => Array.isArray(data[key])) || !data.exerciseNotes || typeof data.exerciseNotes !== 'object' || Array.isArray(data.exerciseNotes)) {
    throw new Error('Định dạng dữ liệu lưu không được hỗ trợ. Không ghi đè dữ liệu cũ.');
  }
  validatePlanningData(data);
  validateIdentityData(data);
  return data;
}

export function saveData(storage, data) {
  validateIdentityData(data);
  try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { throw new Error('Không thể lưu trên trình duyệt. Kiểm tra dung lượng hoặc quyền lưu trữ.'); }
}

export async function updateData(storage, locks, change) {
  if (!locks?.request) throw new Error('Trình duyệt không hỗ trợ lưu an toàn giữa nhiều tab. Hãy dùng Chrome, Edge hoặc Firefox phiên bản mới.');
  return locks.request('vshape-tracker-write', () => {
    const next = structuredClone(loadData(storage));
    change(next);
    validatePlanningData(next);
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
  if (!['sessions', 'foods', 'entries', 'checkins', 'cardioEntries', 'kneeEntries', 'savedMeals', 'recipes', 'journalEntries'].every(key => Array.isArray(data[key]))) throw new Error('Bản sao lưu thiếu danh sách dữ liệu cần thiết.');
  if (!isObject(data.exerciseNotes) || !Object.values(data.exerciseNotes).every(value => typeof value === 'string')) throw new Error('Ghi chú bài tập không hợp lệ.');
  validatePlanningData(data);
  validatePlanningDraft(data.planningDraft);
  validateIdentityData(data);
  const validSession = item => isObject(item) && isId(item.id) && (['A', 'B', 'C', 'D'].includes(item.workout) || (item.workout === 'CUSTOM' && !!validateWorkoutSnapshot(item.workoutSnapshot))) &&
    validDate(item.date) && Number.isInteger(item.week) && item.week >= 1 && item.week <= 12 && Array.isArray(item.sets) &&
    item.sets.every(set => isObject(set) && isId(set.id) && Number.isInteger(set.exerciseIndex) && set.exerciseIndex >= 0 &&
      typeof set.exerciseName === 'string' && Number.isInteger(set.setNumber) && set.setNumber > 0 && isNumber(set.weight) &&
      Number.isInteger(set.reps) && set.reps > 0 && isNumber(set.rir) && set.rir <= 10 && (!set.unit || ['kg', 'lb'].includes(set.unit)) &&
      (sessionGeneration(item) === 'structured' || item.workout !== 'CUSTOM' || (item.workoutSnapshot.exercises[set.exerciseIndex]?.exerciseId === set.exerciseId &&
        item.workoutSnapshot.exercises[set.exerciseIndex].name === set.exerciseName && set.setNumber <= item.workoutSnapshot.exercises[set.exerciseIndex].sets)));
  if (!data.sessions.every(validSession) || (data.draft !== null && data.draft !== undefined && !validSession(data.draft))) throw new Error('Có buổi tập hoặc hiệp không hợp lệ trong bản sao lưu.');
  if (!data.foods.every(food => isObject(food) && isId(food.id) && validMacros(food))) throw new Error('Có thực phẩm không hợp lệ trong bản sao lưu.');
  if (!data.entries.every(item => isObject(item) && isId(item.id) && validDate(item.date) && typeof item.meal === 'string' &&
    isNumber(item.servings) && item.servings > 0 && isId(item.foodId) && validMacros(item.food))) throw new Error('Có bữa ăn không hợp lệ trong bản sao lưu.');
  if (!data.checkins.every(item => isObject(item) && isId(item.id) && validDate(item.date) &&
    ['weight', 'waist', 'sleep'].every(key => item[key] === null || isNumber(item[key])) &&
    typeof item.knee === 'string' && typeof item.notes === 'string')) throw new Error('Có check-in không hợp lệ trong bản sao lưu.');
  if (!data.cardioEntries.every(item => isObject(item) && isId(item.id) && validDate(item.date) && typeof item.activity === 'string' &&
    isNumber(item.durationMinutes) && item.durationMinutes > 0 && (item.distanceKm === null || isNumber(item.distanceKm)) &&
    typeof item.intensity === 'string' && typeof item.notes === 'string')) throw new Error('Có cardio không hợp lệ trong bản sao lưu.');
  if (!data.kneeEntries.every(item => isObject(item) && isId(item.id) && validDate(item.date) && ['during', 'after', 'next-morning'].includes(item.moment) &&
    (item.pain === null || (Number.isInteger(item.pain) && item.pain >= 0 && item.pain <= 10)) &&
    ['swelling', 'instability', 'stiffness'].every(key => ['unknown', 'no', 'yes'].includes(item[key])) &&
    typeof item.notes === 'string')) throw new Error('Có ghi chú gối không hợp lệ trong bản sao lưu.');
  if (!data.savedMeals.every(item => isObject(item) && isId(item.id) && typeof item.name === 'string' && Array.isArray(item.items) && item.items.length > 0 &&
    item.items.every(food => isObject(food) && isId(food.foodId) && validMacros(food.food) && isNumber(food.servings) && food.servings > 0))) throw new Error('Có bữa ăn lưu sẵn không hợp lệ.');
  if (!data.recipes.every(item => isObject(item) && isId(item.id) && typeof item.name === 'string' && isNumber(item.servings) && item.servings > 0 &&
    typeof item.description === 'string' && Array.isArray(item.ingredients) && item.ingredients.length > 0 &&
    item.ingredients.every(ingredient => isObject(ingredient) && isNumber(ingredient.quantity) && ingredient.quantity > 0 && typeof ingredient.unit === 'string' && typeof ingredient.name === 'string') &&
    Array.isArray(item.steps) && item.steps.length > 0 && item.steps.every(step => typeof step === 'string') && Array.isArray(item.tags) && item.tags.every(tag => typeof tag === 'string') &&
    typeof item.notes === 'string' && (item.nutritionPerServing === null || (isObject(item.nutritionPerServing) && ['calories', 'protein', 'carbs', 'fat'].every(key => isNumber(item.nutritionPerServing[key])))))) throw new Error('Có công thức không hợp lệ.');
  if (!data.journalEntries.every(item => isObject(item) && isId(item.id) && validDate(item.date) &&
    ['', 'drained', 'low', 'steady', 'good', 'bright'].includes(item.mood) && typeof item.title === 'string' && typeof item.note === 'string' &&
    Array.isArray(item.tags) && item.tags.every(tag => typeof tag === 'string') && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string')) throw new Error('Có nhật ký không hợp lệ.');
  if (new Set(data.journalEntries.map(item => item.date)).size !== data.journalEntries.length) throw new Error('Có hai nhật ký cùng ngày trong bản sao lưu.');
  for (const key of ['sessions', 'foods', 'entries', 'checkins', 'cardioEntries', 'kneeEntries', 'savedMeals', 'recipes', 'journalEntries']) {
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
  if (wrapped && parsed.schemaVersion !== parsed.data?.schemaVersion) throw new Error('Phiên bản vỏ và dữ liệu không khớp.');
  const data = migrateData(wrapped ? parsed.data : parsed);
  if (wrapped && ![1, 2, 3, 4, 5, 6, 7, SCHEMA_VERSION].includes(parsed.schemaVersion)) throw new Error('Phiên bản bản sao lưu không tương thích.');
  validateBackupData(data);
  return {
    data: structuredClone(data),
    exportedAt: wrapped && typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
    counts: {
      sessions: data.sessions.length,
      sets: data.sessions.reduce((sum, item) => sum + item.sets.length, 0),
      foods: data.foods.length,
      entries: data.entries.length,
      checkins: data.checkins.length,
      cardio: data.cardioEntries.length,
      knee: data.kneeEntries.length,
      savedMeals: data.savedMeals.length,
      recipes: data.recipes.length,
      journal: data.journalEntries.length,
      customExercises: data.customExercises.length,
      plans: data.plans.length,
      planningDrafts: ['builder', 'planner'].filter(kind => data.planningDraft[kind]).length
    }
  };
}

export function restoreBackupData(next, incoming, baseline) {
  validateBackupData(incoming);
  if (JSON.stringify(next) !== baseline) throw new Error('Dữ liệu hiện tại đã đổi sau lúc xem trước. Hãy kiểm tra lại file trước khi khôi phục.');
  for (const key of Object.keys(next)) delete next[key];
  Object.assign(next, structuredClone(incoming));
}
