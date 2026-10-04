import { MUSCLES, EQUIPMENT, validateSlot, validateWorkoutSnapshot, muscleMatches, labelFor } from './custom-workout.js?v=17';

// Provider-neutral contract. No network, credentials, medical interpretation or automatic saving.
export function createPlannerRequest(raw) {
  const selected = (values, choices) => {
    const result = [...new Set(values || [])];
    if (result.some(value => !choices.some(item => item.value === value))) throw new Error('Lựa chọn planner không hợp lệ.');
    return result;
  };
  const number = (value, fallback, min, max) => {
    const result = value === '' || value == null ? fallback : Number(value);
    if (!Number.isInteger(result) || result < min || result > max) throw new Error('Số lượng/thời gian planner không hợp lệ.');
    return result;
  };
  const parameters = validateSlot({ exerciseId: 'parameters', name: 'Parameters', ...raw, targetRIR: raw.targetRIR === '' ? null : raw.targetRIR });
  return { version: 1, muscles: selected(raw.muscles, MUSCLES), equipment: selected(raw.equipment, EQUIPMENT),
    include: [...new Set(raw.include || [])], exclude: [...new Set(raw.exclude || [])],
    count: number(raw.count, 4, 1, 20), minutes: raw.minutes === '' || raw.minutes == null ? null : number(raw.minutes, null, 1, 300),
    workSeconds: number(raw.workSeconds, 40, 10, 300), parameters,
    name: String(raw.name || 'Buổi gợi ý').trim().slice(0, 160), goal: String(raw.goal || '').slice(0, 1000),
    priorities: String(raw.priorities || '').slice(0, 1000), notes: String(raw.notes || '').slice(0, 2000),
    healthRestrictions: String(raw.healthRestrictions || '').trim().slice(0, 2000) };
}

export function suggestWorkout(request, library, newId = () => crypto.randomUUID()) {
  const conflicts = [];
  const available = library.filter(item => !item.archived);
  const eligible = item => (!request.equipment.length || item.equipment.some(value => request.equipment.includes(value))) &&
    (!request.muscles.length || request.muscles.some(muscle => muscleMatches(item, muscle))) && !request.exclude.includes(item.id);
  if (request.healthRestrictions) conflicts.push('Local planner không xác minh được hạn chế sức khỏe bằng văn bản. Dùng builder thủ công và tự chọn bài theo hạn chế đã được hướng dẫn.');
  if (!request.muscles.length && !request.include.length) conflicts.push('Chọn nhóm cơ hoặc ít nhất một bài muốn tập.');
  const chosen = [];
  for (const exerciseId of request.include) {
    const item = available.find(exercise => exercise.id === exerciseId);
    if (!item || !eligible(item)) conflicts.push(`Bài yêu cầu ${item?.name || exerciseId} xung đột với dụng cụ, nhóm cơ, bài loại trừ hoặc trạng thái thư viện.`);
    else chosen.push(item);
  }
  if (chosen.length > request.count) conflicts.push('Số bài yêu cầu vượt số bài mong muốn.');
  const candidates = available.filter(eligible);
  for (const muscle of request.muscles) {
    if (chosen.some(item => muscleMatches(item, muscle))) continue;
    const candidate = candidates.find(item => !chosen.includes(item) && muscleMatches(item, muscle));
    if (candidate && chosen.length < request.count) chosen.push(candidate);
    else conflicts.push(`Không đủ chỗ/bài phù hợp cho nhóm cơ ${labelFor(MUSCLES, muscle)}. Điều chỉnh số bài hoặc thư viện/dụng cụ.`);
  }
  // Stable library order; avoid duplicate IDs, prefer a movement pattern not already present.
  const remainder = candidates.filter(item => !chosen.includes(item)).sort((a, b) =>
    Number(chosen.some(item => item.movementPattern === a.movementPattern)) - Number(chosen.some(item => item.movementPattern === b.movementPattern)));
  for (const item of remainder) if (chosen.length < request.count) chosen.push(item);
  if (chosen.length < request.count) conflicts.push(`Chỉ tìm được ${chosen.length}/${request.count} bài phù hợp. Không tự thêm bài ngoài điều kiện.`);
  const estimatedSeconds = chosen.length * request.parameters.sets * (request.workSeconds + request.parameters.restSeconds);
  if (request.minutes && estimatedSeconds > request.minutes * 60) conflicts.push('Ước tính vượt thời gian bạn chọn. Giảm số bài/hiệp hoặc điều chỉnh tham số rồi tạo lại.');
  if (conflicts.length) return { version: 1, source: 'local', status: 'conflict', conflicts };
  return { version: 1, source: 'local', status: 'draft', conflicts: [], estimatedSeconds,
    warnings: ['Thời gian là ước tính từ giây/hiệp + nghỉ do bạn cấu hình; chưa tính khởi động, đổi máy và di chuyển.',
      'Mục tiêu, ưu tiên và ghi chú tự do được giữ để bạn duyệt; bộ lọc local chưa hiểu nội dung ngôn ngữ tự nhiên.'],
    workout: { id: newId(), name: request.name, exercises: chosen.map(item => ({ id: newId(), ...request.parameters,
      exerciseId: item.id, name: item.name, notes: item.notes || '' })) },
    explanations: chosen.map(item => ({ exerciseId: item.id, text: `Khớp ${item.primaryMuscles.map(value => labelFor(MUSCLES, value)).join(', ')}; ${item.movementPattern}. ${request.include.includes(item.id) ? 'Bạn yêu cầu bài này.' : 'Được chọn từ thư viện sau bộ lọc.'}` })) };
}

