# Tracker V3 — kế hoạch triển khai

_Cập nhật tiến độ: 03/10/2026 · Triển khai/kiểm tra gần nhất: 30/09/2026 · Mở rộng ứng dụng hiện có, giữ plan gốc và dữ liệu V2._

**Tiếp nối 04/10/2026:** V4 research + ba cải tiến local và sửa mood cards mobile đã triển khai; suite hiện tại60/60. Schema vẫn6. Phần dưới giữ mốc lịch sử V3; trạng thái mới nhất xem `V4_ROADMAP.md` và `V4_IMPLEMENTATION_REPORT.md`.

## Trạng thái ban đầu

- `main` có V2 schema 5; 34/34 kiểm tra đạt. `MASTER_PLAN.md` là tài liệu riêng, không commit hoặc thay đổi.
- Bản A/B/C/D trong `js/program.js` đang là nguồn duy nhất cho giao diện Gym; session cũ có tên bài và từng set, nhưng chưa có snapshot toàn bộ template.
- Ảnh đã ở IndexedDB riêng và có file backup ảnh riêng. Thư viện thực phẩm/công thức chưa liên kết ảnh với chủ sở hữu.

## Dữ liệu mới tối thiểu

- Schema 6 thêm `customExercises[]`, `plans[]`, `activePlanId` (null = Original Plan). Không sao chép A/B/C/D vào localStorage; plan gốc vẫn đọc từ `js/program.js`.
- Bài custom: ID, tên, nhóm cơ chính, pattern, equipment, ghi chú, timestamps, trạng thái archived. Built-in library là phân loại để tìm kiếm, không thay số set/rep/RIR/rest trong plan gốc.
- Plan custom: ID, tên, các day có ID/tên và danh sách bài theo thứ tự. Mỗi bài trong day giữ exercise ID, tên snapshot và thông số riêng (sets, repMin, repMax, targetRIR, restSeconds, notes). Có thể xóa plan mà không đụng session đã hoàn thành.
- Session V3 tùy biến hoặc one-off giữ snapshot toàn bộ day và ID bài khi bắt đầu; set tiếp tục giữ `exerciseName` snapshot. Session cũ A/B/C/D vẫn được đọc như trước. Photo record có thể thêm ownerType/ownerId tùy chọn mà không đổi version IndexedDB.

## Mốc phụ thuộc

| Mốc | Kết quả có thể dùng | Kiểm tra / done khi |
| --- | --- | --- |
| 1. Schema + migration ✓ | V5→V6 thêm cấu trúc rỗng; backup/restore chấp nhận V5 và V6 | Tests dữ liệu cũ, history snapshot roundtrip và tham chiếu sai |
| 2. Exercise Library ✓ | Xem/tìm/lọc bài built-in và custom; tạo/sửa/ẩn/xóa bài custom | Browser tạo/sửa/tìm; tests validate và archive/delete |
| 3. Manual builder ✓ | Tạo day, thêm/thay/xóa/sắp bài, chỉnh sets/reps/RIR/rest | Browser thêm/đổi thứ tự/sửa/invalid reps và reload; mobile |
| 4. Nhiều plan ✓ | Tạo/đổi tên/nhân bản/xóa/chọn active; luôn quay về Original | Browser tạo/chọn/reload; tests sao chép gốc và xóa giữ history |
| 5. One-off ✓ | Tạo buổi tạm, duyệt/chỉnh rồi tập/ghi history | Browser custom/one-off logging; snapshot history giữ tên cũ |
| 6. Alternatives ✓ | Gợi ý dựa nhóm cơ/pattern/equipment và nêu khác biệt | Tests ranking; browser thay bài; chọn thủ công khi muốn |
| 7. Food/recipe photos ✓ | Ảnh chủ sở hữu Food/Recipe trong IndexedDB, thêm/thay/xóa | Browser thêm ảnh; tests owner backup và transaction/rollback |
| 8. Planner interface ✓ | Request/output có cấu trúc, gợi ý local deterministic, user duyệt rồi mới dùng | Tests constraints/output gate; browser duyệt vào builder và tập |
| 9. Remote AI tùy chọn | **Chưa triển khai**; cần quyết định backend, privacy, phí và nơi giữ key | Chỉ làm sau quyết định riêng |

## Rủi ro và quyết định

