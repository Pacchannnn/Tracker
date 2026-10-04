# Tracker V4 — implementation roadmap

04/10/2026 · Baseline V3 schema6, 55/55 tests đạt trước thay đổi. User cho phép cải tiến local nhỏ sau nghiên cứu; thay đổi sản phẩm lớn được giữ ở proposal để duyệt. Không yêu cầu remote AI/backend trong giai đoạn này.

**Goal:** giảm thao tác lặp lại và nối dữ liệu của Tracker thành trải nghiệm cá nhân nhất quán.
**Architecture:** giữ Vanilla JS, một JSON versioned và IndexedDB photos. Mở rộng module hiện có theo milestone, dùng derived views khi đủ; chỉ thêm schema khi có persistent structure mới.
**Tech stack:** HTML/CSS/JavaScript, Node test runner, fake-indexeddb chỉ cho test.

## Trạng thái và quy ước

- **RESEARCHED:** corpus 35 sản phẩm, primary sources và user opinions tách biệt; `GLOBAL_APP_RESEARCH.md` và `docs/research/`.
- **PLANNED:** concept/backlog/phase dưới đây; không coi đã có chỉ vì viết roadmap.
- **IMPLEMENTED:** chỉ sau code được thêm; **TESTED:** chỉ khi có command/browser evidence.
- **CURRENT PHASE:** phase 0, phase 1 và phase2 hoàn tất trong phạm vi local đã kiểm chứng; phase3–8 PLANNED / DECIDE LATER.
- **CURRENT STEP:** bàn giao Phase 2; dừng tại đây theo yêu cầu. Phase3 shared exercise picker là bước kế tiếp, chưa triển khai.
- **BLOCKERS:** không có cho scope nhỏ local; các phase lớn cần duyệt product/identity contract.
- **DECIDE LATER:** My Day thành home hay subview; richer mood/catalog; live-edit semantics; backend/AI/provider/privacy.
- **KNOWN LIMITATIONS:** live structural editing chưa có; chưa thử quota thật, backup ảnh lớn, Safari/điện thoại vật lý. Download link trong IAB chưa chứng minh file tải về; clipboard → file → restore đã được kiểm chứng bằng fixtures.

## Ràng buộc chung

Giữ Original Plan và tài liệu riêng. Không wipe dữ liệu, không remote processing/analytics/accounts. Lịch sử dùng snapshots; mutation qua `updateData`/Web Locks và conflict checks. Photos ở IDB; không base64 trong localStorage. Các fields mới bền vững phải tăng schema khi phù hợp, có migration/tests/export/import. Giữ UI giấy và labels tiếng Việt; desktop +320/360/390px, keyboard và clear errors. Không push tự động.

## Phase 0 — research và baseline

- [x] Đọc docs/code, `git status/diff`, chạy 55 baseline tests.
- [x] 11 Gym +12 Nutrition +11 Journal +Gyroscope; Exist không đếm lại.
- [x] Viết report, 30-feature matrices, scored top15, concepts và roadmap.
- [x] Đọc lại daily picker, recipe, journal tag flow để xác nhận gaps.

Done khi nguồn được gắn với claim, feature cũ không bị gọi mới, uncertain/community tách khỏi official. Không có migration/UI change trong phase này.

## Phase 1 — ba cải tiến nhỏ, local và backward-compatible

**Value:** tìm món ngay khi ghi bữa, tính lượng nấu không nhẩm, chọn hoạt động quen thuộc ít gõ. **Depends:** phase 0. **Model/reasoning:** model coding hiện dùng, medium; high nếu xuất hiện persistence conflict. **Schema/migration:** không thêm stored fields, giữ6; scale/search/chip selection là view trước Save.

### 1A. Daily food search

Files: `js/nutrition.js`, `js/app.js:renderFoodEntries`, `tests/nutrition.test.js`.
Interface: `searchFoods(foods, entries, query)` trả food references đã lọc theo name, recent ordering; không mutate input. Unicode normalize chỉ để tìm, không sửa tên đã lưu. Default new entry dùng food gần đây nhất; edit giữ foodId/snapshot hiện có kể cả food đã xóa.

