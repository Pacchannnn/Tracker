# Tracker V4 — Phase 8A Product Audit

08/10/2026 · **DESIGN / RESEARCH ONLY**. Không triển khai experiment, sửa app/tests/schema/dependencies hay dữ liệu. Không push. Audit phục vụ lựa chọn của một người dùng, không phải checklist sao chép đối thủ.

## 1. Baseline và cách đọc bằng chứng

- Git đầu phiên: main sạch, HEAD `1fc8add` (docs Phase7), code `6c67590`. Đây là baseline đúng, không có sai khác đáng kể.
- Chạy mới `npm test`: **388/388**,0 fail/cancel/skip/todo. Log local: `.local/phase8a-baseline.txt`.
- Chạy `node --check` trên js/tests đệ quy: **69/69** đạt, bao gồm module fixture. Schema8, JSON `vshape-tracker`, IndexedDB `tracker-photos/photos` DB1, photo backup1.
- Đọc roadmap/report/model, source các module và tests liên quan; master prompt ở thư mục outputs gốc (không có bản tại repo). Không cần trích thông tin sức khỏe riêng để audit sản phẩm.
- Không chạy browser/restore/seed mới trong Phase8A. Không truy cập origin người dùng để thử thao tác. Bằng chứng desktop/mobile/browser bên dưới là QA Phase1–7 đã ghi trong report, không phải kiểm tra thiết bị mới hôm nay.

| Nhãn | Ý nghĩa |
| --- | --- |
| C | Xác minh từ code ở baseline; không đồng nghĩa đã quan sát người dùng |
| T | Test tự động có trong suite vừa chạy; chỉ chứng minh tình huống được mô hình hóa |
| O7 | Quan sát browser Phase7 hoặc milestone trước, dẫn từ implementation report; có ngày/phạm vi |
| H | Giả thuyết UX/tần suất/lợi ích; phải đo trước khi kết luận |
| R | Tài liệu kỹ thuật bên ngoài, không phải kết quả chạy Tracker |

388 tests không chứng minh mọi thao tác UI, mọi browser hay độ bền storage trên thiết bị thật. Test dùng fake-indexeddb không chứng minh native quota/eviction/power loss.

## 2. Điểm mạnh nên giữ

1. **Gym dùng snapshots và exact ownership:** custom plans/manual builder/local planner, live Add/Remove/Reorder/Replace, previous performance, focus mode/timer. Template thay đổi không đổi history; legacy mơ hồ không tự đoán. Session queue/revision/full baseline/epoch/Web Locks chặn stale writers. C/T: session-runtime, session-identity, session-readers, session-structure và bộ tests tương ứng.
2. **Nutrition có workflow tái sử dụng thực sự:** search không dấu trong logger/batch, recent theo bữa, multi-add/review/one commit, selective copy snapshot, saved meals, cookbook search/duplicate/Cooking. Không cần tạo lại các feature này. C/T: nutrition-batch, nutrition, cookbook và tests.
3. **Journal tìm toàn bộ trước paging:** text/thẻ không dấu, exact ALL tags,30→60→90; editor nguồn và Back kết quả. Mood/tag optional, không ép ghi đủ. C/T: journal, journal-retrieval-ui, tests/journal-retrieval.test.js.
4. **My Day/Weekly/Monthly liên kết dữ liệu:** summaries dẫn xuất, nguồn đúng ID/date/owner; missing/unknown/zero/unavailable tách biệt theo contract của từng view. C/T: my-day, life-review, life-review-source, các UI/tests. O7: nguồn/Back/dirty/async/zero writes đã kiểm tra.
5. **Backup có kiểm tra và nói đúng trạng thái:** hai file riêng, preview, bản sao an toàn trước JSON restore, stale preview rejection; photo import thêm ID thiếu, không overwrite. Link tải không được gọi là file đã tải thành công. C/T: data/photo-backup/photo-store và reliability tests.
6. **Scope/privacy:** Vanilla JS, local JSON + IDB, font local, safe text, không tự điều chỉnh MASTER_PLAN hoặc gửi ảnh/nhật ký sang AI. O7: mobile320/360/390/keyboard và external-request probes đạt trong phạm vi đã ghi.

## 3. Audit theo module

