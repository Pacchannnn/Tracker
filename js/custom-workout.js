import { PROGRAM, programDay } from './program.js?v=26';

export const MUSCLES = [
  ['chest', 'Ngực'], ['back', 'Lưng'], ['lats', 'Xô'], ['upper-back', 'Lưng trên'],
  ['shoulders', 'Vai'], ['front-delts', 'Vai trước'], ['side-delts', 'Vai giữa'], ['rear-delts', 'Vai sau'],
  ['biceps', 'Tay trước'], ['triceps', 'Tay sau'], ['quads', 'Đùi trước'],
  ['hamstrings', 'Đùi sau'], ['glutes', 'Mông'], ['calves', 'Bắp chân'], ['core', 'Bụng/core']
].map(([value, label]) => ({ value, label }));
export const PATTERNS = [
  ['horizontal-push', 'Đẩy ngang'], ['vertical-push', 'Đẩy dọc'], ['horizontal-pull', 'Kéo ngang'],
  ['vertical-pull', 'Kéo dọc'], ['knee-dominant', 'Gối chủ đạo'], ['hip-hinge', 'Gập hông'],
  ['knee-flexion', 'Gập gối'], ['hip-extension', 'Duỗi hông'], ['elbow-flexion', 'Gập khuỷu'],
  ['elbow-extension', 'Duỗi khuỷu'], ['shoulder-abduction', 'Nâng vai sang bên'],
  ['shoulder-fly', 'Fly ngực/vai'], ['calf-raise', 'Nâng gót'], ['core-flexion', 'Gập core'],
  ['core-stability', 'Ổn định core'], ['other', 'Khác/chưa phân loại']
].map(([value, label]) => ({ value, label }));
export const EQUIPMENT = [
  ['dumbbell', 'Dumbbell'], ['barbell', 'Barbell'], ['cable', 'Cable'], ['machine', 'Máy'],
  ['bodyweight', 'Trọng lượng cơ thể'], ['band', 'Dây kháng lực'], ['other', 'Khác']
].map(([value, label]) => ({ value, label }));
export const labelFor = (choices, value) => choices.find(item => item.value === value)?.label || value;

function classify(name) {
  const lower = name.toLowerCase();
  let primaryMuscles = [], secondaryMuscles = [], movementPattern = 'other';
  if (lower.includes('pulldown')) { primaryMuscles = ['back', 'lats']; secondaryMuscles = ['biceps']; movementPattern = 'vertical-pull'; }
  else if (lower.includes('row')) { primaryMuscles = ['back', 'upper-back']; secondaryMuscles = ['biceps', 'rear-delts']; movementPattern = 'horizontal-pull'; }
  else if (lower.includes('lateral raise')) { primaryMuscles = ['side-delts']; movementPattern = 'shoulder-abduction'; }
  else if (lower.includes('rear delt') || lower.includes('reverse pec')) { primaryMuscles = ['rear-delts']; movementPattern = 'shoulder-fly'; }
  else if (lower.includes('shoulder press')) { primaryMuscles = ['front-delts', 'shoulders']; secondaryMuscles = ['triceps']; movementPattern = 'vertical-push'; }
  else if (lower.includes('press') && !lower.includes('leg press')) { primaryMuscles = ['chest']; secondaryMuscles = ['triceps', 'front-delts']; movementPattern = 'horizontal-push'; }
  else if (lower.includes('pec deck') || lower.includes('cable fly')) { primaryMuscles = ['chest']; movementPattern = 'shoulder-fly'; }
  else if (lower.includes('triceps')) { primaryMuscles = ['triceps']; movementPattern = 'elbow-extension'; }
  else if (lower.includes('curl') && !lower.includes('leg curl')) { primaryMuscles = ['biceps']; movementPattern = 'elbow-flexion'; }
  else if (lower.includes('leg curl')) { primaryMuscles = ['hamstrings']; movementPattern = 'knee-flexion'; }
  else if (lower.includes('rdl') || lower.includes('deadlift')) { primaryMuscles = ['hamstrings', 'glutes']; movementPattern = 'hip-hinge'; }
  else if (lower.includes('hip thrust') || lower.includes('glute bridge')) { primaryMuscles = ['glutes']; secondaryMuscles = ['hamstrings']; movementPattern = 'hip-extension'; }
  else if (lower.includes('squat') || lower.includes('leg press') || lower.includes('leg extension')) { primaryMuscles = ['quads']; secondaryMuscles = lower.includes('extension') ? [] : ['glutes']; movementPattern = 'knee-dominant'; }
  else if (lower.includes('calf')) { primaryMuscles = ['calves']; movementPattern = 'calf-raise'; }
  else if (lower.includes('dead bug')) { primaryMuscles = ['core']; movementPattern = 'core-stability'; }
  else if (lower.includes('crunch')) { primaryMuscles = ['core']; movementPattern = 'core-flexion'; }
  const equipment = [];
  if (/dumbbell|\bdb\b|goblet|^hammer curl$/.test(lower)) equipment.push('dumbbell');
  if (/cable|rope|pulldown|pushdown/.test(lower)) equipment.push('cable');
  if (/machine|leg press|leg curl|leg extension|pec deck/.test(lower)) equipment.push('machine');
  if (!equipment.length) equipment.push(/dead bug|crunch|glute bridge/.test(lower) ? 'bodyweight' : 'other');
  return { primaryMuscles, secondaryMuscles, movementPattern, equipment };
}