- [x] Test trước: query `dau` tìm `Đậu`, query không match trả []; input order/data không đổi, recent order vẫn đúng.
- [x] Thêm input search vào form, preserve selected nếu còn match, no-results rõ và chặn Save; clear khôi phục choices.
- [x] Browser: empty/no match/normal, selected food và amount đúng, sửa snapshot không ở library qua entry recipe, reload. Không chạy thao tác xóa món trên browser.

Acceptance: gõ không dấu → chọn món → ghi 1.5 phần → totals đúng; query không match không lưu nhầm món cũ. Không thay food/nutrition snapshots khi chỉ search.

### 1B. Recipe cook-size preview

Files: `js/nutrition.js`, `js/app.js:renderRecipes`, `tests/nutrition.test.js`.
Interface: `scaleRecipe(recipe, targetServings)` trả bản clone, scale numeric ingredients theo target/base, giữ `nutritionPerServing`, dùng `recipeTotals` cho batch total. Reject blank/nonfinite/<=0/>100; bảo vệ quantity overflow. Steps/tags/photo owner và source recipe không đổi.

- [x] Tests trước: gốc4, ingredient400g, kcal300/phần → target2 cho200g/600kcal tổng,300/phần; null macro vẫn null; invalid input throws; old snapshots không đổi.
- [x] UI target cook portions trong details, kết quả tại chỗ; reset về base, invalid preview không để stale quantities; giải thích không scale prose/cooking time.
- [x] Browser target2/8/fraction/invalid/reset/reload và log amount1.5 dùng per-serving gốc đúng450kcal; recipe không có macro vẫn không log như đã biết.

Đây chỉ là **nấu ít/nhiều với cùng kích thước một phần**. Chia lại cùng batch hoặc cooked weight ở phase6, không âm thầm gộp vào preview.

### 1C. Recent journal tag toggles

Files: `js/journal.js`, `js/app.js:journalView`, `css/style.css`, `tests/journal.test.js`.
Interfaces: `recentJournalTags(entries, limit=8)` newest-date first, unique case-insensitive; `toggleJournalTag(text, tag)` returns clean comma-list, enforces20tags/40chars. Không đổi stored tags[] shape.

- [x] Tests trước: chronology khác insertion order, case duplicate, unicode, toggle add/remove, giới hạn và không mutate history.
- [x] Chip `aria-pressed` + visible selected state; input edits đồng bộ; click giữ focus ở chip; Save vẫn explicit. Chưa thử bàn phím ảo trên điện thoại vật lý.
- [x] Browser chọn/bỏ/tag tự gõ, invalid save, save/reload; empty history vẫn cho tự nhập, keyboard và narrow screen. Sửa thêm mood cards bị ép chữ dọc.

### Gate Phase 1

- [x] `node --test tests/nutrition.test.js tests/journal.test.js` 11/11 sau red-green; `npm test` toàn bộ60/60.
- [x] JS syntax checks, `git diff --check`, tự review diff; không đổi schema/program/photo logic (photo modules chỉ đổi import query).
- [x] Browser fixtures ở origin riêng8768, không dùng storage8765; mobile320/360/390, error/warn logs[] ở luồng đã thử.
- [x] Update README/DATA_MODEL, TONG_KET/guide và report trạng thái. Checkpoint cục bộ xem Git log; không push.

## Phase 2 — reliability và phục hồi công sức

**Goal/value:** pre-start draft sống qua reload; backup có thể kiểm chứng. **Depends:** phase 1 review, schema design riêng. **Data/UI:** bounded `planningDraft` + prefs/revision/savedAt trong JSON; resume/discard/save-failed card. Backup checklist/paired counts. **Migration:** schema tiếp theo được chốt lúc làm, mặc định null, giữ V1–6 migration/restore; đừng hard-code rằng V4 phải là schema7 nếu chưa đổi model.

Tests: stale two-tab edits, corrupt draft, invalid input retained for recovery, quota error không báo saved, backup roundtrip draft/photos, duplicate import, owner orphan và rollback. Manual: soạn3bài → reload → recover; sửa2tab → conflict rõ; export dữ liệu+ảnh fixtures → restore origin thứ hai → counts/snapshots/owners khớp. Không coi download link là download hoàn tất.

Done: một workflow recover và một restore chứng minh được, kể cả failure path. UI bật saved indicator chỉ sau successful write. Model reasoning high cho persistence.

