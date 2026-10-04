# Tracker V4 — Phase 4B-1 Session Identity Foundation

05/10/2026 · **4B-1 IMPLEMENTED / TESTED. Phase4 NOT DONE. 4B-2 NOT IMPLEMENTED. STOP.** Code checkpoint `09676c2`; main; no push. Prior reports below are historical evidence.

## 4B-1 report — 21 required items

1. **Schema:** baseline7,82/82 tests, clean main df8418a → schema8,136/136 tests.
2. **Migration:** 7→8 shallow additive version bump after existing1→7 chain. No load-time write, random IDs, draft enrichment or historical rewrite. Load twice and load after successful write compare equal. First successful updateData write persists8; quota/invalid migration leaves original7 bytes intact. Actual df8418a reader rejects8 with0writes; no downgrade.
3. **Structure:** `{revision,basis,slots,order}`. Registry and permutation separate; validators understand `started|legacy-snapshot|legacy-program`, active/removed/replaced and immutable definition snapshots. No structural mutation commands implemented.
4. **Identity:** new helper allocates occurrence UUIDs independent of catalog/template IDs; legacy helper uses session-scoped `legacy-slot:<index>`. Same exercise twice stays separate. sourceSlotId keeps template occurrence or Original source occurrence. B:4 catalog is A:3; it is not incorrectly renamed to catalog B:4.
5. **Sets:** structured saved sets require valid slotId, compatible immutable registry ordinal, snapshot name/known catalog agreement, unique set ID and `(slotId,setNumber)`. Legacy fields and saved-array order retained. Existing over-target sets preserved; no generated load/chronology.
6. **Old completed history:** unchanged, no guessed ownership/full Original snapshots. Current history name-snapshot reader and legacy reopen/editor continue. Schema8 does not imply every session has structure.
7. **Materialization:** pure deterministic candidate, custom/one-off from frozen workoutSnapshot, Original from accepted PROGRAM+week. Raw ranges, unilateral strings, unknown RIR and technique notes retained. Setup notes capture supplied current map; no claim these existed at old Start. No automatic persistence/activation.
8. **Ambiguity:** out-of-range/name disagreement/duplicate IDs or index-number/missing definitions/orphan slotId return explicit ambiguous result plus unchanged cloned raw session. No guessing/drop/wipe. Legacy ambiguous Original can load, backup and write independent settings/domains; adapters refuse ownership guesses.
9. **Validation:** strict structure at load/save/export/import; exact order bijection, unique slots, typed snapshots, revision/status/basis, registry/set FK and earlier predecessor/one-successor/replaced consistency/no cycles. Current source plan/library not required. Broken structured records never fallback to legacy; malformed store is rejected with original bytes preserved.
10. **historyEditBase:** foundation supports null, cloned completed baseline or exact `{kind:'legacy-unknown'}`. Draft-only; no recursive baseline, ID mismatch or invalid dates. No history CAS writer or automatic baseline migration. Existing runtime drafts retain old shape.
11. **Backup:** schema8 raw/wrapped roundtrip mixed legacy and structured records; preserves zero-log removed/replaced rows, IDs, links, order, revision and open history base.1–7 accepted, future/wrapper mismatch rejected. Photo IDB1/photo format1 untouched; paired backup still2files, no cross-store atomicity claim.
12. **Cutover:** NOT DONE. Start/log/edit/delete/focus/next incomplete/quick fill/Complete/history overwrite remain index-based for ordinary legacy runtime. No live Add/Remove/Replace/Reorder. No backend/AI/cloud/auth/PWA/Nutrition expansion.
13. **Half-mix prevention / BRIDGE ONLY:** runtime does not call structure constructors/materializers. Imported structured or non-null history-baseline draft is read-only; structured history reopen blocked. Latest-state generation guards block old date/notes/set/Complete/reopen handlers from editing identity records after restore. Complete also refuses replacing a structured source. These are compatibility guards, not slot writers/full-baseline CAS. Normal legacy history behavior stays as before4B-2.
14. **Tests:** new identity/migration tests first failed on missing module; targeted then GREEN. Additional baseline/date/foreign-owner and draft-only tests observed RED before fixes. Fixture mistakes (empty draft sets, wrong unilateral day) corrected against existing fixtures/PROGRAM. Final `npm test`:136 passed,0failed/0skipped. Existing82 retained;3 schema expectation assertions now8, other assertions unchanged. All38 JS source/test files passed `node --check`; diff check passed.
15. **Browser regression:** disposable127.0.0.1:8773 only, user8765 untouched. Original Start→20kg×10 RIR3→reload→22kg×9→Complete/History. Reopen→edit first load21→Complete keeps two sets. One-off through Builder→picker pending survives search→Confirm→reload/recovery→Start→5kg×12→Complete. Custom Original copy→Start→30kg×8→reload→Complete/History. Backup clipboard→real private file. Structured fixture UI import/preview/confirmation→restore→reload→export deep-equal; read-only draft/no Save, history reopen blocked, nutrition accessible. Final ordinary tab console warn/error[] after v20 reload.
16. **Failures/corruption:** malformed ownership/import/export/load, duplicate IDs/order/set pairs, cycles/predecessors, revision/status/basis/snapshot, recursive baseline/future schema/wrapper mismatch reject. Invalid V7 migration and quota preserve raw disk. Existing Phase2 stale-lock/queued writes/planning corruption and photo rollback tests still pass. Browser instrumentation attempt to read iframe contentDocument failed because read-only DOM surface does not expose it; frame html locator measurement succeeded. No app failure was hidden.
17. **Files:** new js/session-identity.js and2 test files. Logic changes js/data.js + small app.js bridge;3 existing tests schema expectations. index.html and module import URLs uniformly v20; other JS changes are cache URLs only. Docs: contract/roadmap/report/data model/README/photo storage/guide; private ignored TONG_KET updated separately. No MASTER_PLAN change, dependency change, committed personal fixture or remote upload.
18. **Persistence evidence:** after real save+reload, `.local/phase4-runtime-backup.json` has wrapper/data8 and3 sessions (Original2sets,one-off1,custom1), no structure or slotId. `.local/phase4-structured-import.json` vs roundtrip file has deep-equal data,revision9 with editing baseline. Helpers/tests prove V7 disk remains7 until successful write8. Evidence files ignored/private.
19. **Mobile / NOT VERIFIED:** affected read-only bridge at iframe360px, layout viewport345px after scrollbar, scrollWidth345px;0Save buttons; screenshot inspected. No physical phone/Safari/screen reader, real quota pressure, large-photo export/download-link completion, or Phase4 structural UI claim. Photos only existing automated regression this milestone; current browser backup verifies data JSON, not new paired photo exercise.
20. **Git:** code09676c2 and a separate documentation checkpoint (see git log/handoff). main; no fetch/push/reset/rewrite. Private `.local/**`, MASTER_PLAN and TONG_KET remain ignored. Current local state/commit reported in handoff.
21. **Exact4B-2 remaining:** approved next request needed. Atomic runtime materialization/UUID Start + historyEditBase activation; canonical slot writers/readers for log/edit/delete/date/notes/focus/next incomplete/previous occurrence/quick fill; consistent revision+full-session baseline guard inside Web Lock, same-tab queue/epoch and stale-tab handling; current-candidate checks; Complete strips draft baseline and CASes completed baseline; changed/deleted/legacy-unknown history recovery with reviewed independent copy/refresh/export. Test races, source changes, drafts reload/backup and legacy ambiguity before activating identity. No Add/Remove/Reorder until4B-3; Replace until4B-4. Model recommendation GPT-6.1-sol/high.

