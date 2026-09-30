# Tracker V3 — báo cáo triển khai

_30/09/2026 · mở rộng repo hiện có, không dựng lại app._

## BUILT / CURRENT APP FEATURES

- Gym home theo plan active, quay về Original Plan bất cứ lúc nào.
- Exercise Library: tìm theo tên, lọc cơ/pattern/dụng cụ/nguồn; custom create/edit/delete hoặc archive khi có tham chiếu.
- Workout Builder: thêm/bỏ/thay/sắp bài bằng nút lên/xuống, chỉnh hiệp/reps min-max/RIR/nghỉ/ghi chú; chọn alternatives hoặc bất kỳ bài khác chưa có trong buổi.
- Nhiều plan: tạo/đổi tên/nhân bản/chỉnh/xóa/chọn active, nhiều day; bản sao Original lấy thông số của tuần hiện tại.
- One-off workout: duyệt/chỉnh/bắt đầu, lưu thành plan tùy chọn; không tự thay active plan. Draft đang tập và completed session có snapshot riêng.
- Planner LOCAL: preferences có cấu trúc, bộ lọc/kiểm tra xung đột, giải thích ngắn, review/edit/regenerate/cancel. Chưa kết nối remote AI, không có API key hoặc upload dữ liệu.
- Food/recipe photos: thêm/thay/gỡ trong IndexedDB hiện có; xác nhận thay/gỡ, chặn stale-tab; snapshot macro của nhật ký vẫn giữ nguyên.
- V2 journal, ảnh tiến độ, bữa lưu sẵn, recipe, food log, check-in, cardio/gối, progress, rest timer, focus logging và backup được giữ.

## TESTED

- `npm test`: **55/55 pass**; syntax check tất cả module JS và `git diff --check` đạt.
- Migration phiên bản 1–5 → 6, backup custom snapshot sau xóa plan, tham chiếu sai bị từ chối; copy Original ở tuần 1/2/3/6/12 không đổi PROGRAM.
- Model tests: custom validation/edit/archive/delete, reorder, template isolation, plan deletion, one-off sequence, alternatives, duplicate tên 160 ký tự.
- Planner tests: include/exclude, equipment, đủ nhóm cơ/số bài, thời gian, explicit health restriction, provider-output validation.
- Photo tests: owner metadata/backup roundtrip; IndexedDB mô phỏng add/replace/remove, rollback lỗi put và chống tab cũ ghi đè.
- Browser riêng ở `127.0.0.1:8767`: tạo/sửa/tìm bài; tạo plan/day, thêm/thay/sắp bài, invalid reps và sửa thông số; chọn active/reload; custom ghi hiệp/reload/complete; đổi tên template không đổi lịch sử; local draft → builder → one-off → history.
- Browser: thêm ảnh thực phẩm/công thức, food photo tồn tại qua reload; sửa calorie món không đổi bữa đã ghi. Chuẩn bị được cả link backup dữ liệu và backup ảnh trên schema 6.
- Regression planner: đổi input làm biến mất nút duyệt cũ; submit cấu hình sai không giữ draft cũ. Phiên browser mới không ghi lỗi console trong các màn hình đã thử.
- Code review độc lập: không thấy critical; đã sửa stale draft, tên duplicate quá dài và metadata dụng cụ Hammer Curl; lượt kiểm tra lại không còn important trong phạm vi đó.

Không sửa storage thật tại `8765`. Browser destructive confirmations, quota thiết bị thật, ảnh dung lượng lớn, tải/restore đủ hai file trên profile người dùng và mobile vật lý chưa được kiểm chứng. Tests ảnh giao dịch dùng emulation, không thay thế mọi hành vi native browser.

## FILES CREATED

`js/custom-workout.js`, `js/gym-builder-ui.js`, `js/planner.js`, `js/planner-ui.js`, `js/nutrition-photo-ui.js`; `tests/custom-workout.test.js`, `tests/planner.test.js`, `tests/food-photo.test.js`, `tests/photo-store.test.js`; `package-lock.json`; `AI_PLANNER.md`, `V3_ROADMAP.md`, `FULL_STEP_BY_STEP_GUIDE.txt`, báo cáo này.

