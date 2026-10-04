# Tracker — feature backlog từ nghiên cứu V4

04/10/2026 · **RESEARCHED / PLANNED**, trừ trạng thái milestone được ghi riêng trong `V4_ROADMAP.md`. Nguồn: [global report](GLOBAL_APP_RESEARCH.md) và ba hồ sơ Gym/Nutrition/Journal. Điểm là nhận định để thảo luận, không phải kết quả thử usability hay lời hứa thời gian.

## Top 15 đề xuất và điểm đánh đổi

U = daily usefulness; F = friction reduction; T = fit với Tracker (5 tốt nhất). C = complexity; P = privacy risk (1 thấp nhất). “Overlap” chỉ mức đã có trong V3; tránh tính feature cũ thành công mới. Local risk 1 không có nghĩa dữ liệu đã được mã hóa.

| ID / cải tiến | U | F | T | C | P | Dependency / overlap | Cảm hứng và cách làm riêng | Ưu tiên |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01. Tìm món ngay daily log | 5 | 5 | 5 | 1 | 1 | Local; recent sort/library search đã có | MacroFactor/Lose It!: search không dấu, recent order, empty state ngay form, vẫn thấy date/meal/amount | P0, làm trước |
| 02. Recipe cook-size preview | 4 | 4 | 5 | 2 | 1 | Local; recipe/ingredients đã có | Paprika/Samsung Food: target batch, scaled quantities/total, per-serving giữ nguyên; không sửa nguồn | P0 nhỏ |
| 03. Recent activity toggles | 5 | 4 | 5 | 1 | 1 | Local; tags/add-only buttons đã có | DailyBean/Daylio: nút giấy chọn/bỏ chọn, ưu tiên ngày gần đây, vẫn cho tự nhập | P0 nhỏ |
| 04. Khôi phục builder/planner draft | 5 | 5 | 5 | 3 | 1 | Local; live draft đã có, pre-start chưa có; cần migration | Bảo vệ effort như nguyên tắc edit scope từ Strong; resume card + savedAt + conflict recovery | P0 kế tiếp |
| 05. Một exercise picker tại Add/Replace | 5 | 5 | 5 | 2 | 1 | Local; reuse filters/metadata hiện có | Hevy/Fitbod: muscle/equipment/pattern trong workflow, pending selected count, accessible clear filters | P0 kế tiếp |
| 06. My Day theo ngày | 5 | 4 | 5 | 3 | 1 | Local; dashboard/gym hint/photos đã có một phần | Diarium/Gyroscope/Exist: một ngày, link về nguồn, chưa ghi ≠ 0, đọc trước rồi mới mở editor | P1, duyệt concept |
| 07. Live session edits + scope diff | 5 | 5 | 5 | 4 | 1 | Local; snapshots nền tảng có; stable slot IDs/migration | Strong/Hevy/Caliber: badge “chỉ hôm nay”, không đổi template đến khi duyệt | P1, thiết kế trước |
| 08. Favorite portions / selected-meal recents | 5 | 5 | 5 | 3 | 1 | Local; global recents có; preferences/migration | FoodNoms/Lose It!/MyNetDiary: pin món + lượng thường dùng, giải thích gợi ý và cho ẩn | P1 |
| 09. Multi-add + selective meal copy | 5 | 5 | 5 | 3 | 1 | Local; saved meals/copy-day có; atomic batch | MacroFactor/Lifesum: pending list, date/meal/count rõ, one commit, snapshot mỗi item | P1 |
| 10. Journal search + older history | 4 | 4 | 5 | 2 | 1 | Local; calendar/timeline có, latest30 giới hạn | Day One/Diarium: text/tag/date filter, load older, photo-only day rõ | P1 |
| 11. Recipe search / duplicate / cooking focus | 4 | 4 | 5 | 2 | 1 | Local; tags/steps/photos đã có | Paprika/Mealime: title/ingredient/tag search; checklist tạm và current step trên giấy | P1 |
| 12. Backup confidence + tested paired restore | 4 | 4 | 5 | 3 | 1 | Browser APIs; 2-file export/import đã có | Portability ở GymBook/Day One; package ID/checklist/counts, không ghi “download thành công” khi chỉ tạo link | P0 reliability gate |
| 13. Weekly Life Review + coverage | 4 | 3 | 5 | 3 | 1 | Local; weekly fitness/nutrition đã có | Daylio/Exist: mood distribution, sources, đủ/missing days; không tổng wellness score | P1 sau My Day |
| 14. Alternatives cụ thể + equipment context | 4 | 4 | 5 | 3 | 1 | Local; existing ranking; cần curated metadata | Fitbod/Alpha Progression: shared/different attributes, setup note, máy thường dùng; không “identical/safe” | P1 |
| 15. Completed workout → template mới | 4 | 4 | 5 | 2 | 1 | Local; pre-start save đã có; snapshot mapping | Hevy/Strong: review performed vs target prescription, tạo template mới, active plan không tự đổi | P1 sau identity review |