### Index consumer checklist audited before cutover

| Consumer | Location |4B-1 disposition |
|---|---|---|
| Original/custom/one-off Start | app openWorkout/startCustomWorkout | Unchanged legacy shape |
| Render/group logs/next set number/edit/delete | app workoutView/exerciseBlock | Legacy; identity records blocked |
| Quick fill / previous matching | workout previousExerciseSets/previousSetFor | Legacy API retained; occurrence matching pending |
| Focus / next incomplete / post-save focus | workout nextIncompleteExercise; app focusIndex | Legacy; no partial slot cutover |
| Complete / history overwrite | app completeWorkout | Legacy behavior plus generation bridge; no CAS claim |
| Reopen | app historyView | Legacy clone still works; identity generation blocked |
| Strict backup | data validateBackupData | Dual-generation validation |
| History / progress / next plan day | app historyView, progress exerciseHistory, custom nextPlanDay | Existing name/plan snapshots retained |

## Historical Phase 3 — Shared Exercise Picker + Alternatives

05/10/2026 · IMPLEMENTED + TESTED. Scope ends at Phase3. Existing Phase2 report is preserved below.

## Product and data contract

1. **Shared Picker:** one inline component in Builder, shared by Add and Replace. No modal/focus trap or separate Library navigation needed.
2. **Filters:** accent-insensitive name search (including đ/d), primary muscle and existing Back/Shoulders subgroups, equipment, movement; AND semantics. Options derive from active catalog. Clear filters retains pending IDs. Empty results explain how to clear.
3. **Add:** multiple pending IDs in selection order, visible count/review/remove-selection; existing IDs disabled. Explicit Confirm adds all atomically to draft. New slots have unique IDs and editable defaults:2sets/8–12/RIR2/90s, clearly labeled configuration. Pending picks are not saved until Confirm; cancel/reload leaves the saved draft intact.
4. **Replace:** one pending ID, current exercise excluded and already-in-day choices disabled. Review old→new metadata and notes before Confirm. Slot ID/order/sets/repMin/repMax/RIR/rest preserved; setup notes replaced by new definition, explicitly previewed. No load/history edits.
5. **Alternatives:** reuse alternativesFor; rank within the filtered set, then expose remaining manual candidates. Actual shared primary muscles/pattern/equipment displayed. No invented equivalence, biomechanics or medical safety claims. Original combined exercise names remain combined; equipment labels are options, not proof of identical setup.
6. **Custom:** same catalog/search/filters; archived definitions excluded and deleted/missing candidates rejected again at confirmation. Referenced custom definitions retain existing archival semantics. Missing equipment remains visible unfiltered and excluded by a specific equipment filter; current custom editor requires equipment.
7. **Draft:** confirmed Add/Replace/Remove/Reorder use the existing Phase2 draft store, queued writes/conflict checks, Saved status only after write, explicit Continue recovery. Structural changes do not silently save source plans; explicit Save source/new plan or Start remains separate. No new persistence path.
8. **Schema:**7→7. No new stored entities or migration required. localStorage key and IndexedDB/photo backup formats unchanged. Filter/selection state is transient; existing exercise IDs and history snapshots retained.