| Module | Hiện có / mức hoàn thiện | Thao tác và truy hồi | Desktop/mobile / nhầm lẫn cần xem xét | Recovery, tăng dữ liệu, liên kết |
| --- | --- | --- | --- | --- |
| Gym | C/T: Original/custom plans, library, builder/local draft planner, structured live edits, history snapshots; phạm vi Phase4 hoàn tất | C: mỗi hiệp mới có weight/reps/RIR trống; quick-fill lấy buổi trước, không phải hiệp vừa lưu. History có ngày-source nhưng danh sách thường không có paging/search | O trước: narrow/keyboard đã qua milestone; H: nhập lại cùng tải mất công; H: chữ “occurrence/ownership” có thể khó hiểu với người dùng | C/T: saved draft/quota/stale/history-copy recovery tốt. C: history render mọi session; không đo ngưỡng chậm. Equipment context chưa structured; không thêm advanced types nếu chưa dùng |
| Nutrition | C/T: foods/recipes/photos, daily log, saved meals, batch/review/copy, cook preview | C: recents ưu tiên meal, tối đa6; lượng mặc định1, chỉnh ở review. Library accent behavior khác batch. Copy-day toàn bộ và selective-copy cùng tồn tại có scope khác | O Phase6:3 widths/keyboard đạt; H: user nhầm cook-size với lượng ăn; labels hiện tại đã phân biệt. Favorites chỉ hữu ích nếu recents/search không đủ | C/T: batch save atomic/failure giữ review khi tab còn sống. C: pending chỉ memory, reload mất. Food cards tạo nhiều photo-store scans. Chưa có grams mapping/yield/shopping |
| Journal & Photos | C/T: daily entry/mood/tags, calendar, search/thẻ/paging, photo CRUD/owners | C: search text/thẻ journal; không phải tìm toàn bộ photo caption/cardio/nutrition. Một entry/ngày; photo-only vẫn được MyDay/Monthly thấy | O trước: narrow/keyboard; H: lựa chọn Calendar/Timeline/Photos + MyDay làm người dùng phân vân. Không có usability study chứng minh | C: nguồn editor có dirty guards khi điều hướng; draft journal không persist. Normal gallery lấy tất cả photo records/tạo URL gốc; Monthly dùng metadata+explicit selected reads. Không thể gọi mọi photo view là metadata-only |
| Tiến độ | C/T: check-in CRUD,4 tuần overview, exercise history, Weekly/Monthly closed derived views | C: overview exercise history giới hạn20 hiệp, tìm theo exerciseName; Weekly/Monthly exact refs đọc được nguồn khác | O7: empty/future/errors/Back/races/mobile đạt. H: Tổng quan/Tuần đã ghi/Ký ức tháng có thể khó chọn, nhưng mục đích khác nhau; chưa nên gộp | C: không persist summary, tốt cho rollback; snapshot/unknown safeguards ở Life Review không tự áp dụng lên mọi phép analytics cũ. Tránh dùng nhóm theo tên làm PR hay equipment comparison |
| My Day / Home | C/T: MyDay là subview dẫn xuất; Dashboard có next workout, draft recovery, nutrition/checkin/shortcuts | C: startup Dashboard→Xem ngày cần1 navigation action. MyDay→nguồn→Back hoạt động. Dashboard có lợi thế start/resume training trực tiếp | O Phase5/7: nguồn/mobile/Back đã thử. H: MyDay làm Home có thể tốt cho review ngày, nhưng có thể làm start gym chậm hơn | C: selected date/return memory-only, reset sau reload. Không cần entity mới để thử view; persistent Home preference là quyết định riêng |
| Backup & Recovery | C/T: JSON8 + photo1 separate export/preview/import, clipboard fallback, baseline guards, duplicate skip, partial statuses | C: prepare rồi download/copy; phải giữ hai file và xác nhận file ngoài app. Không có package pair ID/atomic cross-store generation | O Phase2: paired restore synthetic giữ IDs/bytes; O7: readonly backup equality. Chưa có Safari/phone/large file certification; H: user có thể chỉ giữ một file | C: JSON limit10MB input; image file280MB input/binary200MB; memory copies/base64. Restore JSON replace, photo import add missing; không phải mirror/sync. Không có durable completion receipt/encrypted backup |

## 4. Hạn chế có bằng chứng và mức hành động