### Phase 2 implementation contract — 05/10/2026, IMPLEMENTED + TESTED + MANUALLY VERIFIED

Baseline `ed65522`, clean main, schema6,60/60 tests. User đã yêu cầu triển khai Phase 2; task này dừng sau Phase 2.

Minimal design: schema7 thêm `planningDraft: { revision, builder, planner }`. Hai slot độc lập tránh mất Builder khi mở Planner. Slot có savedAt và payload bounded; builder chứa day đang sửa (kể cả strings/invalid input) + source plan snapshot nếu đang sửa custom day. Planner giữ đúng raw preferences của form, result và request fingerprint; đổi input xóa result ngay. Draft không phải plan/session. Dùng updateData/Web Locks, serialize autosaves trong cùng tab, compare envelope trước write và tăng revision; giữ snapshot mong đợi khi tab khác đổi state. Draft corrupt trên disk được giữ nguyên để người dùng export raw/discard; backup import reject corrupt. Missing exercises/plan → cảnh báo và recovery thành one-off, không sửa source. Save/Start + cleanup nằm trong cùng write; failure giữ draft. Không auto-start/auto-activate.

Backup: giữ hai file/data replace + photo add-missing, không giả lập transaction chung. Preview counts bao gồm planning drafts, báo orphan owners, mỗi phần có prepared/restore-success status; download link không chứng minh file đã lưu. Roundtrip fixtures kiểm tra toàn bộ state và photo bytes/metadata; browser dùng origin riêng. Không nâng format ảnh nếu không có field mới.

- [x] 2A `js/planning-draft.js`, data/schema/restore boundary: tests trước cho migration6→7, raw recovery, stale/quota/failure/cleanup/corruption/bounds; run targeted rồi suite.
- [x] 2B Builder/Planner UI: recovery Continue/Discard, raw form autosave, status/retry, invalid/stale draft gate, atomic transition. Test browser3bài/reorder/reload/discard/planner input change.
- [x] 2C Backup confidence/roundtrip: domain fixture + IndexedDB fresh factory, duplicate/orphan/rollback tests; browser export qua clipboard → file thật/import clean origin/compare; download-event IAB không hoạt động, không claim tải link thành công.
- [x] 2D Narrow320/360/390 bằng iframe viewport thực + top-level390, keyboard/runtime, docs + local checkpoint; report IMPLEMENTED/TESTED/MANUALLY VERIFIED/NOT VERIFIED chính xác. No push, no Phase3.

## Phase 3 — shared exercise picker và alternatives rõ hơn

**Goal/value:** thêm/thay bài theo muscle/equipment ngay builder, không ra library. **Depends:** phase2 draft handling và metadata V3. **Data:** filters/selection trước hết in-memory; specific variant definitions thêm riêng, giữ Original IDs. Favorites/profile nếu persistent cần migration riêng. **UI:** shared picker với search/multi-select/count/clearfilters, differences card, accessible move buttons.

Tests: AND filters, selected items khi đổi filter, duplicate prevention, archived exercises, clear/no results, alternative exclusion, no silent prescription/load changes. Manual: Back+Cable → chọn2 → review/add → replace1 → reload → history cũ nguyên. Done: giảm việc đổi màn hình mà giữ rõ selections. Optional content/media phải có license/source, không copy competitor assets.

## Phase 4 — flexible live workout

**Goal/value:** máy bận hoặc đổi ý vẫn tập/log được. **Depends:** phase3, approved slot identity/scoping design. **Data:** session slot IDs trong sets; immutable completed history; existing exerciseIndex compatibility. **Migration:** additive identity mapping cho dữ liệu cũ, validate backup và original/custom sessions; không đổi exerciseName snapshot theo template.

**UI:** “Chỉ hôm nay”, Add/Replace/Reorder, sau hoàn thành có giữ riêng hoặc save-as-new-template; update source template qua diff và confirmation riêng. Cần chọn contract replace bài đã log: giữ slot cũ và thêm slot mới, hay chỉ cho replace chưa log.