## Verification evidence

9. **Tests:** baseline74/74; targeted new helpers RED (missing module) →8/8 GREEN; final npm test82/82,0failed/0skipped. New tests cover Unicode, primary/AND filters, catalog choices/missing equipment, pending toggles, Add atomicity/duplicates/custom/archived/deleted, Replace prescription/slot/order/notes, filtered alternatives, Phase2 reload/schema7 and backup roundtrip with unchanged source/history/PROGRAM. Builder module graph imported by tests as a syntax gate. All js files also passed node --check; git diff --check passed.
10. **Browser MANUALLY VERIFIED:** disposable localhost8772, without accessing user data at8765. A: Back+Cable→choose2 (one viaSpace)→search no-results→count2 retained→clear→Enter Confirm→2slots/Saved. B: Replace→Back+Cable→single selection→preview3sets/120s→duplicate disabled→Escape/cancel returns focus→reopen/Confirm. C: reload/Continue preserves two slots and replacement3sets/120s. D: create custom Vietnamese long-name row in Library→search without accents→Add→reload/Continue preserves custom slot. E: no-results/clear preserves selections and restores results. Also manually verified Add in a custom-plan editor→reload→Continue recovers the source-linked draft; explicit Save source succeeds and clears the draft. Disposable templates created in mobile tests.
11. **Mobile MANUALLY VERIFIED:** real rendered iframes of320/360/390px, not physical phones. At each width: Back+Cable multi-select, filter hides results while count2 remains, Add Confirm, Replace review and Confirm into long-name custom exercise, Save disposable template. Also Cancel/Escape paths and visible selected state checked. scrollWidth equals clientWidth in Add/Replace and completed draft; scrollbar makes some document clients305/345/375 instead of iframe320/360/390. Confirm button measured48px high, filters/names wrap; screenshot .local/phase3-picker-widths.jpg.
12. **Accessibility MANUALLY VERIFIED:** native buttons/selects/text input; Tab from search focuses muscle select with solid outline; Space toggles, Enter confirms, Escape and Cancel close and return focus; selected aria-pressed plus text/check and status count. Inline picker permits normal page Tab traversal. No screen-reader session claimed.
13. **Safety TESTED:** helper/integration tests compare source plans, session snapshots and PROGRAM before/after Add/Replace and schema7 backup roundtrip. Existing regression tests cover Original copies, archive/deletion history isolation, migrations, locked writes, quotas and failed commits. MASTER_PLAN.md unchanged; no network provider, API, analytics or private uploads.
14. **NOT VERIFIED / limits:** physical touch devices, Safari/Firefox, screen reader, UI quota fault injection or racing archive in two browser tabs (helper/store tests cover rejection), real large catalogs, repeated Phase3 photo export/import. Pending selections intentionally disappear on leaving/reload before Confirm. Initial browser caught duplicate helpers declaration; fixed and whole-module syntax checked. Iframe harness recorded one MutationObserver error with no source URL while automation interacted; repository contains no MutationObserver code, attribution unconfirmed. A fresh normal tab Add flow finished with zero error/warn logs; do not describe all harness console logs as clean. This phase does not change live workout structure/identity.
15. **Files:** new js/exercise-picker.js, js/exercise-picker-ui.js, tests/exercise-picker.test.js; functional edits js/gym-builder-ui.js and css/style.css; index.html and JS import queries bumped18→19 to avoid stale module graph; docs V4_ROADMAP.md, V4_IMPLEMENTATION_REPORT.md, DATA_MODEL.md, README.md, FULL_STEP_BY_STEP_GUIDE.txt; private ignored TONG_KET_DU_AN.md updated locally. Unrelated JS modules only change asset query, no behavior.
16. **Git:** main, code checkpoint b0d31cf plus a separate documentation checkpoint; no GitHub push. Baseline764f225, clean and ahead10 cachedorigin/main. Final commit IDs/status are reported in the task handoff; origin comparison is cached, no fetch performed. Private/ignored plan, summary and .local test fixtures excluded from commits.
17. **Next:** Phase4 Flexible Live Workout per V4_ROADMAP.md, only after separate approval of live-edit semantics and logged-set slot identity/migration contract. Recommend coding model GPT-6.1-sol, high reasoning for identity/migration design. STOP here.

