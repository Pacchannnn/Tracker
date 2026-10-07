# Tracker V4 — Phase 8A Decision Report

08/10/2026 · **DESIGN / RESEARCH ONLY COMPLETE**. E1/E2 PROPOSED, NOT APPROVED. Phase8B NOT STARTED. App/schema8/dependencies/user data unchanged; no push.

## 1. Baseline đã xác minh

main clean lúc bắt đầu, HEAD `1fc8add` docs; Phase7 code `6c67590`. Fresh `npm test`388/388 với0fail/cancel/skip/todo;69 recursive JS syntax checks pass. Không khác đáng kể so baseline user. Photo DB1/backup1, modules38/styles39. MASTER_PLAN và approved Phase7 contract giữ nguyên.

Không chạy browser/device/restore mới trong8A, không đọc storage của user8765. Audit dùng source/tests hiện tại, browser evidence lịch sử trong V4_IMPLEMENTATION_REPORT.md, research03–04/10 và4 trang MDN/WebKit đọc lại08/10 cho boundaries. Không làm nghiên cứu đối thủ đại trà hoặc dùng private notes/photos làm query.

## 2. Điểm mạnh

- Exact session/slot/set identity, immutable history, guarded writes/recovery, Original/custom/manual mode.
- Meal recents/multi-add/review/copy/snapshot và cookbook đã có, không đề xuất làm lại.
- Journal full-history search trước paging; MyDay/Weekly/Monthly có source links/Back/unknown semantics.
- Backup preview/safety copy/stale guard, photo import không overwrite; local privacy và baseline mobile/keyboard evidence.

## 3. Hạn chế có bằng chứng

Food-library search chưa bỏ dấu như batch; exercise overview chỉ20hiệp; pending food batch memory-only; Gym history chưa paging; metadata scan toàn store và food photo card mỗi card gọi full record list; old progress exercise history group theo tên. Hai file backup không có pair identity/atomic transaction; existing photo IDs được skip dù bytes khác. Offline shell/Safari/phone/large dataset chưa được chứng minh. Chi tiết/anchors/nhãn C/T/O7: [Product audit](PHASE8_PRODUCT_AUDIT.md).

Không gọi static absence là lỗi UX tái hiện, không gọi unbenchmarked scans là app chậm, không gọi unsupported readiness là mất dữ liệu đã xảy ra.

## 4. Giả thuyết UX chưa xác minh

Lặp weight/reps thường xuyên; muốn xem ngày hơn start gym; recents không đủ; thường mất pending khi reload; search behavior gây nhầm; thật sự cần gram/cooked yield/equipment context; muốn reminders/associations. Tần suất/usefulness/action savings chưa đo, không lấy marketing đối thủ làm bằng chứng.

## 5. Ưu tiên và hai experiment đề xuất

| Mức | Hướng | Lý do / điều kiện |
| --- | --- | --- |
| P0 readiness gate | Backup2files + physical-device/Safari/large-data drill | Bảo vệ mọi module; không đo thành công bằng fewer clicks; chưa tự chạy |
| P1 đề xuất1 | E1 fill từ set trong buổi, exact slot | Lát cắt nhỏ trong workflow chính; reuse writer, no schema; chỉ đáng khi lặp thường xuyên |
| P1 đề xuất2 có điều kiện | E2 MyDay Home A/B prototype | Review-day có thể bớt1navigation, nhưng phải giữ Start/Resume và recovery; no permanent Home change |
| P2 sau xác nhận pain | Favorites/pins, grams/basis, cooked yield, pending recovery, shopping, equipment/set types, plan export | Persistent semantics/ownership/cross-module cost cần contract; không chỉ vì đối thủ có |
| Hold | PWA/notifications/associations/AI/cloud/backend | Device/cache/absence/privacy/cost requirement chưa đủ |

Bảng đầy đủ16hướng với9tiêu chí và acceptance/stop/rollback: [Experiment backlog](PHASE8_EXPERIMENT_BACKLOG.md). A01/A02 search/history polish và photo-performance measurement là candidates để user có thể chọn thay experiment, chưa triển khai.

**E1:** explicit button fill weight/unit/reps từ hiệp trước cùng slot, RIR trống và Save riêng. Không overwrite dirty form, copy qua Replace/legacy/history, auto-progress hoặc autosave. So manual và existing history shortcut; stop nếu wrong-source/unit, không giảm effort hoặc cần schema. Rollback bỏ control, logs vẫn8.

**E2:** chỉ disposable opt-in prototype, so Dashboard vs MyDay localtoday; giữ next/resume/planning recovery và nguồn/Back. Không preference persistence, auto empty/0, bỏ Dashboard hoặc auto original-photo read. Stop nếu hại đường tập/recovery hoặc user không thích. Rollback entry Dashboard, records không đổi. Permanent preference/default cần user duyệt riêng sau thử.

