# Tracker V4 — implementation roadmap

04/10/2026 · Baseline V3 schema6, 55/55 tests đạt trước thay đổi. User cho phép cải tiến local nhỏ sau nghiên cứu; thay đổi sản phẩm lớn được giữ ở proposal để duyệt. Không yêu cầu remote AI/backend trong giai đoạn này.

**Goal:** giảm thao tác lặp lại và nối dữ liệu của Tracker thành trải nghiệm cá nhân nhất quán.
**Architecture:** giữ Vanilla JS, một JSON versioned và IndexedDB photos. Mở rộng module hiện có theo milestone, dùng derived views khi đủ; chỉ thêm schema khi có persistent structure mới.
**Tech stack:** HTML/CSS/JavaScript, Node test runner, fake-indexeddb chỉ cho test.

## Trạng thái và quy ước

### Historical Phase 4B-4 execution — 05–06/10/2026 (IMPLEMENTED / TESTED; STOP)

Approved4A contract + explicit4B-4 request define this milestone. Verified clean main08e533f, schema8,180/180 tests. Continue on main; local code/docs checkpoints, no push.

1. [DONE] Replace runtime + tests: remaining from exact source ownership; accepted raw source prescription retained (including ranges/unilateral/unknown); new candidate notes/setup; atomic close+successor, cap100, insert-after/link, chain/Remove/corrections. Depends4B-3. Model GPT-6.1-sol/high. Done: zero/partial/edited/complete/chain invariants pass.
2. [DONE] Shared Picker live Replace review + existing dirty gate; current/active exclusions, edited N new sets, fresh review after Save, successor focus, link-based live/history labels. Depends1. Same model/high. Done: no Builder semantic change or copied performance/setup.
3. [DONE] Full queue/multitab/candidate/quota/backup/consumer/source regression; actual browser A–I +320/360/390/keyboard using synthetic origin only. Depends1–2. Same model/high. Done: critical stale remaining2→1 rejects, no half-close, old/new ownership exact.
4. [DONE] Independent review/fixes, fresh full tests/syntax/diff; update evidence/docs/private summary, code/docs checkpoints. Depends1–3. Same model/high. Mark Phase4 implemented/tested only after all30 gates pass. STOP before Phase5 My Day.

Risks: never reuse old slot identity or transfer sets; candidate/source review must remain exact through queue/lock; no target0, schema9, Undo, template promotion, source edits or backend/AI.

Results:180→197/197 tests,47 JS syntax checks and clean diff;17 new groups, original180 assertions retained. Browser A–I synthetic8778, two actual tabs remaining2→1 stale/review/retry, opposite stale log, injected storage failure exact state, actual export old-set/source isolation and chain restore.320/360/390 iframe picker/review/edited target/dirty/error/history; successful successor focus at each width,48px Confirm above nav. Review fixed decimal/whitespace timer parsing and preserved untouched imported prescriptions. Standalone console clean; iframe harness observer error recorded as limitation. Code61de602; separate docs checkpoint. All30 gates passed; Phase4 IMPLEMENTED / TESTED. STOP before Phase5 My Day.

### Historical Phase 4B-3 execution — 05/10/2026 (IMPLEMENTED / TESTED; STOP)

Approved contract/user request is the design; no new product decision. Baseline clean main74d9dac, schema8,167/167 tests. Inline execution on user-selected main; no push.

1. [DONE] Runtime structural commands/tests: live structured-only availability, accepted definition/prescription/setup snapshots, atomic multi-Add/cap100, Remove tombstones, active-position Reorder. Files js/session-structure.js, js/session-runtime.js, tests/session-structure.test.js. Red→green: command Add appends two slots but no sets; Remove preserves logs; Reorder swaps active order only. Model GPT-6.1-sol/high.
2. [DONE] Extend same Shared Picker with optional prescription review; integrate live UI and reuse dirty-form/save/block/pending helpers. Files js/exercise-picker-ui.js, js/live-workout-ui.js, js/session-ui.js, js/app.js. Depends1. Dirty valid/invalid Back/Save/Discard, no auto structural replay after Save; history has no controls; focus/timer stable. Same model/high.
3. [DONE] Race/quota/immutable intent/backup/progress/source isolation tests; full regression. Depends1–2. Actual browser A–H/all-inactive/two-tab on separate synthetic origin;320/360/390 and keyboard. Same model/high.
4. [DONE] Independent read-only review, fixes, fresh tests/syntax/diff, implementation evidence/docs and separate local code/docs checkpoints. Depends1–3. Done only when all24 user invariants pass; final32-item report. Same model/high.