---

# Tracker V4 — Phase 2 reliability / recovery

05/10/2026 · **IMPLEMENTED + TESTED + MANUALLY VERIFIED** trong phạm vi fixture local dưới đây. Phase 2 done conditions đạt: Builder/Planner recover qua reload, một paired backup/restore roundtrip được chứng minh và các failure paths có tests. **STOP sau Phase 2**; Phase3+ chưa triển khai. Phần chưa kiểm chứng được ghi riêng, không suy từ code/tests.

## 1. Baseline và phạm vi

- Baseline: `ed65522`, main sạch, schema6, `npm test`60/60. Đọc roadmap/research/backlog/ideas, DATA_MODEL, TONG_KET, PHOTO_STORAGE, AI_PLANNER, persistence/UI/tests trước code. Không research lại35 apps.
- Code checkpoint: **7c41470** (`feat: recover planning drafts and verify paired backups`), trên main. Documentation checkpoint sau đó; xem Git log. Không fetch/push hoặc tạo branch mới. TONG_KET và `.local` vẫn ignored.
- Giữ V2/V3/Phase 1, UI giấy, navigation, original program và dữ liệu lịch sử. Không sửa MASTER_PLAN.md / js/program.js. Browser ghi chỉ synthetic origins8770/8771; không sửa user origin8765. Không backend/remote AI/cloud/new dependency.

## 2. Draft architecture và migration

Schema **6→7** vì pre-start drafts là persistent structure mới. Thêm duy nhất `planningDraft:{ revision:0, builder:null, planner:null }`. Live session `draft` tiếp tục độc lập. Hai slot chứa `{ savedAt, payload }`; giới hạn250,000 JSON characters/slot, builder tối đa100 exercise slots. Builder giữ day/raw fields/order/IDs, source-plan baseline khi sửa custom day. Planner giữ đúng preferences hiện có, result và requestKey.

Migration additive trong memory, không write khi chỉ load. Next successful write lưu7. Representative V6 tests so sánh mọi field cũ, raw/wrapped backup đều migrate; V1–5 tests vẫn chạy. IDB version1/photo package version1 giữ nguyên. `tests/model.test.js` chỉ cập nhật expected schema sang SCHEMA_VERSION và preview planningDrafts0; không bỏ/giảm behavioral assertions cũ.

Một queue/tab gọi existing `updateData` + Web Lock, compare expected full envelope/revision trước mỗi write. Save status chỉ sau persistence success. Domain khác có thể update mà không mất; draft changed ở tab khác gây conflict rõ, không auto-merge. Giữ text cần thiết rồi reload để mở draft mới. Có yêu cầu unload warning khi write pending/error; chưa claim browser nào cũng hiển thị.

## 3. Builder recovery

Autosave tên buổi, selected exercises/order, hiệp/reps/RIR/rest/notes, kể cả strings/blank/invalid numbers. Draft chưa đổi plan/session/history. Sau reload/navigation: recovery card có savedAt, **Continue/Discard**, không tự Start/Save/activate. Edit raw custom day cũng lưu draft riêng; explicit Save mới cập nhật source plan.

Source plan đổi/xóa → recovery thành one-off với warning; exercise không còn/archived → chặn Start/Save tới khi bỏ/thay. Draft payload corrupt được giữ nguyên trên disk, recovery UI có raw draft download/confirmed discard. Valid core state vẫn mở được; strict full backup reject corrupt draft. Raw diagnostic draft không phải full backup.

Builder cũ cần được xử lý trước khi chỉnh ngày khác. Planner accept yêu cầu xác nhận trước khi thay một Builder đang có, kể cả Builder chưa Continue trong memory.

## 4. Planner recovery / stale protection

