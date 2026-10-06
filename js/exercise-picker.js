import { MUSCLES, PATTERNS, EQUIPMENT, muscleMatches, alternativesFor, defaultSlot } from './custom-workout.js?v=36';

const searchable = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi').trim();
export function filterExercises(catalog, { query = '', muscle = '', equipment = '', pattern = '', source = 'all' } = {}) {
  const text = searchable(query);
  return catalog.filter(item => (source === 'archived' ? item.archived : !item.archived) &&
    (source !== 'builtin' || !item.isCustom) && (source !== 'custom' || item.isCustom) &&
    searchable(item.name).includes(text) && (!muscle || muscleMatches(item, muscle)) &&
    (!equipment || (item.equipment || []).includes(equipment)) && (!pattern || item.movementPattern === pattern));
}
export function pickerOptions(catalog) {
  const active = catalog.filter(item => !item.archived);
  return { muscle: MUSCLES.filter(choice => active.some(item => muscleMatches(item, choice.value))),
    equipment: EQUIPMENT.filter(choice => active.some(item => item.equipment?.includes(choice.value))),
    pattern: PATTERNS.filter(choice => active.some(item => item.movementPattern === choice.value)) };
}
export function createPickerSelection(mode) {
  const selected = new Set();
  return { ids: () => [...selected], clear: () => selected.clear(), toggle(id) {
    if (selected.has(id)) selected.delete(id);
    else { if (mode === 'replace') selected.clear(); selected.add(id); }
  } };
}
function availableExercise(id, catalog) {
  const exercise = catalog.find(item => item.id === id && !item.archived);
  if (!exercise) throw new Error('Bài đã bị xóa/ẩn hoặc không còn trong thư viện. Chọn lại trước khi xác nhận.');
  return exercise;
}
export function addPickedExercises(day, ids, catalog, newId) {
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error('Chọn bài không trùng để thêm.');
  if (day.exercises.length + ids.length > 100) throw new Error('Bản nháp giới hạn 100 mục bài.');
  const exercises = ids.map(id => availableExercise(id, catalog));
  if (ids.some(id => day.exercises.some(slot => slot.exerciseId === id))) throw new Error('Bài đã có trong buổi; chỉnh số hiệp ở mục hiện có.');
  const result = structuredClone(day);
  result.exercises.push(...exercises.map(exercise => defaultSlot(exercise, newId)));
  if (new Set(result.exercises.map(slot => slot.id)).size !== result.exercises.length) throw new Error('ID mục bài bị trùng. Hãy thử lại.');
  return result;
}
export function replacePickedExercise(day, slotId, exerciseId, catalog) {
  const slot = day.exercises.find(item => item.id === slotId);
  if (!slot) throw new Error('Mục bài đang thay không còn trong buổi.');
  const exercise = availableExercise(exerciseId, catalog);
  if (day.exercises.some(item => item.exerciseId === exerciseId)) throw new Error('Bài đang thay hoặc đã có trong buổi. Chọn một bài khác.');
  return { ...structuredClone(day), exercises: day.exercises.map(item => item.id === slotId ?
    { ...structuredClone(item), exerciseId, name: exercise.name, notes: exercise.notes || '' } : structuredClone(item)) };
}
export function compareExercises(from, to) {
  return { sharedPrimary: (from?.primaryMuscles || []).filter(value => to.primaryMuscles.includes(value)),
    samePattern: !!from && from.movementPattern !== 'other' && from.movementPattern === to.movementPattern,
    fromPattern: from?.movementPattern || '', toPattern: to.movementPattern,
    fromEquipment: [...(from?.equipment || [])], toEquipment: [...(to.equipment || [])],
    fromNotes: from?.notes || '', toNotes: to.notes || '' };
}
export function rankedPickerResults(current, filtered, equipment = '') {
  const candidates = filtered.filter(item => !item.archived && item.id !== current?.id);
  const suggestions = alternativesFor(current, candidates, equipment ? [equipment] : []);
  const ranked = new Set(suggestions.map(item => item.exercise.id));
  return [...suggestions.map(item => ({ ...item, suggestion: true })),
    ...candidates.filter(item => !ranked.has(item.id)).map(exercise => ({ exercise, suggestion: false }))];
}