Risk controls: no history structural mutation; no legacy guess or >100 truncation; candidate changes reject whole batch; slots/sets never reorder physically; other dirty forms retain existing block behavior. Schema8 stays8. STOP before4B-4 Replace; no template promotion/catalog expansion.

Results:167→180/180 tests;46 JS syntax checks and clean diff. Browser A–H/all-inactive on synthetic8776; actual two-tab stale Add/Remove/Reorder/log, explicit reviewed retry; final history and clipboard→file→preview→restore deep equality. Actual iframe320/360/390: client/scroll305/305,345/345,375/375; standalone warn/error logs empty. Review fixes: strict captured structural baseline at queue execution, downstream structural stale rejection, boundary focus fallback, number badInput dirty detection and focus after gate Save. Asset26. Code fe3f8b9; separate docs checkpoint. Photos/schema unchanged. No push.

### Historical Phase 4B-2 execution — 05/10/2026 (IMPLEMENTED / TESTED; STOP)

Verified baseline: clean main54d0fa5, schema8,136/136 tests. Approved4B-2 only:
1. [DONE] Runtime command/store tests → atomic Start/legacy activation, exact set writers, revision/full-baseline guards and same-tab queue/epoch.
2. [DONE] Canonical focus/readers and explicit previous-occurrence selection; history baseline CAS/copy recovery tests.
3. [DONE] Replace4B-1 compatibility bridge with guarded runtime UI; keep Phase2/3/source templates unchanged.
4. [DONE] Full/syntax/diff checks; synthetic browser flows A–G;320/360/390 affected UI; docs and separate local code/docs checkpoints.
Risks: old live/history drafts have no provable baseline; ambiguous records must stay legacy; queued commands must not replay after restore; revision alone cannot detect old writers/restored state. Schema stays8. STOP before4B-3/4; no push.

Results:136→167 tests pass;43 JS syntax/diff checks; browser A–G on8774, real two-tab stale/CAS source changed/deleted, metadata/reload, unknown/ambiguous recovery, Phase2/3 regression and320/360/390 no overflow. Review fixes: prevent dirty-form loss and require occurrence selection when a duplicate has no saved sets. Asset23; no schema/photo changes. Separate local code/docs checkpoints; no push.

### Historical Phase 4B-1 execution — 05/10/2026 (IMPLEMENTED / TESTED; STOP)

Baseline verified: schema7, 82/82 tests, clean main at df8418a. Approved scope:
1. [DONE] Identity helpers + strict validators; deterministic legacy candidates and explicit ambiguity.
2. [DONE] Additive7→8 (no runtime enrichment), backup dual generations + historyEditBase foundation.
3. [DONE] Minimal read-only bridge for imported structured/non-null-baseline records; old live writers stay legacy.
4. [DONE]82→136tests,38JS syntax/diff checks; synthetic8773 Original/custom/one-off/reopen/Builder/picker/backup regressions;360px bridge; docs/checkpoints.
Risks: cached v7 rejects v8; index writers must never receive an activated structure; ambiguous old records cannot be guessed; history baseline CAS remains pending. STOP before 4B-2.

- **RESEARCHED:** corpus 35 sản phẩm, primary sources và user opinions tách biệt; `GLOBAL_APP_RESEARCH.md` và `docs/research/`.
- **PLANNED:** concept/backlog/phase dưới đây; không coi đã có chỉ vì viết roadmap.
- **IMPLEMENTED:** chỉ sau code được thêm; **TESTED:** chỉ khi có command/browser evidence.
- **CURRENT PHASE:**0–5 IMPLEMENTED / TESTED in verified local scope; schema8;231tests/53syntax. All29 Phase5B gates passed.
- **CURRENT STEP:** bàn giao5B Journal Retrieval; STOP trước Phase6. IN PROGRESS: none.
- **BLOCKERS:** none in5B scope. KNOWN BUGS: no remaining retrieval bug in exercised flows; detached-chip focus and selected-hover contrast fixed. Current5B harness/standalone warning/error captures empty; historical observer attribution remains unproven.
- **DECIDE LATER:** whether My Day later becomes Home; richer mood/catalog; backend/AI/provider/privacy. Phase6 needs a separate task and bounded scope.
- **KNOWN LIMITATIONS:** iframe harness observer error; chưa thử quota thật, backup ảnh lớn, Safari/điện thoại vật lý. Download link trong IAB chưa chứng minh file tải về; clipboard → file → restore đã được kiểm chứng bằng fixtures.

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

