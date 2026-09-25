// Transcribed from MASTER_PLAN.md (23/09/2026). Rest ranges remain ranges.
const exercise = (name, sets, reps, rest, note = '', lower = false, core = false) => ({ name, sets, reps, rest, note, lower, core });

export const PROGRAM = {
  A: {
    title: 'Thân trên · ưu tiên xô', day: 'Thứ Hai', exercises: [
      exercise('Lat pulldown, tay cầm thoải mái', 3, '8–12', '2 phút', 'Kéo về phía trước ngực trên; không giật lưng.'),
      exercise('Incline dumbbell press, ghế dốc nhẹ khoảng 15–30°', 3, '8–12', '2 phút', 'Biên độ thoải mái, không ép vai xuống quá sâu.'),
      exercise('Chest-supported row hoặc seated cable row', 3, '8–12', '2 phút', 'Kéo khuỷu về sau có kiểm soát.'),
      exercise('Cable/DB lateral raise', 2, '12–20', '60–90 giây', 'Tránh nhún vai hoặc đung đưa.'),
      exercise('Cable biceps curl', 2, '10–15', '60–90 giây'),
      exercise('Triceps pushdown', 2, '10–15', '60–90 giây')
    ]
  },
  B: {
    title: 'Chân A · vai giữa · bụng', day: 'Thứ Ba', exercises: [
      exercise('Horizontal leg press', 3, '10–15', '2 phút', 'Chỉ xuống đến mức còn kiểm soát được; không bật đáy.', true),
      exercise('DB Romanian deadlift (RDL)', 3, '8–12', '2 phút', 'Nhờ PT kiểm tra gập hông trước khi tăng tạ; có thể dùng hip thrust nhẹ đã biết kỹ thuật khi học.', true),
      exercise('Seated leg curl', 2, '10–15', '90 giây', '', true),
      exercise('Calf raise, có điểm tựa', 2, '12–20', '60–90 giây', '', true),
      exercise('Cable/DB lateral raise', 3, '12–20', '60–90 giây'),
      exercise('Dead bug', 2, '6–10 mỗi bên', '60 giây', '', false, true)
    ]
  },
  C: {
    title: 'Thân trên · ngực + lưng', day: 'Thứ Năm', exercises: [
      exercise('Flat DB press hoặc machine chest press', 3, '8–12', '2 phút'),
      exercise('Lat pulldown', 3, '8–12', '2 phút'),
      exercise('Seated cable row hoặc chest-supported row', 2, '10–15', '2 phút'),
      exercise('Pec deck hoặc cable fly', 2, '12–15', '90 giây'),
      exercise('Seated DB shoulder press', 2, '8–12', '2 phút'),
      exercise('Hammer curl', 2, '10–15', '60–90 giây'),
      exercise('Overhead rope triceps extension', 2, '10–15', '60–90 giây')
    ]
  },
  D: {
    title: 'Chân B · vai · bụng', day: 'Thứ Bảy', exercises: [
      exercise('Goblet squat xuống ghế/box, hoặc leg press', 3, '8–12', '2 phút', 'Chọn biên độ theo kiểm soát và triệu chứng gối.', true),
      exercise('Hip thrust hoặc glute bridge có tải phù hợp', 2, '10–15', '2 phút', 'Tránh ưỡn quá mức lưng dưới.', true),
      exercise('Lying hoặc seated leg curl', 2, '10–15', '90 giây', '', true),
      exercise('Leg extension, theo biên độ đã được hướng dẫn', 2, '12–15', '90 giây', '', true),
      exercise('Cable/DB lateral raise', 3, '12–20', '60–90 giây'),
      exercise('Rear delt fly hoặc reverse pec deck', 3, '12–20', '60–90 giây'),
      exercise('Reverse crunch', 2, '8–15', '60 giây', '', false, true)
    ]
  }
};

export function setCount(item, week) { return week <= 2 && item.sets === 3 ? 2 : item.sets; }
export function targetRir(item, week) { return week <= 2 ? '3–4' : item.core ? 'DATA NOT DEFINED YET' : item.lower ? '2–3' : '1–3'; }
export function todayWorkout(date = new Date()) { return ({ 1: 'A', 2: 'B', 4: 'C', 6: 'D' })[date.getDay()] ?? null; }
export function weekGuidance(week) {
  if (week <= 2) return 'Tuần 1–2: học kỹ thuật, 2 hiệp/bài, RIR 3–4; hiệu chỉnh mức ăn và ghi gối hôm sau.';
  if (week <= 6) return 'Tuần 3–6: lên số hiệp trong bảng nếu phục hồi tốt; tăng số lần trước rồi mới tăng tạ.';
  if (week === 7) return 'Tuần 7: đánh giá. Chỉ giảm tải nếu mệt tích lũy, hiệu suất giảm hoặc đau cơ kéo dài; khi cần giảm khoảng một nửa số hiệp trong 1 tuần và giữ RIR 4.';
  if (week <= 11) return 'Tuần 8–11: tiếp tục tăng từ từ. Chỉ thêm 1–2 hiệp/tuần cho nhóm ưu tiên nếu đã hồi phục tốt và thật sự cần.';
  return 'Tuần 12: so cân trung bình, eo, thành tích tập và tình trạng gối; điều chỉnh giai đoạn tiếp.';
}