| ID | C/T/O đã biết | Điều chưa được phép suy ra | Hướng xử lý sau duyệt |
| --- | --- | --- | --- |
| A01 | C: `js/app.js:639` library dùng lowercase includes; `js/nutrition.js:13` searchFoods bỏ dấu/đ; batch dùng searchFoods | Chưa có số lần user tìm thất bại | Candidate polish cùng semantics search; không tạo food catalog mới |
| A02 | C: `js/app.js:1179` overview chỉ render history.slice(0,20), không LoadMore tại đó | Không có nghĩa history bị xóa; Gym history còn records | Paging/filter nếu nhu cầu tìm xa được xác nhận |
| A03 | C: `js/nutrition-batch-ui.js:10` state memory; successful commit mới persist entries; reload mất pending | Chưa biết user reload/crash batch thường xuyên | Recovery contract bounded, fresh-source review/explicit resume trước Save; cần quyết định persistent/schema riêng |
| A04 | C: `js/session-ui.js:100` hiệp mới trống, previous quick-fill từ history | Không chứng minh mọi hiệp đều nhập lại; quick-fill/keyboard hiện tại có thể đủ | Experiment E1, không mặc định prefill/autosave |
| A05 | C: `js/nutrition-photo-ui.js:31` mỗi card listPhotos/getAll; `js/app.js:642` render các food cards. C: normal gallery app:1071 tạo thumbnail/original URLs cho records hiển thị | Chưa benchmark, chưa khẳng định leak/chậm/OOM. Lazy img không loại getAll/URL creation | Đo số scans/read records/memory theo N cards×P photos trước refactor. Không đổi photo backup/ownership để “tối ưu” |
| A06 | C: `js/photo-store.js:116` metadata cursor toàn store; journal query filter/sort toàn history trước paging; Gym history không paging; updateData clone/serialize toàn JSON | Chưa có ngưỡng dữ liệu lỗi hoặc cần backend | Checklist large-data; tối ưu cục bộ nếu đo được bottleneck |
| A07 | C/T: export2files riêng, addMissingPhotos skip mọi ID đã có; JSON/IDB không transaction chung | Không coi import ảnh là khôi phục byte-exact trên DB có ID khác bytes; không chứng minh hai file khác thời điểm đồng bộ | Fresh-origin drill; same-ID/different-bytes must report expected skip. Pair/checksum contract là candidate, chưa đổi format |
| A08 | C: `progress.exerciseHistory` group theo exerciseName, giữ kg/lb nguyên; chưa equipment profile | Không khẳng định dữ liệu sai. Không so loads/PR giữa tên trùng hoặc máy khác | Equipment/load convention trước advanced performance analytics |
| A09 | C: không manifest/service-worker registration/notification/storage.persist integration trong app hiện tại | Local data tồn tại không chứng minh reload offline; không hứa PWA ngăn eviction | Readiness và update-cache contract trước PWA; in-app reminder trước remote push |
| A10 | C: backlog/product ideas có status PLANNED từ04/10 cho features đã hoàn tất, hoặc broader proposals chưa làm | Không dùng các status lịch sử để suy baseline feature thiếu | Phase8 docs này + roadmap/report mới nhất là đối chiếu hiện tại; không sửa các research nguồn trong8A |

O7 riêng: cold iframe QA timeout/cache asset cũ đã từng quan sát; warm repeated/standalone qua kiểm tra. Nguyên nhân toàn bộ timeout chưa được xác minh, không ghi là lỗi production tái hiện. Selected-tab hover contrast đã sửa ở Phase7, không còn là feature cần làm.

## 5. Những giả thuyết cần người dùng kiểm tra

- H1: thường nhập cùng tải cho nhiều hiệp trong cùng slot → E1 có thể giảm nhập; hỏi/đo tần suất, không auto tăng tải hay copy RIR mặc định.
- H2: thường mở app để xem ngày hơn là start/resume gym → E2 có thể bớt1 navigation action, nhưng phải đo cả đường tập.
- H3: recents6/search vẫn mất công tìm món quen → pins có giá trị; nếu không, chỉ thêm clutter.
- H4: thường mất pending food/journal do reload/đóng tab → recovery đáng ưu tiên hơn E2; chưa có số liệu mất effort thật.
- H5: người dùng không hiểu vì sao cùng query không dấu hoạt động ở batch nhưng không ở library → A01 là khác biệt code, tác động UX chưa đo.
- H6: thật sự cần log grams/cooked yield hoặc dùng nhiều máy có tải không tương đương → hợp thức hóa metadata mới; không suy nhu cầu từ app đối thủ.
- H7: muốn reminders/associations hơn việc ghi đơn giản → cần opt-in và mô hình missing/absence trước; hiện chưa có bằng chứng.

Đo thủ công tại thiết bị, không analytics upload: mục đích mở app, actions/field edits, thời gian, sửa sai/backtrack, failure/lost draft. Không chép notes/photos/health values vào log nghiên cứu; chỉ task ID và số đo.