Tests: logset→reorder→name/ID không nhầm; replace sau partiallog không mấtset; source template deleted/stale; cancel/save/reload/exportrestore; one-off không advance activeplan. Manual: bắt đầuplan → log1set → đổi bài chưa tập → complete → copytemplate → verify oldplan/history. Done khi mọi change scope minh bạch; không được tự activate plan.

## Phase 5 — My Day và journal retrieval

**Goal/value:** một trang theo date để nhìn cả ngày, tìm nhật ký cũ. **Depends:** user chọn home/subview, phase 1 capture. **Data:** derived join từ existing arrays/IDB metadata, chưa cần schema; activity catalog/energy là milestone khác. **UI:** dates, cards, source-links, local text/tagsearch, paging hơn30entries, photo-only days.

Tests: leap/month/year/timezone boundary, future/empty day, multi workouts/checkins, missing nutrition/photo read errors, independent sources. Manual: chọn ngày cũ → mở food/gym/journal đúngngày → sửa nguồn → summary cậpnhật; clearfilters giữ dữ liệu. Done: không tạo/duplicate records chỉ vì xemngày, không cascade delete sang cácdomain khác.

## Phase 6 — faster food reuse và cookbook

**Goal/value:** bữa nhiều món và công thức thường nấu ít thao tác. **Depends:** phase 1 search/scale; phase2 safety. **Data:** optional favorites/portionbasis + pendingbatch, mỗi loggeditem snapshot; add schema migration từng milestone. **UI:** pinned/recent theo meal → multiadd review → commit count; selectivecopy, recipe search/duplicate/cookingmode.

Tests: double-submit batch, exact itemcount, date/meal retained, deletedfood, stale favorite, nullmacro, grams chỉ khi explicit mapping, unit invalid, historical snapshots. Arithmetic yield repartition phải giữ batchtotal, cookedgrams phải có measuredW. Manual: chọn3món → sửaamount1 → saveonce → reload3items; recipe edit/delete không đổi bữa trước. Shoppinglist làm sau, giữ scale và provenance.

## Phase 7 — weekly life review và monthly memories

**Goal/value:** tìm lại dữ kiện có ích từ dữ liệu đã ghi. **Depends:** phase5 + agreed missing-data/mood semantics; richercatalog optional. **Data:** derived periodsummary; hiddenmemory/highlight flags nếu persist cần migration; không reinterpret legacy `drained`. **UI:** coverage/mooddistribution/activities, sources, photo highlights do user mở/chọn.

Tests: denominators journal/mood/nutrition riêng, same-date dedupe, sparse sample, emptyweek, chronological order, unknownmuscle bucket, hiddenmemory không xóaentry. Manual: fixture4journal/3mood/2fooddays phải hiển thị chính xác; không báo “tuần tốt/xấu” hoặc medical cause. Done: mọi số truy về records được và unknown không thành0.

## Phase 8 — experiments và quyết định ngoài local

Notifications/PWA, advancedsettypes, equipmentprofiles, grams, associations, importers theo backlog. Mỗi experiment cần một câu hỏi usability và stop condition khi không giảm effort. Associations cần present/absent/unknown và sample window trước code; không có ngưỡng nhỏ nào tự chứng minh causation.

Remote AI/cloud/backend **DECIDE LATER**: provider, server keys, exactdata, cost, retention, offline/manual fallback, account/deletion, storage. Không triển khai trong research này. Chỉ nghiên cứu deployment sau nhu cầu đa thiết bị và backup được chứng minh.

## Evidence log

- 04/10 pre-change: npm test55/55, không thay appcode trong lúc thu thập corpus.
- 04/10 post-change: 60/60 tests, JS syntax và diff checks đạt; browser search/scale/tags/save/reload/mobile đã chạy. Bằng chứng và các test chưa thực hiện: `V4_IMPLEMENTATION_REPORT.md`.

- 05/10 Phase 2: baseline60/60 →74/74; schema6→7 additive. Builder3bài/reorder/raw blank/reload/Continue/Discard; Planner result reload/input invalidation; Start/Save cleanup; two real tabs conflict. Paired backup8770→8771 giữ toàn bộ JSON +3 photo metadata/owners/blob/thumbnail bytes. Narrow iframe320/360/390 không overflow. Code checkpoint7c41470; full evidence/limits trong V4_IMPLEMENTATION_REPORT.md. STOP, không Phase3/push.
