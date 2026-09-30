# Planner contract và ranh giới AI

## Đang chạy

`js/planner.js` không gọi mạng. `createPlannerRequest` chuẩn hóa preferences; `suggestWorkout` lọc thư viện, giữ bài yêu cầu, kiểm tra bài loại trừ/dụng cụ/nhóm cơ, tránh ID trùng và báo điều kiện xung đột. Tham số bài tập là cấu hình người dùng, không được tự tối ưu như đơn tập y khoa.

Request version 1 gồm muscles, equipment, include/exclude (exercise IDs), count, minutes tùy chọn, workSeconds và parameters (sets/repMin/repMax/targetRIR/restSeconds); name, goal, priorities, notes và healthRestrictions là văn bản. goal/priorities/notes hiện chỉ để người dùng duyệt. healthRestrictions có nội dung sẽ chặn gợi ý local vì thuật toán không xác minh được điều kiện này.

Output version 1 có source (`local` hiện tại), status (`draft` hoặc `conflict`), conflicts; draft còn có workout `{id,name,exercises}`, explanations theo exercise ID, warnings và estimatedSeconds. Thời gian = số bài × hiệp × (workSeconds + restSeconds), chưa gồm khởi động/đổi máy. Regenerate chạy lại với preferences hiện tại; cùng cấu hình có thể cho cùng kết quả vì đây là logic deterministic.

`validatePlannerOutput` là cổng kiểm tra cho adapter tương lai: chỉ nhận draft, exercise IDs/tên trong thư viện, thông số hợp lệ, đủ bài yêu cầu/nhóm cơ và không vi phạm bộ lọc. Không gọi save/activate. Giao diện review riêng; Accept/Edit đưa vào one-off builder, rồi người dùng tự chọn Start hoặc Save as template. Cancel không đổi plan active. Mọi kế hoạch và bản nháp manual vẫn dùng được nếu dịch vụ AI không tồn tại.

Thư viện hiện giữ nguyên các tên ghép "hoặc" từ plan gốc, chưa phải catalogue đầy đủ từng biến thể máy. Equipment là các lựa chọn cho định nghĩa ghép; cần kiểm tra tên và setup trước khi tập. Có thể tạo exercise custom cụ thể hơn. Alternatives chấm điểm nhóm cơ chính, pattern, cơ phụ và dụng cụ; không đảm bảo hai bài giống nhau hay phù hợp với chấn thương. Phân loại tham khảo phạm vi trong [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/); không thay số liệu của Original Plan.

## Trước khi kết nối AI thật — DECIDE LATER

Metadata dụng cụ của Hammer Curl dùng biến thể dumbbell trong [ACE Arm Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/body-part/arms/biceps/?page=1). Đây là phân loại thư viện để lọc; tên và thông số của Original Plan không đổi. Tạo bài custom nếu bạn dùng một biến thể khác.

| Câu hỏi | Quyết định cần có |
| --- | --- |
| Backend | Cần endpoint server, có validation, giới hạn request và quyền truy cập thích hợp. Flask là một lựa chọn sau khi có nhu cầu; chưa cài backend. |
| API key | Chỉ ở environment/secret store của server, không trong JS, localStorage, file backup hoặc Git. |
| Dữ liệu gửi | Chỉ preferences đã duyệt và danh sách exercise liên quan. Không mặc định gửi history, nhật ký, ảnh, cân/eo hoặc knee logs. Nếu cần dữ liệu sức khỏe, phải nêu rõ dữ liệu/đích và xin phép riêng. |
| Chi phí | Chưa chọn provider/model nên chưa có ước tính. Cần giá hiện hành, giới hạn ngân sách và cảnh báo lỗi/hết quota trước khi bật. |
| Offline | Builder và local planner vẫn chạy trên app đã được phục vụ; không hứa PWA/offline cache vì chưa có service worker. Remote AI không hoạt động offline. |
| Retention | Chưa có provider nên retention chưa xác định. Phải đọc chính sách hiện hành, cách tắt lưu nếu có và mức dữ liệu cho phép gửi. |
| Phần local làm được | Lọc, kiểm tra, phát hiện trùng, tìm alternatives và ước tính thời gian. AI chỉ cần cho diễn giải sở thích tự do, cân nhắc mềm và giải thích. |

Không có quyết định nào trong bảng này là sự cho phép gửi dữ liệu ra ngoài. Phase remote AI cần một yêu cầu/duyệt riêng.