## 6. Đánh giá platform / AI / analytics

**PWA/offline:** cache shell/module/font có thể giúp mở lại khi server/network không sẵn, nhưng thêm service-worker lifecycle và old/new writer mismatch. Chưa cần framework/backend. Manifest/install không tự là offline guarantee; app cache tách khỏi user data. Tài liệu [MDN caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching) giải thích service worker/Cache responses; không chứng minh Tracker đã offline.

**Storage reliability:** durability theo origin/profile. Persist là request có thể không được duyệt; không thay backup hoặc bảo vệ khỏi user xóa site data. [MDN quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) đọc lại08/10. Không áp quota disk chung cho localStorage, và không dùng số quota lý thuyết để hứa backup lớn chạy được.

**Notifications:** không scheduler đúng giờ mặc định khi app đóng. WebKit mô tả Web Push iOS/iPadOS cho Home Screen apps với user gesture/permission; push có hạ tầng giao nhận ngoài thiết bị, cần quyết định privacy riêng. Thử nhắc trong app trước nếu user cần. [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) là tài liệu nền tảng, không test iPhone của user.

**Associations:** tag không có không đồng nghĩa không làm; không có food log không đồng nghĩa ăn0; zero vẫn là số thật khi được ghi. Cần present/explicit absent/unknown và sample/window/denominator riêng. Hiển thị mô tả cặp observations, không kết luận nguyên nhân, diagnosis hay ranking best activity. Mood meanings cũ không được reinterpret; richer absence model có thể cần migration.

**AI/backend/cloud:** chỉ có lợi ích khi manual/local planner không đáp ứng hoặc cần nhiều thiết bị. Remote planner cần server/service giữ key, structured minimum preferences/catalog, output draft+validation, manual/offline fallback. Không gửi journal/photos/knee/history mặc định. Provider retention/region/cost chưa chọn nên UNKNOWN, không gán giá hoặc cam kết privacy. Cloud cần auth, conflict/IDs/photos, delete/export, encryption/backup và chi phí vận hành; Flask/SQLite chỉ là lựa chọn sau requirement, không lệnh migration. Local deterministic filtering đã phục vụ nhiều phần. Không thêm remote dependency trong8A.

Research35 sản phẩm từ GLOBAL_APP_RESEARCH.md và docs/research là pattern tham khảo ngày03–04/10, không proof of Tracker usefulness hay xác minh lại mọi tính năng đối thủ hôm08/10. Không nghiên cứu rộng lại chỉ để thêm ý tưởng.

## 7. Backup & real-device readiness — kế hoạch, chưa chạy

### Đã chứng minh / chưa chứng minh

| Bằng chứng hiện có | Giới hạn |
| --- | --- |
| T: JSON parse/migrate/restore roundtrip, bad import/stale baseline/quota mock giữ state | Không chứng minh native storage quota/power loss hoặc file tồn tại ở Files app |
| T: photo1 encode/decode JPEG/metadata/owners/bytes; batch abort/no overwrite IDs | JPEG signature validation không phải bảo đảm mọi decoder xử lý mọi file; fake IDB khác native |
| O Phase2: paired fixture restore qua origins riêng | Không phải cross-store atomic restore; không chứng minh người dùng đã giữ đủ2files |
| O7: read-only JSON/meta/original/thumbnail/backup equality, absentDB, source guards | Không phải mới chạy manual complete photo restore trên phone/Safari |

### Checklist chạy khi được duyệt riêng