Preferences và generated local output persist qua reload. Continue revalidate output theo request/library hiện tại; result sai bỏ với warning, preferences giữ để chỉnh. Bất kỳ input change nào xóa result và acceptance UI ngay; không giữ output cũ như cùng request mới. Input revision tránh async render từ request cũ chen lên input mới. Health/free-text rules local hiện có giữ nguyên; không gọi API.

## 5. Cleanup / failure

| Hành động | Kết quả persistence |
| --- | --- |
| Start reviewed workout | Lưu live-session snapshot và clear Builder trong một locked write |
| Save new plan / Save source day | Validate, lưu plan và clear Builder trong một write |
| Accept Planner | Lưu Builder + clear Planner trong cùng write; chưa Start/activate |
| Explicit Discard | Clear đúng slot sau confirmation và write thành công |
| Validation/quota/stale/source conflict | Không clear saved draft hoặc sửa persisted plan/history; báo lỗi |

Same-ID live session shortcut bị bỏ khi Start từ planning draft, để user được xác nhận thay phiên cũ và snapshot mới được lưu đúng. Save source day structural candidate được autosave trước explicit source commit, giúp failed commit vẫn recover candidate. Completed snapshots không thay đổi.

## 6. Backup / restore confidence

Settings phân biệt **data JSON** và **photo JSON**, trạng thái prepared/requested/copied/restored riêng. Tạo link không chứng minh file đã tải. Data preview gồm2 planning slots; photo preview orphan count. Data restore validate trước mutation + check toàn bộ preview baseline trong updateData; no hard-coded replacement field list. Photo import dùng transaction add-missing hiện có, giữ existing IDs; final count từ transaction, không chỉ preview.

Zero-photo export hợp lệ. Có clipboard fallback cho photo JSON đã chuẩn bị, như data fallback hiện có. Hai file cần được lưu riêng tư; clipboard có thể chứa ảnh riêng tư. Chưa chứng minh clipboard/file lớn. LocalStorage vẫn chỉ chữ/số; IDB giữ native Blob. Restore dữ liệu trước rồi ảnh, **không có transaction chung giữa hai stores**.

## 7. Tests tự động — TESTED

