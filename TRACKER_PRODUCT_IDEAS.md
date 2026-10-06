# Tracker V4 — original product concepts

04/10/2026 · **DESIGN PROPOSALS**, không phải toàn bộ đã triển khai. Nguồn pattern nằm ở [global research](GLOBAL_APP_RESEARCH.md); phiên bản thực thi và test nằm ở [V4 roadmap](V4_ROADMAP.md).

## Một sản phẩm, ba nhịp sử dụng

**Ghi nhanh → làm việc đang cần → xem lại khi muốn.** Giữ navigation hiện tại và bề mặt giấy/dấu mực. Mọi record có một editor nguồn; trang tổng hợp chỉ dẫn về đó. Màu/mark/text hỗ trợ nhận biết, không dùng màu duy nhất để truyền đạt trạng thái.

So sánh hướng A (polish rồi mở rộng dần), B (dashboard/customization/analytics toàn diện), C (AI assistant dẫn dắt). Chọn A: ít quyết định mỗi lần ghi và có thể kiểm chứng bằng dữ liệu hiện có. B giữ làm từng concept; C là quyết định tương lai.

## 1. Tracker My Day — “Trang ngày của mình”

**Câu hỏi:** Hôm đó mình đã ghi những gì? Inspired by Diarium/Gyroscope, nhưng Tracker hiển thị giấy của một ngày với local records.

Luồng: chọn ngày → mood/note nhỏ nếu có → workout và cardio đã ghi → nutrition totals từ logged items → check-in → photo strip → link mở từng nguồn. Ngày không có dữ liệu: “Chưa có bản ghi”, cho một vài shortcut; không gọi ngày đó thất bại hoặc rest day. Photo-only date vẫn mở được.

Read model `daySummary(data, photosMetadata, date)` tính từ các arrays hiện có, không lưu bản sao summary. Chỉ đọc metadata/thumbnails cần thiết; không nạp tất cả Blob để dựng dashboard. Daily food không có entry khác 0-calorie entry. Không tự gắn activity Gym chỉ vì có session; có thể cho nút đề nghị để người dùng chọn sau.

Một cột ở 320/360/390; header date và tác vụ đang dùng rõ, sections thu gọn. Desktop hai cột khi có đủ nội dung. Không thêm một primary navigation tab bắt buộc; có thể nâng Hôm nay thành view này sau duyệt.

**Decision5A approved:** subview “Xem ngày”, Dashboard giữ nguyên; gối thu gọn, ảnh strip. **Status: Phase5A +5B IMPLEMENTED / TESTED trong phạm vi local (231tests,06/10/2026).** Journal Retrieval tìm title/note/tags không dấu; exact tags ALL + query AND; toàn bộ lịch sử trước paging30/60/90. Có Clear/no-result/count/source-return;0writes khi chỉ tìm/xem. Schema8 giữ nguyên; chưa nâng thành Home. STOP trước Phase6; giới hạn và evidence ở V4_IMPLEMENTATION_REPORT.md.

## 2. Fast Daily Journal — “Vài dấu mực là đủ”

DailyBean/Daylio gợi ý entry rất ngắn; giữ mood strip riêng của Tracker, activity chips và Save nhìn thấy. Ghi chú dài/title ở cùng trang nhưng không bắt buộc. Không tạo mascot/reward currency hay sao chép calendar.

Bước nhỏ: lấy thẻ gần đây theo ngày journal, dedupe không phân biệt hoa/thường; chip toggle có `aria-pressed`; thẻ đang chọn hiện bằng dấu/check + styling. Input comma hiện tại vẫn hoạt động và đồng bộ chip; không auto-save hoặc đánh dấu đã lưu khi chỉ chọn. Cấm nhập thẻ thứ 21 có thông báo; ký tự tiếng Việt được giữ nguyên. Đổi ngày/reload trước Save vẫn chưa có draft recovery, cần nói rõ.

Hai bước lớn sau: draft recovery và inline attach ảnh. Partial save giữa JSON/IDB phải hiện lỗi và ảnh orphan có cách quản lý. **Status: bước nhỏ được chọn; phần lớn PLANNED.**

## 3. Activity + Mood Log — “Ngôn ngữ của mình”

Không hard-code 25 hoạt động. Bắt đầu từ thẻ người dùng dùng; catalog sau có optional group, favorite, order và archived. `activityId` giữ identity, historical label snapshot giữ ý nghĩa khi rename. Tag cũ vẫn là tag cũ, user tự map nếu muốn.

5 mood ban đầu ưu tiên tốc độ. Optional energy riêng vì vui vẫn có thể mệt. Multi-emotion cho mixed days nhưng không ép chọn đủ mood/energy/stress/productivity. Label `drained` cũ không bị reinterpret; định nghĩa mới phải có version/date boundary.

Activity absent ≠ không chọn: chỉ tạo comparison sau khi có cách xác nhận ngày đã review. **Status: DECIDE LATER cho catalog/mood model.**

## 4. Personal Food / Recipe Library — “Sổ món của mình”

**Phase6A +6B status (06/10/2026): full boundedPhase6 IMPLEMENTED / TESTED;283tests/schema8,36/36 final gates.** Same-meal recents, multi-add/review/selective snapshot copy remain working. Cookbook now searches name/tags/ingredient with exact ALL tag filters, explicit duplicate review/fresh IDs and read-only Cooking. Draft/Cancel/search/target0writes;320/360/390 and keyboard checked. Deleted-copy history/MyDay/copy preserve snapshots; copies start without owned photo. Favorites/pins, portion basis, pending recovery, cooked-weight/yield repartition and shopping list remain deferred proposals. STOP beforePhase7; evidence/limits in V4_IMPLEMENTATION_REPORT.md.

