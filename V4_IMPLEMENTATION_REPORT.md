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