### Phase 3 implementation contract — 05/10/2026, IMPLEMENTED / TESTED

Baseline764f225, clean main, schema7,74/74tests. Reuse the current catalog IDs/MUSCLES/PATTERNS/EQUIPMENT, primary-muscle matching and alternativesFor ranking. No new catalog, schema, backend or Phase4 identity changes. Skill design/implementation plan lives here per user preference; proceed inline under the existing implementation authorization.

Choose an inline picker rather than a modal (less focus-management complexity) or a separate library route (would interrupt Builder). `js/exercise-picker.js` owns shared pure search/filter/selection/add/replace/comparison helpers; `js/exercise-picker-ui.js` owns one DOM component for both modes. Library consumes the same filter helper. Search is accent-insensitive; primary muscles follow existing Back/Shoulders expansion. Search/muscle/equipment/pattern combine with AND. Picker filter options derive from active catalog metadata; no equipment still appears with no equipment filter, and UI says metadata missing. Existing custom editor requires equipment.

Add: multiple pending IDs in selection order, kept across filters, already-in-workout disabled, explicit review/count/Confirm. Replace: single pending ID, current/existing IDs blocked, existing alternatives ranking first within filtered candidates; display actual shared-primary/pattern/equipment/notes, no biomechanics claims. Preserve slot ID/order/sets/reps/RIR/rest and replace setup notes by new definition, explicitly preview old/new notes. Candidate archived/deleted after selection rejected at confirmation; no partial Add.

Selection/filter are transient (Cancel/leave/reload drops unconfirmed picks, explained in UI); confirmed Add/Replace/Remove/Reorder use Phase2 Builder draft only, not source-plan Save. Raw input retained; explicit Save source/new plan/Start remain separate. No alternate storage path. Picker uses native buttons/selects, aria-pressed + text selection, status count, Escape/Cancel and return focus to trigger; no focus trap for inline panel.

- [x] 3A Write failing helpers/integration tests: accent search, primary/AND/equipment/pattern/empty, pending preservation, Add duplicate/custom/archived/deleted, Replace prescription/notes/identity, alternatives and Original/history, schema7 draft reload. Run targeted RED, implement minimal helpers, GREEN.
- [x] 3B Shared UI + Library filter reuse + Builder draft integration; asset19. Verify picker Add/Replace explicit review, keyboard/focus, Phase2 suite; write-failure guarantees covered in Node, UI fault injection NOT VERIFIED.
- [x] 3C Synthetic-origin browser A–E and narrow320/360/390 Add/Replace, long names, counts/selection/filter/confirm/cancel; Node roundtrip assertions Original/history/source state; no Phase3 browser export/restore repetition. No user-origin writes.
- [x] 3D Full tests/syntax/diff, update report/docs/private summary, local checkpoints on main; STOP/no push/no Phase4.

## Phase 4 — flexible live workout

**IMPLEMENTED / TESTED** (06/10/2026):4A approved;4B-1 identity8,4B-2 runtime/CAS,4B-3 Add/Remove/Reorder,4B-4 Replace done. Approved [contract](PHASE4_LIVE_WORKOUT_CONTRACT.md) unchanged; code61de602 and current [37-item report](V4_IMPLEMENTATION_REPORT.md) record evidence. Schema8/photo1 retained.

Chỉ buổi hôm nay: Add review, Remove tombstone, active Reorder, Replace closes old + appends successor with reviewed remaining/prescription. No source-template promotion, Undo/event sourcing/backend/AI/catalog expansion. Historical ownership and source isolation preserved; history structural controls absent.

All30 final gates pass:197 tests (180 existing),47 syntax checks, browser0/partial/edited/complete/chain/dirty/race/failure/history/backup,320/360/390 iframe no horizontal overflow. Physical devices/Safari/screen-reader/nativequota NOT VERIFIED; harness observer limitation in report. Dependencies and detailed done conditions retained in execution plan above. Model/reasoning used/recommended for comparable runtime work: GPT-6.1-sol/high. **STOP; do not automatically begin Phase5.**

## Phase 5 — My Day và journal retrieval

### Phase 5B execution plan — 06/10/2026 (IMPLEMENTED / TESTED)

