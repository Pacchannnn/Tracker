# Tracker V4 — baseline đã kiểm tra

Ngày 03/10/2026, trước nghiên cứu đối thủ. HEAD `5e3332d`, main; có sẵn thay đổi tài liệu trong guide/V3 roadmap từ lượt trước. `npm test`: 55/55 pass, 0 fail. Đây là kiểm tra Node; chưa phải browser acceptance V4.

## Phạm vi đọc

README, TONG_KET_DU_AN, V3_ROADMAP, V3_IMPLEMENTATION_REPORT, DATA_MODEL, PHOTO_STORAGE, AI_PLANNER; MASTER_CODEX_PROMPT v2 ở thư mục outputs đã cung cấp. Không cần đọc/upload MASTER_PLAN cho nghiên cứu UX. Đọc các module domain/UI và tests liên quan. Không tìm thấy AGENTS.md trong repo qua rg.

| Khu vực | Bằng chứng code | Đã có | Khoảng trống cụ thể |
| --- | --- | --- | --- |
| Gym | js/gym-builder-ui.js: renderDayEditor; js/custom-workout.js; js/workout.js | Library có muscle/pattern/equipment/source filter; builder add/remove/reorder/replace; custom plans; one-off; previous values/focus/rest | Picker thêm bài chỉ tìm tên, khác library filter; chưa sửa danh sách bài trong live session; editor one-off mất qua reload |
| Gym history | js/app.js: startCustomWorkout/workoutView/historyView; tests/custom-workout.test.js | Snapshot lúc start, giữ lịch sử khi sửa/xóa plan, custom sets giữ đúng tuần 1 | Chưa có explicit session-only change/promotion flow; history theo tên trong progress có thể phân mảnh sau đổi tên |
| Nutrition | js/nutrition.js: recentFoods; js/app.js: renderFoodEntries/renderFoodLibrary | Food CRUD/search/photos, recent sorting, macro snapshots, meals/copy yesterday | Daily picker chưa có search; default chọn foods[0] dù option sort recent; recent dùng ngày chứ không timestamp; không có favorites/multi-add |
| Recipe | js/nutrition.js: validateRecipe/recipeTotals; js/app.js: renderRecipes | Quantity/unit/name, servings, steps, tags, notes, photo, macro mỗi phần tùy chọn | Chưa có scale preview; chỉnh số servings trong editor có nghĩa thay yield với macro mỗi phần giữ nguyên; cần phân biệt nấu nhiều/ít và chia lại phần |
| Journal | js/journal.js; js/app.js: journalView/renderJournalCalendar | 5 mood marks, title/note/tags, first-8 tag suggestion buttons, calendar/timeline/photos, cùng ngày có gym hint | Tag shortcut đã có nhưng chỉ add; chưa catalog/groups/hide/reorder; chưa mood/activity summaries; label mood trộn năng lượng (Mệt) và cảm xúc |
| Progress | js/progress.js: weeklySummary/exerciseHistory | Tuần tập, calories/protein trên ngày có log, cân/eo, cardio/gối, exercise history | Chưa hợp nhất mood/activities/photos; ngày không log khác 0 nhưng ngày ghi thiếu chưa được phân loại complete |
| Dashboard | js/app.js: dashboardView | Next workout, nutrition today, tuần/check-in, shortcuts | Chưa là My Day theo ngày với journal/photos/cardio/history links |
| Storage | js/data.js; js/photo-store.js; js/photo-backup.js | Schema6, additive migrations, Web Locks/stale edits, IDB photos ownership/transactions, 2-file backup | Chưa editor recovery; paired restore không phải transaction chung; browser large/quota/full restore còn cần test |

## Các phát biểu không được dùng

- Không gọi recent foods, activity shortcuts, photos, recipe CRUD, timer hoặc weekly nutrition là tính năng hoàn toàn thiếu.
- Không coi local storage là mã hóa, cloud backup hay khả năng offline PWA đã có.
- Không coi tag không ghi là hoạt động không xảy ra; không coi ngày ăn trống là 0 calories.
- Không đổi nhãn mood cũ rồi diễn giải lại lịch sử như dữ liệu đã được đo theo thang mới.

## Checklist nghiên cứu

- [x] Đọc baseline và chạy tests trước thay đổi.
- [x] Hoàn tất corpus 11 Gym, 12 Nutrition, 11 Journal và Gyroscope; primary sources và feedback tách biệt.
- [x] Tổng hợp, kiểm tra lại code, matrix/gap/scores/concepts/roadmap.
- [x] Chỉ sau đó chọn ba thay đổi nhỏ local, giữ proposal lớn trong roadmap.
- [x] Kiểm tra thay đổi và cập nhật trạng thái04/10:60/60 tests, browser fixtures riêng. Xem `../../V4_IMPLEMENTATION_REPORT.md`; bảng trên là baseline trước cải tiến, không phải trạng thái hiện tại.
