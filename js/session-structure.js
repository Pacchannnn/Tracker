import { libraryExercises, defaultSlot, validateSlot } from './custom-workout.js?v=41';
import { sessionGeneration, validateSessionIdentity } from './session-identity.js?v=41';
import { canonicalJSON } from './data.js?v=41';

export function liveStructureAllowed(session, completed = []) {
  if (!session || sessionGeneration(session) !== 'structured' || session.historyEditBase != null || completed.some(item => item.id === session.id)) return false;
  try { validateSessionIdentity(session); return true; } catch { return false; }
}
export const liveSetupNote = (data, exerciseId) => data.exerciseNotes[`exercise:${exerciseId}`] ?? '';
export function reviewLiveExercise(definition, data) {
  const { id, name, exerciseId, ...prescription } = defaultSlot(definition, () => 'review');
  return { definition: structuredClone(definition), prescription, setupNote: liveSetupNote(data, definition.id) };
}
export const replacementRemaining = (session, source) => Math.max(0, source.snapshot.sets - session.sets.filter(set => set.slotId === source.id).length);
export function reviewReplacement(definition, data, source) {
  return { definition: structuredClone(definition), setupNote: liveSetupNote(data, definition.id),
    prescription: { sets: replacementRemaining(data.draft, source), reps: source.snapshot.reps,
      rest: source.snapshot.rest, rir: source.snapshot.rir, notes: definition.notes || '' } };
}
function acceptedDefinition(pick, data, active) {
  const definition = libraryExercises(data.customExercises).find(item => item.id === pick?.definition?.id);
  if (!definition || definition.archived || canonicalJSON(definition) !== canonicalJSON(pick.definition)) throw new Error('Bài đã đổi/bị xóa/ẩn so với preview. Mở lại để duyệt định nghĩa mới.');
  if (active.has(definition.id)) throw new Error('Bài đã có mục đang tập; không thêm/thay bằng bài trùng active.');
  if (typeof pick.setupNote !== 'string' || pick.setupNote !== liveSetupNote(data, definition.id)) throw new Error('Ghi chú setup đã đổi; duyệt lại trước khi thêm/thay bài.');
  return definition;
}
function replacementSnapshot(pick, source, definition) {
  const raw = pick.prescription;
  if (!raw || ['reps','rest','rir','notes'].some(key => typeof raw[key] !== 'string') || ['reps','rest','rir'].some(key => !raw[key].trim())) throw new Error('Nhập đủ reps, RIR và nghỉ để duyệt bài mới.');
  // Preserve accepted display strings verbatim, including unilateral/unknown/ranges.
  // Edited strings use the same numeric constraints as Builder; never rewrite source.
  const reps = /^(\d+)(?:[–-](\d+))?(?: mỗi bên)?$/.exec(raw.reps.trim());
  const rest = /^(\d+(?:\.\d+)?)(?:[–-](\d+(?:\.\d+)?))? (giây|phút)$/.exec(raw.rest.trim());
  const changedReps = raw.reps !== source.snapshot.reps, changedRest = raw.rest !== source.snapshot.rest, changedRIR = raw.rir !== source.snapshot.rir;
  if (!reps && raw.reps !== source.snapshot.reps) throw new Error('Reps dùng số/khoảng như 8–12 hoặc 6–10 mỗi bên.');
  if (!rest && raw.rest !== source.snapshot.rest) throw new Error('Nghỉ dùng số/khoảng và đơn vị, như 90 giây hoặc 2 phút.');
  if (changedRest && rest && rest[2] && Number(rest[2]) < Number(rest[1])) throw new Error('Khoảng nghỉ không hợp lệ.');
  const seconds = amount => Number(amount) * (rest?.[3] === 'phút' ? 60 : 1);
  const checked = validateSlot({ exerciseId: definition.id, name: definition.name, sets: raw.sets,
    repMin: changedReps ? reps[1] : 1, repMax: changedReps ? (reps[2] || reps[1]) : 1,
    targetRIR: !changedRIR || raw.rir === 'DATA NOT DEFINED YET' ? null : raw.rir,
    restSeconds: changedRest ? seconds(rest[1]) : 0, notes: raw.notes });
  if (changedRest && rest[2]) validateSlot({ ...checked, restSeconds: seconds(rest[2]) });
  return { name: definition.name, sets: checked.sets, reps: raw.reps, rest: raw.rest, rir: raw.rir, notes: checked.notes, setupNote: pick.setupNote };
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
    const active = new Set(structure.slots.filter(slot => slot.status === 'active').map(slot => slot.exerciseId));
    // Validate the entire accepted batch before appending any slot.
    const additions = picks.map(pick => {
      const definition = acceptedDefinition(pick, data, active);
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
  if (command.type === 'replace') {
    if (!replacementRemaining(session, slot)) throw new Error('Đã ghi đủ hiệp; dùng Thêm bài nếu muốn tập thêm.');
    if (structure.slots.length >= 100) throw new Error('Giới hạn kỹ thuật của Tracker: 100 mục bài, kể cả mục đã dừng. Không thể thêm successor.');
    const active = new Set(structure.slots.filter(item => item.status === 'active').map(item => item.exerciseId));
    const definition = acceptedDefinition(command.candidate, data, active);
    const snapshot = replacementSnapshot(command.candidate, slot, definition);
    const successor = { id: crypto.randomUUID(), exerciseId: definition.id, sourceSlotId: null,
      replacesSlotId: slot.id, status: 'active', snapshot };
    slot.status = 'replaced'; structure.slots.push(successor);
    structure.order.splice(structure.order.indexOf(slot.id) + 1, 0, successor.id);
    return;
  }
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