Verified baseline: clean local main d3f2e83 (code5A ffe8279), schema8,216/216tests and51JS syntax pass. Guide on disk is FULL_STEP_BY_STEP_GUIDE.txt (the requested .md does not exist); update this existing guide. No baseline mismatch, no AGENTS found, no remote operation. The existing timeline in renderJournalCalendar sorts newest first then slices30. Journal shape is id/date/mood/title/note/tags/createdAt/updatedAt; strict backup validates text/tag/date types and one journal/date. My Day uses in-memory source date/return, preserved.

Approved design: pure retrieval in js/journal.js, focused js/journal-retrieval-ui.js integrated only at the timeline; keep calendar/editor/photo code and paper style. Normalize temporary strings with NFD accent removal, đ→d, Vietnamese lowercase, trim/collapse whitespace. Substring match individually in title/note/each tag; exact normalized tag equality, multiple tags ALL, query AND tags. Filter the full array then stable descending date sort, then take cumulative limit30,60,90. No cross-field invented phrase, fuzzy/mood search or persistent index. Existing recent tag editor helpers and MOODS unchanged. Retrieval validates the fields it reads; malformed source records fail with a clear read-only message rather than repair/skip; strict core load/backup behavior retained.

UI state query/tags/limit lives only in the module closure and survives editor visits in the tab; reload resets it. Live input refreshes only results/status, preserving typing focus. Tag chips use aria-pressed and original labels deduplicated by normalized key; chosen-but-removed source tags stay visible in active-filter text until Clear. Filter changes reset30; Xem thêm adds30, focuses first new record; Clear resets all and focuses search. Distinguish no journals from no matching results. Results open exact Journal date; explicit return to results reloads canonical JSON and derives afresh; My Day source opening resets only the retrieval-return flag, preserving5A return behavior. No new navigation tab/schema or editor.

1. [x] RED tests in tests/journal-retrieval.test.js: title/note/tag/unaccented/whitespace/no-results/blank, exact1tag and ALL tags+query, chronological/immutable,75records/filtered beyond30/partial pages/no duplicate or skip/reset/clear, source edit/delete/literal HTML/malformed values, backup and zero storage writes. Run node --test tests/journal-retrieval.test.js.
2. [x] GREEN pure helpers: normalizeJournalText, journalTagOptions, retrieveJournalEntries returning visible records/total/hasMore. Existing216 assertions untouched; node --test plus schema8 backup tests.
3. [x] UI/module integration and CSS: semantic Tìm nhật ký field, chips, active filters/count/clear, paged results/Load More, source-return button and latest canonical source. Cache URLs30 only; no Gym/Nutrition behavior change.
4. [x] Synthetic separate origin browser A–K with75entries and probe: retrieve55beforeLoadMore,30→60→75 no skip/duplicates, filtered45→30+15, query+tags/reset/clear, edit/delete return,5A source save/return, reload; read-only counters0, related/unrelated daily photos deletion policy unchanged. Actual320/360/390 many long chips/query/results/LoadMore/no-result/keyboard/focus/bottomnav; standalone logs.
5. [x] Independent review, important fixes, full tests/syntax/diff; update roadmap/report/model/README/existing guide/private summary, separate local main code/docs checkpoints. All29gates passed; Phase5 complete in verified local scope. STOP before6; no push.

Dependencies:1→2→3→4→5. Model/reasoning: current coding model/high for full-history/date/source/focus integration; medium for docs. Decisions: cumulative LoadMore chosen over numbered paging as the smallest reversible solution. No schema/dependency/blocking decision required.

Results:216→231tests,53syntax, original216 assertions unchanged. Browser synthetic8782 A–K; initial75, filtered45→30/45, entry55 before LoadMore,30/60/75 unique dates. Query+ALLtags, filter reset60→30/37, mutually exclusive tags0; source edit/delete refresh; My Day date03 Save/return; reload74 after explicit deletion and filters reset. Probe0JSON/0IDB writes plus exact JSON/metadata equality for retrieval/source-opening-only. Existing Journal delete removed daily55 only; food55 same date and daily-other retained. All320/360/390 no overflow. Code334d541 plus hover-contrast fix79e60eb; separate docs checkpoint follows. No remaining important finding in independent read-only review. No physical-device/screen-reader/large-library benchmark claim. Full evidence and29-gate matrix: V4_IMPLEMENTATION_REPORT.md. STOP before6.