export const BUILTIN_EXERCISES = Object.entries(PROGRAM).flatMap(([day, workout]) => workout.exercises.map((item, index) => ({
  id: `original:${day}:${index}`, name: item.name, ...classify(item.name), notes: item.note,
  isCustom: false, archived: false, sourceDay: day, sourceIndex: index
}))).filter((item, index, all) => all.findIndex(other => other.name === item.name) === index);

export function libraryExercises(customExercises, includeArchived = false) {
  return [...BUILTIN_EXERCISES, ...customExercises].filter(item => includeArchived || !item.archived);
}

function text(value, label, max = 2000) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new Error(`${label} quá dài.`);
  return result;
}
const values = (raw, choices, label) => {
  if (!Array.isArray(raw) || raw.some(item => !choices.some(choice => choice.value === item))) throw new Error(`${label} không hợp lệ.`);
  return [...new Set(raw)];
};
export function validateExercise(raw) {
  const name = text(raw.name, 'Tên bài', 160);
  if (!name) throw new Error('Nhập tên bài tập.');
  const primaryMuscles = values(raw.primaryMuscles || [], MUSCLES, 'Nhóm cơ');
  const secondaryMuscles = values(raw.secondaryMuscles || [], MUSCLES, 'Nhóm cơ phụ');
  if (!primaryMuscles.length) throw new Error('Chọn ít nhất một nhóm cơ chính.');
  const movementPattern = raw.movementPattern || 'other';
  if (!PATTERNS.some(item => item.value === movementPattern)) throw new Error('Pattern không hợp lệ.');
  const equipment = values(raw.equipment || [], EQUIPMENT, 'Dụng cụ');
  if (!equipment.length) throw new Error('Chọn ít nhất một nhóm dụng cụ.');
  return { name, primaryMuscles, secondaryMuscles, movementPattern, equipment, notes: text(raw.notes, 'Ghi chú') };
}

export function validateSlot(raw) {
  const numeric = (value, label, min, max, integer = false) => {
    if (value === '' || value === null || value === undefined) throw new Error(`${label} là bắt buộc.`);
    const result = Number(value);
    if (!Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) throw new Error(`${label} không hợp lệ.`);
    return result;
  };
  const sets = numeric(raw.sets, 'Hiệp', 1, 20, true);
  const repMin = numeric(raw.repMin, 'Reps tối thiểu', 1, 100, true), repMax = numeric(raw.repMax, 'Reps tối đa', 1, 100, true);
  if (repMin > repMax) throw new Error('Reps tối thiểu không được lớn hơn tối đa.');
  const targetRIR = raw.targetRIR === null ? null : String(raw.targetRIR ?? '').trim().replace(/–/g, '-');
  if (targetRIR !== null) {
    const match = /^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/.exec(targetRIR);
    if (!match || Number(match[1]) > 10 || (match[2] && (Number(match[2]) > 10 || Number(match[2]) < Number(match[1])))) throw new Error('RIR phải từ 0–10 hoặc một khoảng như 2–3.');
  }
  const name = text(raw.name, 'Tên bài', 160);
  if (!name || !raw.exerciseId) throw new Error('Chọn bài tập.');
  return { exerciseId: String(raw.exerciseId), name, sets, repMin, repMax, targetRIR: targetRIR?.replace('-', '–') ?? null,
    restSeconds: numeric(raw.restSeconds, 'Giây nghỉ', 0, 1800, true), notes: text(raw.notes, 'Ghi chú bài') };
}