Giữ card ảnh riêng, tên/serving/macros và nguồn nhập. Daily logger tìm trực tiếp trên thư viện đó; sau mới thêm pinned portions và recent theo meal. Search không dấu giúp gõ nhanh tiếng Việt. Kết quả rỗng phải chặn lưu, không âm thầm lấy món trước.

Recipe có ba vùng tách nhau: **bản gốc**, **lượng định nấu**, **lượng đã ăn**. Preview lượng nấu là view arithmetic; reload quay về base. Ví dụ fixture: gốc4, ingredient400g,300kcal/phần → nấu2:200g,600kcal tổng,300kcal/phần. Ghi1.5phần=450kcal. Macro chưa biết vẫn null; không lấy ảnh/ingredients đoán.

Không scale prose/thời gian/nhiệt độ; nhắc xem lại số trong hướng dẫn. Sửa yield ở editor không tự có nghĩa “chia cùng nồi”: thêm contract riêng sau. Search recipes/tags, duplicate review và read-only cooking đã IMPLEMENTED / TESTED trong6B. Optional step checklist không triển khai; nested folders/import/cloud và persistent favorites/pins/portion/recovery/yield/shopping vẫn là proposals.

## 5. Flexible Gym Session — “Hôm nay linh hoạt”

Inspired by Hevy/Strong: start plan snapshot → log → đổi phần còn lại do máy bận → save history → optional template review. Badge “Chỉ trong buổi này” luôn cạnh actions. Không kéo thao tác user sang edit plan mà không nói.

Giữ slot ID trong sets trước reorder; bài đã có set không bị thay tên lịch sử. Để thay bài đang có log: giữ phần đã tập và tạo slot mới cho phần tiếp theo, hoặc chặn replace và hướng dẫn Add; chọn một contract trước code. Xóa slot có logs cần review, không cascade âm thầm. Completed-to-template có preview planned vs performed parameters; không lấy max weight làm prescription tự động.

Original Plan không chỉnh trực tiếp; edits thuộc session hoặc bản sao custom. Mobile dùng nút lên/xuống và Add/Replace nhìn thấy; drag/swipe chỉ phụ. **Status: PLANNED, cần schema/identity design.**

## 6. Smart Exercise Replacement — “Giống ở đâu, khác ở đâu”

Fitbod equipment filters + Alpha Progression gym context gợi một phiếu thay bài: mục tiêu/movement chung, equipment thay đổi, note setup, performance gần nhất cùng context. Chọn equipment khác vẫn được; clear reason cho thứ tự gợi ý.

Không đổi target load từ bài cũ sang bài mới như thể lực tương đương. Sets/reps/RIR/rest được giữ để user review, note setup đúng bài mới. Concrete variants thêm dần dưới stable ID riêng; không rename composite Original definitions. Cho remember preferred substitute bằng quyết định user sau; không tự thay trong buổi sau. **Status: PLANNED.**

## 7. Weekly Life Review — “Tuần được ghi lại”

Một tờ review ngắn gồm workout count, recorded nutrition average, check-ins, mood distribution, activities theo số ngày và một highlight tự chọn. Mỗi số mở records nguồn; có period và denominator riêng.

Ví dụ minh họa, không phải dữ liệu thật: journal4/7, mood3/7, food2/7. Mood1ngàyỔn/3 khác journal coverage4/7. Không dùng tất cả 7 ngày để tính food average; cũng không gọi hai ngày có log là đã ăn đầy đủ. “Chưa xác nhận ghi đủ ngày” là trạng thái hợp lệ.

Không điểm tổng wellness, không causal statements. Associations về sleep/gym/social có thể thử sau với present/absent/unknown và sample evidence; không rank “best activity” từ nhóm nhỏ. **Status: PLANNED sau My Day.**

## 8. Monthly Memories — “Trang muốn giữ”

Day One/Exist gợi xem lại cùng ngày; Tracker có thể mở tháng với ảnh/highlight tự chọn, vài dữ kiện thật và link ngày. Không tự nêu tháng đó “tuyệt vời” hoặc tốt hơn tháng trước. Không mặc định notification có photo/note nhạy cảm.

User bật/tắt memories và ẩn một entry khỏi phần gợi nhớ mà không xóa history. `memoryHidden` nếu lưu cần additive migration và backup; default off cho proactive resurfacing. Hình/export giữ local, user chọn trước khi chia sẻ. **Status: P2 / DECIDE LATER.**

## Acceptance chung trước khi mở rộng

- 320/360/390px một cột, không tràn ngang; buttons ≥44px, keyboard/focus rõ, input labels kết nối.
- Không auto activate/save AI draft, không medical advice, không infer negative activity hay missing macros.
- Edits có validation, history isolation, stale-tab handling và backup roundtrip; migration không wipe arrays.
- User text render textContent; local media giữ IDB owner; không thêm analytics, font/CDN mới hoặc remote API.
- Đo thao tác thực tế trước khi tuyên bố tiết kiệm thời gian; các concept này là giả thuyết có căn cứ, không benchmark hoàn thành.