// A future provider adapter must pass this before a remote result can reach review UI.
export function validatePlannerOutput(output, request, library) {
  if (!output || output.version !== 1 || output.status !== 'draft' || !['local', 'ai'].includes(output.source)) throw new Error('Planner output phải là bản nháp hợp lệ.');
  const day = output.workout;
  validateWorkoutSnapshot({ ...day, planId: null, planName: 'Draft', dayId: day?.id });
  if (!Array.isArray(output.explanations) || output.explanations.length !== day.exercises.length ||
    output.explanations.some((item, index) => item?.exerciseId !== day.exercises[index].exerciseId || typeof item.text !== 'string' || item.text.length > 2000) ||
    !Array.isArray(output.warnings) || output.warnings.some(item => typeof item !== 'string' || item.length > 2000)) throw new Error('Planner thiếu giải thích có cấu trúc.');
  const ids = day.exercises.map(item => item.exerciseId);
  if (new Set(ids).size !== ids.length || ids.length !== request.count || request.include.some(id => !ids.includes(id))) throw new Error('Planner bỏ bài yêu cầu, trùng bài hoặc sai số bài.');
  if (request.healthRestrictions) throw new Error('Cần đánh giá riêng hạn chế sức khỏe trước khi tạo bản nháp.');
  for (const slot of day.exercises) {
    const exercise = library.find(item => item.id === slot.exerciseId && !item.archived);
    if (!exercise || exercise.name !== slot.name || request.exclude.includes(slot.exerciseId) ||
      (request.equipment.length && !exercise.equipment.some(value => request.equipment.includes(value))) ||
      (request.muscles.length && !request.muscles.some(muscle => muscleMatches(exercise, muscle)))) throw new Error('Planner dùng bài ngoài điều kiện hoặc thư viện.');
    const parameters = validateSlot(slot);
    for (const key of ['sets', 'repMin', 'repMax', 'targetRIR', 'restSeconds']) if (parameters[key] !== request.parameters[key]) throw new Error('Planner thay tham số bạn cấu hình.');
  }
  if (request.muscles.some(muscle => !ids.some(id => muscleMatches(library.find(item => item.id === id), muscle)))) throw new Error('Planner thiếu nhóm cơ yêu cầu.');
  const seconds = ids.length * request.parameters.sets * (request.workSeconds + request.parameters.restSeconds);
  if (request.minutes && seconds > request.minutes * 60) throw new Error('Planner vượt giới hạn thời gian ước tính.');
  return structuredClone(output);
}
