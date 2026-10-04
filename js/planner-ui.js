import { MUSCLES, EQUIPMENT, libraryExercises } from './custom-workout.js?v=17';
import { createPlannerRequest, suggestWorkout, validatePlannerOutput } from './planner.js?v=17';

export function createPlannerUI({ main, getData, helpers, checkChoices, useDraft, render }) {
  const { node, field, panel, p, h2, h3, div, button, message, id } = helpers;
  let preferences = null, result = null;
  return function plannerView() {
    const library = libraryExercises(getData().customExercises);
    const box = panel(h2('Giúp mình lên buổi tập'), p('AI chưa kết nối. Đây là gợi ý LOCAL theo bộ lọc, luôn là bản nháp. Bạn duyệt/chỉnh rồi mới bắt đầu hoặc lưu.', 'hint'));
    const raw = preferences || { count: 4, sets: 2, repMin: 8, repMax: 12, targetRIR: '2', restSeconds: 90, workSeconds: 40 };
    const form = node('form', { class: 'journal-form' }, [
      field('Tên buổi / loại buổi', 'name', raw.name || 'Buổi gợi ý'),
      checkChoices('Hôm nay muốn tập', 'muscles', MUSCLES, raw.muscles),
      checkChoices('Dụng cụ có sẵn (trống = không lọc)', 'equipment', EQUIPMENT, raw.equipment),
      node('details', { open: raw.include?.length || raw.exclude?.length ? '' : null }, [node('summary', { text: 'Bài muốn tập / không muốn tập (tùy chọn)' }),
        checkChoices('Bài muốn tập', 'include', library.map(item => ({ value: item.id, label: item.name })), raw.include),
        checkChoices('Bài không muốn tập', 'exclude', library.map(item => ({ value: item.id, label: item.name })), raw.exclude)]),
      field('Mục tiêu (ghi để tự duyệt)', 'goal', raw.goal || ''),
      field('Ưu tiên nhóm cơ (ghi chú)', 'priorities', raw.priorities || ''),
      div('form-grid', ...[
        ['Số bài', 'count', 1, 20], ['Hiệp mỗi bài', 'sets', 1, 20], ['Reps min', 'repMin', 1, 100],
        ['Reps max', 'repMax', 1, 100], ['Giây nghỉ', 'restSeconds', 0, 1800], ['Ước tính giây thực hiện mỗi hiệp', 'workSeconds', 10, 300]
      ].map(([label, name, min, max]) => field(label, name, raw[name], { type: 'number', min, max, step: 1, required: true })),
      field('RIR hoặc khoảng RIR', 'targetRIR', raw.targetRIR ?? ''), field('Thời gian tối đa (phút, tùy chọn)', 'minutes', raw.minutes || '', { type: 'number', min: 1, max: 300, step: 1 })),
      p('Các số mặc định là cấu hình chỉnh được, không phải đơn tập cá nhân. Ghi chú tự do chưa được thuật toán local diễn giải.', 'hint'),
      field('Mệt mỏi / sở thích / lưu ý', 'notes', raw.notes || '', { tag: 'textarea' }),
      field('Hạn chế sức khỏe cứng (nếu có)', 'healthRestrictions', raw.healthRestrictions || '', { tag: 'textarea' }),
      p('Nếu có hạn chế sức khỏe bằng văn bản, local planner sẽ báo cần builder thủ công thay vì đoán bài phù hợp.', 'hint'),
      node('button', { type: 'submit', class: 'primary', text: result ? 'Tạo lại gợi ý' : 'Tạo bản nháp local' })
    ]);
    form.addEventListener('submit', event => {
      event.preventDefault(); const fields = new FormData(form);
      preferences = { ...Object.fromEntries(fields), muscles: fields.getAll('muscles'), equipment: fields.getAll('equipment'), include: fields.getAll('include'), exclude: fields.getAll('exclude') };
      result = null;
      try { const request = createPlannerRequest(preferences); result = suggestWorkout(request, library, id); if (result.status === 'draft') result = validatePlannerOutput(result, request, library); render(); main.querySelector('.planner-result')?.scrollIntoView({ block: 'start' }); }
      catch (error) { result = null; render(); message(error.message, true); }
    });
    box.append(form);
    if (result?.status === 'conflict') box.append(div('planner-result', h3('Điều kiện đang xung đột'), ...result.conflicts.map(text => p(text, 'notice error')), button('Hủy gợi ý', () => { result = null; render(); })));
    if (result?.status === 'draft') {
      const draft = panel(h2(`BẢN NHÁP · ${result.workout.name}`), p(`Ước tính ${Math.ceil(result.estimatedSeconds / 60)} phút theo tham số của bạn.`, 'summary'));
      draft.classList.add('planner-result');
      result.workout.exercises.forEach((slot, index) => draft.append(div('list-card', h3(`${index + 1}. ${slot.name}`), p(`${slot.sets} × ${slot.repMin}–${slot.repMax} · RIR ${slot.targetRIR ?? 'chưa định nghĩa'} · nghỉ ${slot.restSeconds}s`), p(result.explanations[index].text, 'hint'))));
      draft.append(...result.warnings.map(text => p(text, 'hint')),
        div('actions', button('Chấp nhận & mở bộ chỉnh', () => useDraft(result.workout), 'primary'),
          button('Chỉnh / thay bài trước khi tập', () => useDraft(result.workout)),
          button('Hủy gợi ý', () => { result = null; render(); })),
        p('Mở builder chỉ chuyển bản nháp. Chưa lưu kế hoạch, chưa thay kế hoạch active và chưa bắt đầu buổi.', 'hint'));
      box.append(draft);
    }
    const contract = node('details', {}, [node('summary', { text: 'Xem dữ liệu planner có cấu trúc' })]);
    form.addEventListener('input', () => { result = null; box.querySelector('.planner-result')?.remove(); contract.hidden = true; });
    if (preferences) { try { contract.append(node('pre', { class: 'contract-preview', text: JSON.stringify({ request: createPlannerRequest(preferences), output: result }, null, 2) })); } catch { contract.append(p('Cần sửa input trước khi tạo request hợp lệ.')); } }
    else contract.append(p('Request/output sẽ hiện sau khi tạo gợi ý. Không gửi dữ liệu ra mạng.'));
    box.append(contract); main.append(box);
  };
}