Không lấy tổng điểm làm lịch tự động: 07 giá trị cao nhưng rủi ro history mapping cao; 12 ít dùng hằng ngày nhưng bảo vệ mọi dữ liệu. 02 nhỏ và contract rõ nên có thể làm trước feature 04 dù điểm daily-use thấp hơn. My Day không bắt buộc migration nếu chỉ là view dẫn xuất.

## P0 — high-value improvements

**Cập nhật04/10:**01–03 đã IMPLEMENTED/TESTED trong milestone đầu, kèm sửa mood cards mobile.04/05/12 vẫn là kế tiếp. Bằng chứng: `V4_IMPLEMENTATION_REPORT.md`.

- **01–03:** ba thay đổi nhỏ local được chọn cho milestone đầu. Không phải xây lại food, recipe hoặc journal; cải thiện thao tác trên model cũ.
- **04:** ngăn mất kế hoạch chưa Start khi reload; thiết kế bounded draft, schema upgrade, revision và rõ saved/failed trước khi thêm planner UI.
- **05:** đưa bộ lọc đang có vào điểm chọn bài; không duplicate catalog hay âm thầm thêm bài thay người dùng.
- **12:** trước migration lớn phải thử backup thật bằng fixtures ở origin riêng; kiểm tra restored counts, macro snapshots, session snapshots và photo owner IDs. Download link không chứng minh file tồn tại.

## P1 — strong next features

06–11 và 13–15 ở bảng trên là các mốc riêng. Không gộp vào một rewrite. Đầu tiên duyệt My Day và live-session scope qua wireframe/contract. Sau đó làm search/reuse trước analytics phức tạp.

**Activity catalog** là phần mở rộng của 03: stable ID, tên/icon riêng, group/order/favorite/archive, giữ tên snapshot khi rename. Chỉ thêm khi recent tags không đủ; không chuyển tất cả tag cũ thành một taxonomy tự đoán. Optional energy/feelings phải giữ ngữ nghĩa mood cũ.

## P2 — useful later