### Phase 5A execution plan — 06/10/2026 (IMPLEMENTED / TESTED; STOP before5B)

Approved: subview **Xem ngày**, Dashboard retained; schema8→8. Execute inline on current local main; no remote operations. Phase5B is excluded and remains incomplete.

Date audit: journalEntries, entries, sessions, cardioEntries, checkins, kneeEntries and photos all use explicit local calendar `date` (YYYY-MM-DD). Journal/session/photo createdAt/updatedAt are ISO timestamps for metadata, never day membership. Daily photos attach by date/category, not journal ID; food/recipe owner IDs reference library definitions, not meal dates. Each photo joins once by its own date/ID, including orphan owners. No date reassociation. Journal editor and backup enforce one entry/date; other domains permit multiple. Preserve all source records in the read model. Existing router uses in-memory `view`; selected day remains in memory through source navigation, reload returns Dashboard. No new persisted route state.

Architecture: pure `daySummary(data, photosMetadata, date)` plus local calendar stepping in js/my-day.js; small js/my-day-ui.js uses existing semantic helpers and textContent. Source links configure existing source views, with an in-memory return button. History optionally filters the chosen date without changing session readers/ownership. Canonical dailyTotals must propagate unknown macros as null; known zero remains zero. Photos use new read-only metadata cursor projection and selected thumbnail getter on the unchanged IDB store; reading a nonexistent DB aborts creation. No Blob decoding/original URLs in My Day, no writes or persisted aggregate.

1. [x] RED tests: pure empty/each-domain/multiple/date/null/immutability/source update-delete/replacement; read-only photo queries, missing DB and failure isolation. Run node --test tests/my-day.test.js tests/my-day-photos.test.js.
2. [x] GREEN: implement read model/calendar helpers, minimal canonical macro fix, read-only photo APIs. Retain all197 regression assertions. Files: js/my-day.js, js/data.js, js/photo-store.js and above tests.
3. [x] UI: date controls, neutral empty state, ordered populated cards, metadata/thumbnail strip, source actions/return, Dashboard shortcut; small app/navigation/session-ui/CSS changes, cache URLs29. No editor in this view.
4. [x] Browser synthetic origin: A–I workflows; explicit source Save/edit/delete followed by fresh derive; count storage/IDB writes while only reading/navigating; photo failure and photo-only; reload contract. Actual rendered320/360/390 all-card and empty screens; Tab/Enter/Space/focus/labels; no private origin changes.
5. [x] Independent review, fixes, full suite/syntax/diff checks; update roadmap/report/data model/photo docs/README/guide/private summary, separate local code/docs checkpoints. No synthetic fixtures staged. STOP before5B.

Dependencies:1→2→3→4→5. Done: all25 user gates supported by actual evidence; distinguish unverified physical devices/screen reader/native quota. Model/reasoning: current coding model/high for date and read isolation; medium for docs. No blocker in audited date/ownership contracts. Future decision: whether My Day becomes Home; no decision blocks5A.

**Phase5 status:**5A and5B IMPLEMENTED / TESTED in verified local scope. FullPhase5 DONE;29/29 Phase5B gates passed. Historical5A evidence:197→216tests/51syntax, codeffe8279. Current5B:216→231tests/53syntax, code334d541+79e60eb, browser8782 A–K and mobile/zero-write/source return. STOP before Phase6.

**Goal/value:** một trang theo date để nhìn cả ngày, tìm nhật ký cũ. **Depends:** subview approved for5A, phase 1 capture. **Data:** derived join từ existing arrays/IDB metadata, chưa cần schema; activity catalog/energy là milestone khác. **UI:** dates, cards, source-links, local text/tagsearch, paging hơn30entries, photo-only days.

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

- 05/10 Phase 3: schema7→7, baseline74/74 →82/82 tests. Shared inline Add/Replace, AND filters, accent search, pending review, Phase2 draft integration. Browser A–E at disposable8772; Add/Replace confirmations at iframe320/360/390, no horizontal overflow. Code checkpoint b0d31cf. See V4_IMPLEMENTATION_REPORT.md for evidence and limits. STOP/no push/no Phase4.

- 06/10 Phase4B-4:180→197 tests; schema8 unchanged;47 syntax checks; code61de602; source/ownership/atomicity/two-tab/backup/mobile evidence in current report. Phase4 complete in tested local scope; STOP before5.