## 6. Rủi ro dữ liệu/schema

- Hai experiment hẹp dự kiến no migration. Chỉ proposal, chưa kiểm chứng implementation feasibility bằng code mới.
- Favorite amounts, explicit grams/basis, cooked batch/yield, pending recovery, set/equipment types có thể thêm persistent structure: cần version/migration/backup/import/old-writer contract trước implementation; không lén nhét schema8.
- Recovery phải Resume→fresh review→Confirm, không auto replay stale entries. Snapshot macro/name/unit tại logging giữ nguyên.
- Advanced analytics không lấy exerciseName làm identity/load-equivalence; missing không phải absence, null không phải0; không causal/medical claims.
- Photo backup1 encode whole library/base64/string copies,200MB binary budget khác peakRAM; JSON input10MB/photo file280MB cũng không đảm bảo native quotas. JSON+IDB không pair-atomic, không hứa global Undo.

## 7. Kế hoạch thiết bị thật

Checklist R0–R11 trong audit: disposable origin/profile riêng; desktop browser, Android Chrome, iPhone/macOS Safari nếu có; Files download2files→fresh-origin restore→deep JSON/IDs/owners/bytes/hashes→reload/close/reopen. Kiểm tra keyboard/safe area/accessibility/images/clipboard/WebLocks, invalid/stale/duplicate/collision/orphan/partial failure.

Tải thử S/M/L có measured JSON/binary sizes, cold/warm timings/memory và scan counts, dừng trước giới hạn thiếu storage; không thử phá hủy data thật. Không có thiết bị thì NOT VERIFIED. App localhost phone không trỏ tới PC; transport/HTTPS thử cần user quyết, không mặc định deploy. PWA/update offline drill chỉ thêm sau approval riêng.

Tài liệu kỹ thuật cập nhật đã đọc: [MDN storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [WebKit storage](https://webkit.org/blog/14403/updates-to-storage-policy/), [MDN caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching), [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Đây là boundaries, không xác nhận device Tracker.

## 8. Các quyết định cần user duyệt

| Quyết định | Đề xuất | Chưa có approval |
| --- | --- | --- |
| Có thử E1 không? | Chỉ fill weight/unit/reps; RIR tự nhập, live-only, no autosave | Cần user xác nhận hay gặp repeated sets và duyệt scope |
| Có thử E2 không? | A/B prototype trước; giữ Dashboard/Start/Resume | Cần biết mục đích mở app chính và có muốn đổi landing |
| Thứ tự | E1 trước; E2 conditional, được bỏ | Không tự chọn cả2 khi user chỉ duyệt một |
| Nếu pain chính là mất pending/tìm món | Reprioritize batch recovery hoặc polish/pins sau evidence | Chưa tự thay proposal thành implementation |
| Thiết bị thử và transport | Device/browser đang dùng + disposable origin, không user8765 | Cần biết Android/iPhone/Safari/device availability; chưa xin/đổi OS/browser permissions |
| Permanent Home preference/PWA/schema/AI/cloud | Quyết định tách riêng với contract | Không ngầm được duyệt bởi8A hoặc prototype |

Không có quyết định nào chặn việc hoàn tất tài liệu8A. Approval chỉ cần trước8B/real-device actions có setup hoặc persistence mới.

## 9. Files và Git

Chỉ3file mới PHASE8_PRODUCT_AUDIT.md, PHASE8_EXPERIMENT_BACKLOG.md, PHASE8A_DECISION_REPORT.md và1file sửa V4_ROADMAP.md. Một checkpoint tài liệu local trên main: `Document Phase8A product audit and proposed experiments`. Các logs local ignored; app/tests/schema/dependencies/approved contracts/private sources không staged. Không push/fetch/reset/rebase, không architecture change. Git status final và hash checkpoint báo trong handoff; commit không phải approval experiment.

## 10. Definition of done / stop

- [x] Baseline verified, source/tests/current docs/backlog/research đối chiếu.
- [x] C/T/O7/H/R tách rõ;6module/8audit criteria, limitations và gaps không nhân đôi delivered features.
- [x] Bảng16hướng đủ value/frequency/actions/difficulty/risk/migration/dependencies/testability/rollback.
- [x] Tối đa2proposed experiments với hypothesis/scope/exclusions/measurement/gates/stop/rollback/decisions.
- [x] Backup/browser/device/large-data checklist và known-vs-NOTVERIFIED.
- [x] Roadmap ghi8A DESIGN / RESEARCH ONLY;8B NOT STARTED; code/data giữ nguyên.

**STOP sau Phase8A.** Chờ user chọn/duyệt scope. Không triển khai8B, không push, không tự đổi kiến trúc.