| Feature | Vì sao / điều kiện trước |
| --- | --- |
| Explicit grams/portion basis | Bớt nhẩm nhưng cần người dùng nhập mapping. Không parse “1 bát” thành gram; migration phải giữ serving text cũ. |
| Warm-up/working sets rồi supersets | Working-set counts trước muscle chart; nhóm superset cần định nghĩa timer/focus, không chỉ badge. Drop/back-off/failure/AMRAP chỉ thêm khi dùng. |
| Muscle distribution / exercise PR | Stable exercise/load convention; không gộp máy khác, tạ hỗ trợ và tạ nâng. e1RM là estimate, không target bắt buộc. |
| Shopping checklist | Dựa scaled ingredients, merge exact name + compatible units; giữ raw/cooked và recipe provenance. Không cần retailer account. |
| Monthly / yearly memories | Có đủ dữ liệu, opt-in/hide controls; show counts/coverage, không ép positive framing. |
| Recipe yield repartition / cooked grams | Khác cook-size preview. Cần total invariant và measured cooked weight; không suy từ raw mass. |
| Plan-only export/import | Preview ID conflicts/exercise mapping, exclude personal history/notes/photos theo mặc định. |
| Photo gallery zoom/captions/inline attach | Hạ tầng có; cần xử lý partial entry/photo save, orphan photo và quyền deletion rõ. |
| PWA / offline shell | Phải test update/cache mismatch/reload; localStorage không tự bảo đảm app mở offline. |
| Large photo backup | Memory limit hiện tại, ZIP/streaming là quyết định có đo; không thêm dependency trước khi cần. |

## EXPERIMENTS

- Pin 2–4 hành động tự chọn trên dashboard: thử số lần tìm menu giảm không, không tạo dashboard builder phức tạp.
- Optional original journal prompts: một câu ngắn có thể bỏ qua; không remote summarization hoặc gán ý nghĩa tâm lý.
- “Remember this substitute” per slot: user chọn, không auto replace; đánh giá với nhiều gym.
- Short undo cho delete set/entry: lưu record và revision, từ chối nếu conflict; không hứa undo sau đóng tab hoặc mọi mutation.
- In-app reminder trước notification: neutral text; không streak punishment hoặc nhắc nhở mặc định gây gián đoạn.
- Associations: chỉ sau present/absent/unknown contract, sample counts và optional comparison window. Không báo “gym làm bạn vui hơn” từ vài tags.

## REMOTE-AI / BACKEND DECISIONS

| Ý tưởng | Phần local đủ dùng | Quyết định cần trước khi nối ngoài |
| --- | --- | --- |
| Natural-language workout | Local filters/manual builder hiện có | Provider/backend key, preferences được gửi, giá/retention, validator và user draft approval |
| Photo/voice food logging | Photo library và manual input; barcode mapping cá nhân có thể local | Camera/mic, processing route, database coverage Việt, estimated output review, chi phí |
| Recipe URL import | Manual structured paste preview | Remote fetch/CORS, site permissions/content rights, parser correctness, backend nếu cần |
| Journal summaries | Local counts/coverage/prompts | Nội dung đặc biệt riêng tư; opt-in từng lần/phạm vi, retention/deletion, không mặc định gửi toàn history |
| Cloud sync / multi-device | Export/import thủ công | Auth, conflict resolution, storage/photos, encryption, region, backups, phí; chỉ dùng Flask nếu giải quyết nhu cầu này |

## REJECTED / NOT A FIT

- Social feed, leaderboards, competitions: không phục vụ một người ghi riêng tư hằng ngày.
- Clone DailyBean mascots/screens/themes hoặc asset/video của fitness apps: học workflow, giữ expression riêng.
- Auto “knee safe”, recovery percentage hoặc load tăng từ pain logs: ngoài ranh giới sản phẩm.
- Auto calorie targets, food moral scores, guilt streaks, compulsory survey: lấy quyền quyết định khỏi người dùng.
- Full exercise scripting language hoặc toàn bộ 10 loại set ngay: overhead lớn hơn vấn đề hiện tại.
- “AI scan chính xác” và tự save macro/plan: dữ liệu chưa duyệt; phải giữ draft/manual fallback.

## Cách kiểm chứng giá trị

Đo bằng fixture và buổi dùng thật, không analytics upload: mở app → log bữa quen, thêm 3 bài, ghi một mood + 2 activities. Ghi thủ công số thao tác/lỗi/quay lại cần thiết trước và sau. Các con số điểm ở trên là giả thuyết; chưa tuyên bố tiết kiệm bao nhiêu giây hoặc tăng adherence.