## FILES MODIFIED

`index.html`, `css/style.css`, `js/app.js`, `js/data.js`, `js/navigation.js`, `js/workout.js`, `js/progress.js`, `js/photo-store.js`; `js/journal.js` và `js/photo-backup.js` đồng bộ import version; `tests/model.test.js`, `tests/workout.test.js`, `package.json`, `.gitignore`, `README.md`, `DATA_MODEL.md`, `PHOTO_STORAGE.md`, `V2_ROADMAP.md`.

`MASTER_PLAN.md` và `js/program.js` không sửa. Tài liệu cá nhân và backup/ảnh thử bị loại khỏi Git; không push lên remote.

## DATA STORAGE

Một JSON `vshape-tracker` trong localStorage, schema **6**. Migration cộng thêm `customExercises`, `plans`, `activePlanId`; giữ settings/history/nutrition/journal/draft. Custom session snapshot tách khỏi template; sửa/xóa plan không xóa completed sessions. Ảnh vẫn ở `tracker-photos` IndexedDB/store `photos` v1, có owner tùy chọn; không có base64 ảnh trong localStorage. Backup đầy đủ vẫn cần hai file riêng tư.

## MOBILE STATUS

Đã thử 320/360 px cho builder/library/planner, và 360 px cho food library; không tràn ngang. Giữ font/UI giấy đã chốt. Move up/down là button có disabled ở biên; optional exercise selections trong planner được gộp vào details để bớt dài. Ảnh chụp thử nằm trong `.local/v3-mobile.jpg`, không commit.

## KNOWN LIMITATIONS

- Trước Start/Save as plan, one-off editor và planner prefs chỉ giữ trong memory; reload mất phần chưa lưu. Đang tập thì draft tự lưu.
- Local planner không diễn giải mục tiêu/ưu tiên/ghi chú tự do; giữ chúng để người dùng duyệt. Có explicit healthRestrictions thì báo cần manual builder, không đoán bài an toàn.
- Thư viện ban đầu giữ tên ghép "hoặc" của Original Plan, chưa là danh sách đầy đủ biến thể cụ thể. Alternatives không đảm bảo hoàn toàn tương đương.
- Copy Original giữ khoảng nghỉ gốc trong notes, timer dùng mức thấp có thể sửa. Custom sets không tự giảm theo tuần Original.
- Xóa food/recipe giữ ảnh trong gallery để tự quản lý; ảnh backup có thể chứa owner không còn trong thư viện. Recipe scaling chưa có.
- Không remote AI, backend, login, sync hoặc PWA offline cache. Bộ test cần `npm ci` để cài dev dependency; mở web bằng Python không cần npm.

## DECISIONS I STILL NEED TO MAKE

Chỉ khi muốn AI thật: backend/secret key, provider/model, dữ liệu cho phép gửi, ngân sách, retention và xử lý offline. Các câu hỏi này được ghi trong `AI_PLANNER.md`. Multi-device/backend/deployment vẫn DECIDE LATER; không phải blocker của bản local.

## FEATURES LEFT IN BACKLOG

Autosave one-off editor, saved planner prefs, catalogue từng biến thể, weekly muscle distribution, recipe scaling/shopping list, ZIP/streaming ảnh lớn, PWA, cloud sync và login khi có nhu cầu.

## NEXT RECOMMENDED PHASE

Dùng thực tế ở phòng tập để ghi nhận các lỗi/điểm khó dùng, rồi chỉnh UX và dữ liệu theo phản hồi. Giữ Vanilla JS/local storage; chưa cần chuyển Flask chỉ vì có trong roadmap. Nếu muốn AI thật, bắt đầu bằng quyết định architecture/privacy trong `AI_PLANNER.md`.

## RECOMMENDED MODEL FOR THAT PHASE

**GPT-6.1-sol · reasoning high** cho review/fix/triển khai tiếp; reasoning medium cho thay đổi giao diện nhỏ. Model/reasoning theo từng bước có trong `FULL_STEP_BY_STEP_GUIDE.txt`.