- [ ] R0: ghi OS/device/browser/version/profile/origin/mode, viewport/safe-area/font zoom và kích cỡ fixture. Dùng hostname/port/profile thử riêng, ghi rõ disposable. Không dùng `127.0.0.1:8765` của user. localhost trên phone không trỏ về PC; chọn transport local/HTTPS thử sau khi user duyệt, không deploy công khai hay upload private files.
- [ ] R1: desktop Chrome/Edge hiện dùng, Android Chrome thật, iPhone Safari và macOS Safari nếu có. Không có thiết bị thì ghi NOT VERIFIED; emulator không thay physical test. Kiểm tra Web Locks, IndexedDB, clipboard, image decode bằng workflow, không suy compatibility từ user-agent.
- [ ] R2: bàn phím số kg/lb/RIR, virtual keyboard che Save/nav, rotation, safe area,200% zoom, VoiceOver/TalkBack focus/labels, range errors. Start/set/save/reload/history; meal batch; journal; MyDay/source/Back; Weekly/Monthly/photos trên fixtures.
- [ ] R3: prepare/download JSON và ảnh; kiểm tra cả2file trong Files/Downloads, mở parse/count/ownerIDs; ghi byte sizes. Clipboard fallback khi tải lỗi. Cancel/share sheet không được coi downloaded. JPEG/PNG/WebP upload→compressed JPEG; HEIC hiện không được hỗ trợ, phải thông báo/chuẩn bị file hợp lệ, không tự thêm converter.
- [ ] R4: fresh disposable origin B restore JSON rồi ảnh; so deep JSON và normalized exportedAt, counts, settings, drafts, session slot/set IDs, nutrition snapshots, metadata/ownerIDs và hashes original+thumbnail. Reload/close/reopen xác minh. Không xóa origin A cho tới khi B đối chiếu đạt.
- [ ] R5: repeated photo import phải skip, không overwrite; synthetic same-ID/different-bytes phải giữ existing như contract. Orphan owner không tạo food/recipe. Malformed/future schema/truncated JPEG/duplicate IDs/stale preview bị từ chối, state giữ nguyên; chỉ tạo failure fixtures disposable.
- [ ] R6: ghi rõ partial state: JSON restore thành công nhưng photo import thất bại thì phần JSON đã thay; không báo pair complete và không chạy JSON restore lặp lại vô thức. Retry ảnh sau review; bản sao của cả2store trước đó là recovery, không hứa Undo toàn app.
- [ ] R7: background/lock/reopen/refresh/server unavailable trên native browser. Ghi riêng retained saved data và loadable shell. Private profile thử riêng có dữ liệu disposable; không coi private storage như archive bền vững.
- [ ] R8: S:250 ngày/50foods/20recipes/100photos≤10MB; M:3 năm/1500sessions/25ksets/10kmealentries/200photos≤50MB; L:5 năm/3000sessions/60ksets/25kentries/500photos tổng150–190MB. Đây là tải thử đề xuất, không dung lượng đã chứng minh. Sinh data hợp lệ, ghi kích cỡ JSON thực tế; dừng trước khả năng storage/file giới hạn, không ép ghi khi thiếu dung lượng. Original+thumbnail cùng tính trong image budget.
- [ ] R9: đo search input/render/History/Monthly/food-card scans, reads/URL lifetimes, export peak memory/time/file completion/import;3–5 lượt cold/warm/device. Mục tiêu khảo sát ban đầu: search median≤300ms, view≤1s trên M; user duyệt lại theo device. Không gọi đây là performance contract đã đạt. Reject limit giữ state tốt quan trọng hơn cố tạo backup lớn.
- [ ] R10: file input JSON>10MB, ảnh>280MB hoặc decoded images>200MB phải reject sớm/theo validator; near-limit chỉ chạy nếu device memory dư. Base64/multiple strings/Blob tăng peak memory so với binary; không giả định dùng chỉ200MB RAM. Không chạy quota-fill/power-loss/destructive tests trên dữ liệu thật.
- [ ] R11: nếu PWA được duyệt về sau, thêm cold airplane launch/update N→N+1/offline stale tabs/rollback cache không xóa user storage; chưa đăng ký SW/persist/notification hôm nay.

**Go:** file tải thật + fresh-origin deep restore + core workflows/large-M không mất dữ liệu. **No-go:** chỉ có link tải, restore mismatch/overwrite/stale success, saved status sai hoặc crash mất effort không có backup. Dừng, ghi evidence; không giải quyết bằng wipe hoặc mở cloud mặc định.

## 8. Kết luận audit

Không có regression baseline mới trong suite. Các hạn chế A01–A10 có căn cứ khác nhau; H1–H7 chưa phải vấn đề UX đã xác minh. Ưu tiên thử hai thay đổi hẹp, không persistent schema: E1 quick-fill từ hiệp vừa lưu cùng slot và E2 prototype MyDay làm Home tùy chọn. E2 chỉ hợp lý nếu nhu cầu review ngày là thật; backup readiness là gate riêng, không experiment thứ3. Phân tích/ưu tiên chi tiết: [PHASE8_EXPERIMENT_BACKLOG.md](PHASE8_EXPERIMENT_BACKLOG.md). Quyết định cần duyệt: [PHASE8A_DECISION_REPORT.md](PHASE8A_DECISION_REPORT.md). **STOP8A, chưa8B.**