- Không ghi đè session V2 khi chuyển schema. Khi mở lại session cũ, tiếp tục dùng plan gốc; session V3 dùng snapshot day.
- Xóa exercise đang được plan tham chiếu chuyển thành archive. Xóa plan không xóa lịch sử; nếu plan active bị xóa, quay về Original.
- AI remote có thể gửi dữ liệu sức khỏe và tốn phí; chưa được cấu hình và không được tự gửi. Planner local chỉ là gợi ý có thể chỉnh/sửa/hủy.
- Thiết bị khác, cloud sync và backend vẫn **DECIDE LATER**.

## Hiện tại

- **CURRENT PHASE:** dùng V3 local và thu thập phản hồi — phases 1–8 đã triển khai và review.
- **COMPLETED:** migration schema 6, library, builder, plans, one-off snapshots, alternatives, ảnh food/recipe, local planner. 55/55 tests đạt ngày 30/09/2026; cập nhật tài liệu ngày 03/10 không chạy lại app tests.
- **IN PROGRESS:** không còn cho phases 1–8; không có công việc dở dang cho bản local.
- **NEXT:** dùng thực tế và ghi nhận lỗi/UX; chỉ quyết định remote AI nếu có nhu cầu.
- **BLOCKERS:** không có cho manual/local planner.
- **CURRENT STEP:** ghi nhận lỗi/UX từ sử dụng thực tế; checkpoint mới nhất `5e3332d`.
- **GIT (03/10):** `main` đi trước tham chiếu `origin/main` lưu ở máy 6 commits; chưa fetch để kiểm tra remote trực tiếp. Lượt cập nhật này không push.

## Bằng chứng và giới hạn kiểm tra

- Browser test riêng `127.0.0.1:8767`; không sửa storage thật ở `8765`. Tạo/sửa exercise, search; tạo plan/day, thêm bài, invalid reps, reorder, replace, active/reload. Custom set lưu/reload/complete; đổi tên template sau đó không đổi history. Local planner draft → builder → one-off → history.
- Ảnh thực phẩm/công thức đã thêm qua file chooser; food photo còn sau reload. Sửa calorie thực phẩm không đổi bữa cũ. Không exercise destructive confirmation bằng browser; tests Node kiểm tra delete/archive và ảnh replacement/removal.
- `fake-indexeddb` là dev dependency duy nhất, không nằm trong frontend; tests mô phỏng giao dịch, lỗi put và stale-tab rollback. Không thử quota thật, kho ảnh lớn, mobile thiết bị vật lý, hoặc tải/restore đủ hai file trong browser người dùng.
- Mobile 320 và 360 px: builder/library/planner không tràn ngang; nút lên/xuống là button, có disabled ở ranh giới; các input có label và focus dùng CSS hiện có.
- Phiên bản asset/module được đồng bộ để tránh lỗi cache module cũ. Sau cập nhật cần tải lại các tab; không đổi port/profile chứa dữ liệu thật.

## Backlog / DECIDE LATER

- Remote AI: backend, secret key, dữ liệu cho phép gửi, provider/model, budget và retention. Chi tiết trong `AI_PLANNER.md`; chưa gửi gì ra ngoài.
- One-off editor và planner prefs chưa lưu qua reload trước khi Start/Save; có thể thêm autosave sau phản hồi sử dụng.
- Catalogue từng bài/biến thể cụ thể, muscle distribution theo tuần, recipe scaling, ZIP backup lớn, PWA, sync và backend vẫn để sau.
- Sau xóa food/recipe, ảnh vẫn trong gallery để người dùng quản lý; backup ảnh có thể chứa owner ID không còn tồn tại, không tự xóa ảnh riêng tư.

## Review cuối

Đã sửa stale draft khi input/validation đổi, giới hạn tên nhân bản và lọc dụng cụ Hammer Curl. Regression planner đã kiểm chứng trên browser; review lại không còn important trong phạm vi đó. Phiên mới không có lỗi console ở các màn hình đã thử. Hai file backup chuẩn bị được link tải, chưa khẳng định download/restore trên profile người dùng. Báo cáo đầy đủ: `V3_IMPLEMENTATION_REPORT.md`.

Checkpoint code: `b99f8d2`; sửa mobile và chốt trạng thái tại `5e3332d` trên `main`. Follow-up mobile: tên 160 ký tự không có khoảng trắng đã được test (scroll width 2052→305 tại viewport 320); thêm xuống dòng, nhân bản tên dài qua UI thành công.
