import { libraryExercises, defaultSlot, validateSlot } from './custom-workout.js?v=26';
import { sessionGeneration, validateSessionIdentity } from './session-identity.js?v=26';

export function liveStructureAllowed(session, completed = []) {
  if (!session || sessionGeneration(session) !== 'structured' || session.historyEditBase != null || completed.some(item => item.id === session.id)) return false;
  try { validateSessionIdentity(session); return true; } catch { return false; }
}
export const liveSetupNote = (data, exerciseId) => data.exerciseNotes[`exercise:${exerciseId}`] ?? '';
export function reviewLiveExercise(definition, data) {
  const { id, name, exerciseId, ...prescription } = defaultSlot(definition, () => 'review');
  return { definition: structuredClone(definition), prescription, setupNote: liveSetupNote(data, definition.id) };
}
export function activeNeighbor(session, slotId, direction) {
  const slots = new Map(session.sessionStructure.slots.map(slot => [slot.id, slot]));
  const active = session.sessionStructure.order.filter(id => slots.get(id).status === 'active');
  const index = active.indexOf(slotId);
  return index < 0 || !['up','down'].includes(direction) ? null : active[index + (direction === 'up' ? -1 : 1)] ?? null;
}
export function applyLiveStructure(session, command, data) {
  if (!liveStructureAllowed(session, data.sessions)) throw new Error('Chỉ đổi cấu trúc trong buổi đang tập có identity hợp lệ; không sửa cấu trúc lịch sử.');
  const structure = session.sessionStructure;
  if (command.type === 'add') {
    const picks = command.candidates;
    if (!Array.isArray(picks) || !picks.length || new Set(picks.map(item => item?.definition?.id)).size !== picks.length) throw new Error('Chọn bài không trùng để thêm.');
    if (structure.slots.length + picks.length > 100) throw new Error('Giới hạn kỹ thuật của Tracker: 100 mục bài, kể cả mục đã dừng. Không thể thêm batch này.');
    const catalog = libraryExercises(data.customExercises), active = new Set(structure.slots.filter(slot => slot.status === 'active').map(slot => slot.exerciseId));
    // Validate the entire accepted batch before appending any slot.
    const additions = picks.map(pick => {
      const definition = catalog.find(item => item.id === pick.definition.id);
      if (!definition || definition.archived || JSON.stringify(definition) !== JSON.stringify(pick.definition)) throw new Error('Bài đã đổi/bị xóa/ẩn so với preview. Mở lại để duyệt định nghĩa mới.');
      if (active.has(definition.id)) throw new Error('Bài đã có mục đang tập; không thêm bài trùng active.');
      if (typeof pick.setupNote !== 'string' || pick.setupNote !== liveSetupNote(data, definition.id)) throw new Error('Ghi chú setup đã đổi; duyệt lại trước khi thêm bài.');
      const accepted = validateSlot({ ...pick.prescription, exerciseId: definition.id, name: definition.name });
      return { id: crypto.randomUUID(), exerciseId: definition.id, sourceSlotId: null, replacesSlotId: null, status: 'active',
        snapshot: { name: accepted.name, sets: accepted.sets, reps: `${accepted.repMin}–${accepted.repMax}`, rest: `${accepted.restSeconds} giây`,
          rir: accepted.targetRIR === null ? 'DATA NOT DEFINED YET' : String(accepted.targetRIR), notes: accepted.notes, setupNote: pick.setupNote } };
    });
    structure.slots.push(...additions); structure.order.push(...additions.map(slot => slot.id));
    return;
  }
  const slot = structure.slots.find(item => item.id === command.slotId);
  if (!slot || slot.status !== 'active') throw new Error('Mục bài không còn đang tập (active) hoặc không hợp lệ.');
  if (command.type === 'remove') { slot.status = 'removed'; return; }
  if (command.type === 'reorder') {
    const neighbor = activeNeighbor(session, slot.id, command.direction);
    if (!neighbor) throw new Error('Không có mục đang tập kế bên để di chuyển.');
    const from = structure.order.indexOf(slot.id), to = structure.order.indexOf(neighbor);
    [structure.order[from], structure.order[to]] = [structure.order[to], structure.order[from]];
    return;
  }
  throw new Error('Thay đổi cấu trúc không được hỗ trợ.');
}