`npm test` cuối ngày05/10: **74/74 pass,0 fail** (baseline60/60; thêm14 tests). `node --check` mọi js/*.js và `git diff --check` đạt.

- Migration6→7, preserve every representative V6 domain, old backups wrapped/raw, migration không tự rewrite disk.
- Raw Builder invalid input save/recover/discard, Planner preference/result save, changed request invalidation, missing exercises block acceptance.
- Serialized queue/latest input, two-client stale draft, unrelated-state preservation, coexist Builder+Planner.
- Injected quota/storage error không emit Saved, failed Start/Save keeps draft, successful Start/Save cleanup atomic, history isolation.
- Corrupt planning disk retained, corrupt full-backup rejection, bounded payload giữ last saved.
- Representative full data export→fresh storage→actual restoreBoundary/updateData→deep equality all keys.
- Photo export→fresh IDBFactory→actual addMissingPhotos→all metadata/owners/blob+thumbnail bytes equal; duplicate skip/package duplicate IDs reject; orphan retained.
- Invalid/stale/quota data restore preserves prior persisted object; injected IDB second-add failure aborts first-add and leaves prior photos intact.
- Existing replace/remove/stale/rollback tests remain passing. fake-indexeddb tests simulate failures; they do not prove native quota pressure.

New files: planning-draft.test.js, draft-cleanup.test.js, reliability-backup.test.js, fixtures/representative-state.js. Initial contract test run failed on missing implementation exports, then passed after implementation. Additional representative/cleanup regressions extend that coverage.

## 8. Browser — MANUALLY VERIFIED

Codex IAB, Python static test servers, synthetic state only.

| Workflow | Actual evidence |
| --- | --- |
| Builder normal | 3 exercises; edit3 sets/10 min reps/120s/notes; move2nd to1st; reload→Continue preserved name/slots/order/params |
| Discard | Confirm Discard→reload; no Builder recovery card returns |
| Invalid raw input | Blank Hiệp→Save Plan rejected; retry draft save→reload→Continue still blank, not converted into default |
| Save new plan | Fix Hiệp3→Save→reload; Builder card gone, Planner remains; new plan exists |
| Custom source day | Type raw name without Save→export: original source plan/history unchanged; reload restored source draft. Explicit Save source updates day and clears draft |
| Source Start | Type unsaved name→Start same source live day→confirmation→snapshot has new name; planning draft cleared; source plan and completed history unchanged |
| Planner | Back/count3/name→generate→reload→Continue output restored; count3→2 removes Accept immediately; regenerate/accept→Builder; Start→reload live session exists, no pre-start cards |
| Existing Builder + Planner | Accept recovered Planner on origin8771 opens replace confirmation; Cancel preserves existing Builder |
| Two real tabs | Same-origin tabs load same Builder; A saves name; B types different name→CHƯA LƯU conflict, A remains on disk and is recovered by reload |
| Restore safety | Data preview counts + disabled Restore until backup acknowledgement; save current JSON then confirm. Invalid JSON rejected; invalid photo category rejected; no state change on re-export |
| Photos duplicate/orphan | Import3 (1 orphan)→preview warning; duplicate import shows0 new, final0 added/3 kept |
| Keyboard | Recovery Tab reaches Discard with solid focus outline; Enter activates Continue. Backup controls use real labels/buttons, restore checkbox gates action |
| Runtime | error/warn logs[] on source/destination tabs after exercised workflows |

### Paired browser roundtrip:8770→8771

Fixture has1 completed custom session/set,1 live draft,1 custom exercise,1 active plan,1 food definition,1 historical entry,1 saved meal,1 recipe,1 journal,1 check-in,1 cardio,1 knee,exerciseNotes,settings and2 pre-start drafts. Food definition200kcal vs history snapshot100 deliberately differ (synthetic values only).

Three valid JPEG records: food owner, recipe owner, missing-food owner. All native IDB metadata/content imported on source. Both parts exported from actual source UI via clipboard, saved to real `.local/phase2-source-{data,photos}.json`; destination initially empty on separate origin. Import data preview/acknowledge/restore, then photo preview/add. Export destination again → Node assertions **all JSON keys equal** original fixture; **3 photo IDs, metadata, ownerType/ownerId, Blob and thumbnail byte arrays equal**. ExportedAt varies and is not a state invariant. Duplicate and invalid-import re-exports also preserve state.

One automated clipboard capture initially read the previous tab's clipboard too early; repeated after UI completion and comparisons passed. This was a test-capture timing issue, not a data restore mutation. Assertions are on saved files, not visual counts alone.

**Download event/link retrieval timed out in IAB.** No claim that download link saved a file; paired roundtrip proof uses UI clipboard-to-file fallback. Normal Chrome/Edge download completion remains NOT VERIFIED in this session.

## 9. Mobile — MANUALLY VERIFIED, scope explicit

Viewport capability initially failed to apply to requested hidden tab; desktop measurements were discarded. Top-level destination did reach390px and recovery/backup were measured there. For all required widths, ignored local harness embeds unmodified app in separate **real iframe viewports320/360/390**, exercising actual media queries/native rendering. Same synthetic origin, no user data.

| View |320|360|390|
| --- | --- | --- | --- |
| Builder recovery client/scrollWidth |320/320|360/360|390/390|
| Planner recovery client/scrollWidth |320/320|360/360|390/390|
| Backup with prepared links client/scrollWidth |305/305|345/345|375/375|

No horizontal overflow in these app viewports. Recovery buttons48px tall, wrap vertically at narrow widths, Continue via Enter succeeds. Screenshots inspected/saved in `.local/phase2-recovery-widths.jpg`, `phase2-backup-widths.jpg`, and top-level390 images. Iframes are responsive CSS verification; not device emulation/physical phone verification. Temporary viewport override reset, test tabs/servers cleaned up after handoff.

## 10. NOT VERIFIED / DECIDE LATER

- Physical mobile/touch/virtual keyboard, Safari, screen reader, native quota/storage pressure, large photo library near200MB, private real-user backup profile.
- IAB download-link completion; clipboard roundtrip verified only for small fixture files.
- General browser crash/power loss during pending autosave, all browser unload-dialog behavior, automatic conflict merge. One Builder and one Planner draft are intentional current limits.
- Corrupt/source-deleted/missing-exercise failure tests run in Node; not all corruption/source fallback UI variants manually exercised.
- Data and photos retain separate transactions. A failed second restore cannot atomically undo the first; use the retained two-file backup for recovery.
- Remote AI/backend/cloud/identity and existing My Day/live-edit choices remain DECIDE LATER.

## 11. Files / next step

**Created:** `js/planning-draft.js`,3test files + representative fixture.
**Behavior modified:** js/data.js, app.js, gym-builder-ui.js, planner-ui.js, photo-store.js (orphan helper). Other changed modules/index synchronize asset/import query18: custom-workout, journal, nutrition-photo-ui, photo-backup, planner, progress, workout. No program/style redesign.
**Docs:** V4_ROADMAP, this report, DATA_MODEL, PHOTO_STORAGE, README, FULL_STEP_BY_STEP_GUIDE; private ignored TONG_KET updated locally.

Next in existing roadmap: **Phase3 shared exercise picker / alternatives**; GPT-6.1-sol medium, high if persistent identities/conflicts change. Not started by this task. No GitHub push.

---

## Historical Phase 1 report (04/10/2026)

The report below describes the earlier schema6/60-test milestone; current Phase 2 status is above.

# Tracker V4 — research và milestone local đầu tiên

04/10/2026 · **RESEARCHED + IMPLEMENTED + TESTED** trong phạm vi dưới đây. Các phase V4 còn lại là PLANNED / DECIDE LATER.

## Nghiên cứu đã hoàn tất

- 35 sản phẩm unique: 11 Gym, 12 Nutrition, 11 Journal, thêm Gyroscope cross-domain. Exist không đếm hai lần.
- Bốn deliverables: `GLOBAL_APP_RESEARCH.md`, `TRACKER_FEATURE_BACKLOG.md`, `TRACKER_PRODUCT_IDEAS.md`, `V4_ROADMAP.md`.
- Hồ sơ `docs/research/` gồm baseline, Gym, Nutrition, Journal/DailyBean, cross-domain và browser API boundaries. Có nguồn official, phản hồi người dùng tách riêng, 30-feature matrix đủ 16 trường, top15 scored priorities và giới hạn bằng chứng.
- Gym hữu ích nhất: Hevy/Strong cho session/template scope, Fitbod cho lựa chọn theo nhóm cơ/dụng cụ. Nutrition: MacroFactor cho entry flow, Paprika cho scaling, Cronometer cho nguồn dữ liệu. Journal: DailyBean/Daylio cho quick entry, Diarium cho một ngày với nhiều loại dữ liệu.
- Phát hiện chính: Tracker đã có phần lớn nền tảng (snapshots, plans, timer, recent foods, recipes, journal/photos). Khoảng trống nằm ở nối workflow, phục hồi phần chưa lưu và làm rõ ý nghĩa dữ liệu. Nấu nhiều/ít, chia lại cùng mẻ và ghi lượng ăn là ba phép toán khác nhau. Không ghi hoạt động không đồng nghĩa hoạt động không xảy ra.

## Đã triển khai

1. **Daily food search:** tìm tên không dấu ngay form, recent-date order, no-result feedback và khóa Save. Edit giữ snapshot khi món không còn trong library; công thức đã ghi dùng cùng đường này.
2. **Cook-size preview:** scale numeric ingredients từ công thức gốc; giữ macro mỗi phần, hiển thị tổng lượng định nấu, reset, blank/invalid feedback và không giữ kết quả cũ khi input sai. Công thức gốc/steps/history không thay đổi. Lượng ăn ghi riêng.
3. **Recent journal toggles:** tối đa 8 thẻ từ ngày gần nhất, chọn/bỏ bằng chuột hoặc keyboard, đồng bộ ô nhập, state có dấu tick và aria-pressed. Save vẫn explicit.
4. **Mobile journal fix:** phát hiện các mood cards bị ép chữ dọc trong browser; chuyển grid theo chiều rộng container, nhãn riêng một hàng. Không đổi mood IDs hoặc giải thích lại lịch sử.
5. Asset/module query đồng bộ `v=17` để tránh trình duyệt trộn module cũ và mới.

## Dữ liệu và phạm vi

Schema vẫn **6**; không có persistent fields mới, không cần migration mới. localStorage key và IndexedDB/photos/backup format giữ nguyên. Các test migration V1–5 và snapshot/backup hiện có được chạy lại. Không sửa `MASTER_PLAN.md` hoặc `js/program.js`. Không thêm dependency, backend, cloud hay AI service. Origin 8765 của người dùng không bị thao tác ghi; toàn bộ browser fixtures ở 8768.

## Bằng chứng kiểm tra

### Tự động và source

- Baseline ngày 04/10: `npm test` **55/55** đạt trước thay đổi.
- Viết 5 test mới trước helpers; targeted run đầu có **6 pass / 5 fail** do exports chưa có. Sau triển khai targeted **11/11** đạt.
- Toàn bộ `npm test`: **60/60** đạt. Bao gồm migration, snapshot isolation, backup validation, custom plans/local planner và IndexedDB transactions bằng fake-indexeddb.
- `node --check` cho mọi file `js/*.js`: đạt. `git diff --check`: đạt; Git có cảnh báo quy đổi LF/CRLF, không phải whitespace error.
- Tự review diff: mutation vẫn qua persistence boundary, input plain text dùng DOM text, transient preview không write. Không có independent code-review mới cho milestone này; các research agents chỉ đóng góp research.

### Browser thực sự chạy — Codex IAB, localhost:8768

| Luồng | Thao tác và quan sát |
| --- | --- |
| Food search | `zz-no-match` → select/Save disabled và có empty state; `DAU` → Đậu thử V4; 1.5 × fixture100 kcal →150 kcal/P12/C9/F6 |
| Edit/reload | Sửa lượng Đậu thành2, reload rồi mở Nutrition →200 kcal, món recent được chọn mặc định |
| Snapshot không nằm trong food library | Sửa entry từ recipe: option bản ghi đã lưu còn được chọn, tìm `cong thuc`, sửa1.5→2 phần →600 kcal theo snapshot300/phần |
| Recipe arithmetic | Base4/400g →2/200g/600kcal tổng; target8→800g/2400kcal; target1.5→150g/450kcal; mỗi phần300kcal giữ nguyên |
| Recipe invalid/reset | Target0 và rỗng → lỗi, danh sách preview/macro cũ được xóa; reset→4/400g; reload→base4, không lưu target preview |
| Recipe logging | Log1.5 phần →450kcal; cộng entryĐậu200 → tổng650; sau sửa recipe entry2 → tổng800 |
| Unknown nutrition | Tạo công thức không macro → DATA NOT DEFINED YET, không có nút ghi ăn; quantity0.25g hiển thị0,25, không thành0 |
| Journal empty | Save entry rỗng → lỗi rõ, không lưu record rỗng |
| Journal tags | Lưu Gym/Đọc sách; click bỏ Gym, Space thêm lại; gõ đọc sách/Đi bộ đồng bộ state; Save/reload giữ tags |
| Keyboard | Tab đến tag chip có focus ring; Space đổi chọn; focus ở chip, không bị đưa về input |
| Narrow viewport | Daily log, recipe detail, journal kiểm tra320/360/390px: scrollWidth305/345/375 tương ứng, không overflow ngang |
| Mobile regression | Mood card trước sửa cao164–265px/chữ dọc; sau sửa tối đa~68px,1 cột320px và2 cột360/390px; ảnh kiểm chứng trong `.local/v4-journal-mobile.jpg` (không commit) |
| Runtime | `testTab.dev.logs` levels error/warn trả[] sau các luồng trên |

Các fixture là số kiểm thử, không phải macro thực phẩm thật. Viewport override được reset sau kiểm tra.

### Chưa kiểm chứng / không tuyên bố

- Chưa thử trên điện thoại vật lý/Safari hay screen reader; viewport emulation không thay thế các thử nghiệm đó.
- Không chạy browser deletion/replace-photo confirmation mới; storage tests hiện có vẫn đạt. Snapshot absent-library đã thử qua entry recipe, không xóa món của người dùng.
- Chưa chứng minh full paired backup download/restore, quota pressure hoặc thư viện ảnh lớn trên profile thật. Đây là gate phase2.
- Không benchmark tốc độ với hàng nghìn thực phẩm/tags hoặc dùng thử trả phí 35 sản phẩm. Nghiên cứu không phải kiểm nghiệm hiệu quả sức khỏe.

## Files

**Tạo:** bốn deliverables nêu trên, báo cáo này và sáu hồ sơ trong `docs/research/`.

**Code/tests sửa:** `js/app.js`, `js/nutrition.js`, `js/journal.js`, `css/style.css`, `tests/nutrition.test.js`, `tests/journal.test.js`, `index.html`. Các module khác có diff chỉ đồng bộ import query17: custom-workout, data, gym-builder-ui, nutrition-photo-ui, photo-backup, photo-store, planner-ui, planner, progress, workout.

**Docs sửa:** README, DATA_MODEL, FULL_STEP_BY_STEP_GUIDE, V3_ROADMAP; cập nhật TONG_KET_DU_AN riêng tư, vẫn ignored. Các cập nhật tiến độ có sẵn đầu phiên được giữ.

## Chưa triển khai và bước kế tiếp

- **Phase 2 đề xuất:** autosave/recover builder & planner trước Start, kèm paired restore rehearsal bằng fixtures. Persistence cần thiết kế migration/revision trước code. Model: coding model hiện dùng; reasoning high cho migration/conflicts.
- **Sau đó:** shared exercise picker, live session edits, My Day, multi-add meals, journal search, Weekly Life Review. Chưa đánh dấu các ý tưởng này là hoàn thành.
- **Cần chọn:** My Day làm home hay subview; contract thay bài đã log; có cần richer mood/activity catalog; nhu cầu multi-device thực sự.
- **Backend/cloud/AI:** remote planner/photo recognition, sync/auth cần kiến trúc secret, consent, retention/cost và offline fallback được duyệt riêng. Tìm/filter/scale/review cơ bản vẫn local được.
- Không tự push GitHub. `main` tiếp tục là branch làm việc; checkpoint cục bộ ghi trong Git log.