export function defaultSlot(exercise, newId) {
  return { id: newId(), exerciseId: exercise.id, name: exercise.name, sets: 2, repMin: 8, repMax: 12, targetRIR: '2', restSeconds: 90, notes: exercise.notes || '' };
}
export function moveSlot(slots, from, to) {
  const result = structuredClone(slots);
  if (from < 0 || to < 0 || from >= result.length || to >= result.length) return result;
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}
export function snapshotWorkout(day, plan = null) {
  if (!day.name.trim() || !day.exercises.length) throw new Error('Buổi phải có tên và ít nhất một bài.');
  return { planId: plan?.id ?? null, planName: plan?.name ?? 'Buổi riêng hôm nay', dayId: day.id,
    name: day.name, exercises: day.exercises.map(item => ({ id: item.id, ...validateSlot(item) })) };
}
export function sessionExercises(session) {
  return session.workoutSnapshot ? session.workoutSnapshot.exercises.map(item => ({ ...item,
    reps: `${item.repMin}–${item.repMax}`, rest: `${item.restSeconds} giây`, rir: item.targetRIR ?? 'DATA NOT DEFINED YET', note: item.notes
  })) : PROGRAM[session.workout].exercises;
}
export const sessionTitle = session => session.workoutSnapshot?.name || `Buổi ${session.workout}`;
export function nextPlanDay(plan, sessions) {
  if (!plan.days.length) return null;
  const latest = [...sessions].filter(item => item.workoutSnapshot?.planId === plan.id)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.updatedAt || '').localeCompare(String(b.updatedAt || ''))).at(-1);
  const index = plan.days.findIndex(day => day.id === latest?.workoutSnapshot.dayId);
  return plan.days[(index + 1) % plan.days.length];
}
export function deletePlan(state, planId) {
  state.plans = state.plans.filter(item => item.id !== planId);
  if (state.activePlanId === planId) state.activePlanId = null;
}
export function duplicatePlan(plan, newId) {
  const suffix = ' (bản sao)', now = new Date().toISOString();
  return { ...structuredClone(plan), id: newId(), name: plan.name.slice(0, 160 - suffix.length) + suffix,
    createdAt: now, updatedAt: now, days: plan.days.map(day => ({ ...structuredClone(day), id: newId(),
      exercises: day.exercises.map(slot => ({ ...structuredClone(slot), id: newId() })) })) };
}
export function removeCustomExercise(state, exerciseId) {
  const item = state.customExercises.find(exercise => exercise.id === exerciseId);
  if (!item) throw new Error('Bài custom không còn tồn tại.');
  const uses = state.plans.some(plan => plan.days.some(day => day.exercises.some(slot => slot.exerciseId === exerciseId))) ||
    state.sessions.some(session => session.workoutSnapshot?.exercises.some(slot => slot.exerciseId === exerciseId)) ||
    state.draft?.workoutSnapshot?.exercises.some(slot => slot.exerciseId === exerciseId);
  if (uses) { item.archived = true; return 'archived'; }
  state.customExercises = state.customExercises.filter(exercise => exercise.id !== exerciseId);
  return 'deleted';
}
export function muscleMatches(exercise, muscle) {
  const related = muscle === 'back' ? ['back', 'lats', 'upper-back'] : muscle === 'shoulders' ? ['shoulders', 'front-delts', 'side-delts', 'rear-delts'] : [muscle];
  return exercise.primaryMuscles.some(value => related.includes(value));
}
export function alternativesFor(exercise, library, preferredEquipment = []) {
  if (!exercise) return [];
  return library.filter(item => item.id !== exercise.id && !item.archived).map(item => {
    const samePrimary = item.primaryMuscles.filter(value => exercise.primaryMuscles.includes(value)).length;
    const samePattern = item.movementPattern !== 'other' && item.movementPattern === exercise.movementPattern;
    const sameSecondary = item.secondaryMuscles.filter(value => exercise.secondaryMuscles.includes(value)).length;
    const equipmentMatch = item.equipment.some(value => (preferredEquipment.length ? preferredEquipment : exercise.equipment).includes(value));
    return { exercise: item, score: samePrimary * 4 + (samePattern ? 5 : 0) + sameSecondary + (equipmentMatch ? 1 : 0),
      reason: `${samePrimary ? 'Có nhóm cơ chính chung' : 'Pattern giống'}${samePattern ? ' · cùng pattern' : ' · pattern khác'}${equipmentMatch ? ' · dụng cụ phù hợp' : ' · dụng cụ khác'}`,
      relevant: samePrimary > 0 || samePattern };
  }).filter(item => item.relevant).sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name)).slice(0, 10);
}
export function originalPlanCopy(week, newId) {
  return { id: newId(), name: 'Bản sao Original Plan', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    days: Object.keys(PROGRAM).map(key => ({ id: newId(), name: `${key} · ${PROGRAM[key].title}`, exercises: programDay(key, week).exercises.map((item, index) => {
      const [repMin, repMax] = item.reps.match(/\d+/g).map(Number);
      const source = BUILTIN_EXERCISES.find(exercise => exercise.name === item.name);
      const rest = Number(item.rest.match(/^\d+/)[0]) * (item.rest.includes('phút') ? 60 : 1);
      return { id: newId(), exerciseId: source?.id || `original:${key}:${index}`, name: item.name, sets: item.sets, repMin, repMax,
        targetRIR: item.rir === 'DATA NOT DEFINED YET' ? null : item.rir, restSeconds: rest, notes: `${item.note}${item.rest.includes('–') ? ` · Khoảng nghỉ gốc: ${item.rest}` : ''}${item.reps.includes('mỗi bên') ? ' · Reps mỗi bên' : ''}` };
    }) })) };
}
function validateStoredSlot(slot) {
  if (!slot || typeof slot.id !== 'string' || !slot.id || typeof slot.exerciseId !== 'string' || typeof slot.name !== 'string' || typeof slot.notes !== 'string' ||
    !['sets', 'repMin', 'repMax', 'restSeconds'].every(key => typeof slot[key] === 'number')) throw new Error('Dữ liệu bài đã lưu không hợp lệ.');
  validateSlot(slot);
}
export function validatePlanningData(data) {
  if (!Array.isArray(data.customExercises) || !Array.isArray(data.plans)) throw new Error('Thiếu dữ liệu kế hoạch custom.');
  const isId = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 160;
  const ids = new Set(BUILTIN_EXERCISES.map(item => item.id));
  for (const exercise of data.customExercises) {
    if (!isId(exercise?.id) || ids.has(exercise.id) || exercise.isCustom !== true || typeof exercise.archived !== 'boolean') throw new Error('ID hoặc trạng thái bài custom không hợp lệ.');
    ids.add(exercise.id); validateExercise(exercise);
  }
  const planIds = new Set();
  for (const plan of data.plans) {
    if (!isId(plan?.id) || planIds.has(plan.id) || typeof plan.name !== 'string' || !text(plan.name, 'Tên plan', 160) || !Array.isArray(plan.days)) throw new Error('Plan không hợp lệ.');
    planIds.add(plan.id);
    const dayIds = new Set();
    for (const day of plan.days) {
      if (!isId(day?.id) || dayIds.has(day.id) || typeof day.name !== 'string' || !text(day.name, 'Tên buổi', 160) || !Array.isArray(day.exercises)) throw new Error('Day không hợp lệ.');
      dayIds.add(day.id);
      const slotIds = new Set();
      for (const slot of day.exercises) { if (!isId(slot?.id) || slotIds.has(slot.id) || !ids.has(slot.exerciseId)) throw new Error('ID hoặc tham chiếu bài trong buổi không hợp lệ.'); slotIds.add(slot.id); validateStoredSlot(slot); }
    }
  }
  if (data.activePlanId !== null && !planIds.has(data.activePlanId)) throw new Error('Plan active không tồn tại.');
}

export function validateWorkoutSnapshot(snapshot) {
  if (!snapshot || typeof snapshot.name !== 'string' || !snapshot.name.trim() || typeof snapshot.planName !== 'string' ||
    typeof snapshot.dayId !== 'string' || !snapshot.dayId || (snapshot.planId !== null && typeof snapshot.planId !== 'string') ||
    !Array.isArray(snapshot.exercises) || !snapshot.exercises.length) throw new Error('Snapshot buổi tập không hợp lệ.');
  const ids = new Set();
  for (const slot of snapshot.exercises) {
    if (!slot?.id || ids.has(slot.id)) throw new Error('ID bài trong snapshot không hợp lệ.');
    ids.add(slot.id); validateStoredSlot(slot);
  }
  return snapshot;
}
