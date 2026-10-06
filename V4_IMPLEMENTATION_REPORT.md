# Tracker V4 — Phase5B Journal Retrieval / Phase5 release

06/10/2026 · **5B IMPLEMENTED / TESTED; Phase5 IMPLEMENTED / TESTED in verified local scope. All29 gates passed. STOP before Phase6.** Schema8 stays8. Baseline clean main d3f2e83 (5A code ffe8279); code334d541, contrast fix79e60eb; separate docs checkpoint follows in local Git log. No push/fetch/reset/history rewrite. Reports below are historical.

## Phase5B report — all22 requested items

1. **Baseline → final tests:**216/216→231/231,0failed/skipped/todo. All216 existing tests/assertions unchanged.15 new groups in tests/journal-retrieval.test.js; RED missing helper exports before implementation, then GREEN. Final full suite rerun after the hover-color fix.53 JS files pass node --check; git diff --check clean. Independent read-only reviewer found detached-chip focus, confirmed final fix and no remaining important finding.
2. **Schema:**8→8. No persisted index/normalized text/query/tag/page preference or migration. Existing schema8 backup/migration/photo/planningDraft tests pass; Photo DB1/backup format1 unchanged.
3. **Exact search fields:** journalEntries.title, note and each tags string. Substring per field; no fabricated phrase joining title+note or different tags. Mood/date/timestamps not searched. Existing MOODS unchanged; drained remains Mệt.
4. **Normalization:** temporary String(value??'') → NFD → strip combining marks U+0300–036F → đ/Đ→d → Vietnamese lowercase → trim/collapse whitespace. Blank/null query imposes no text filter. Original saved text/labels untouched; met matches Mệt and tap gym matches actual Tập gym text.
5. **Tags:** exact normalized equality, ALL selected tags. Options derive from existing records, most recent original spelling per normalized key; no taxonomy. A selected tag removed from all source records stays removable until deselected/Clear. Existing recent-tag editor semantics unchanged.
6. **Composition:** query AND all selected tags. Browser query lich su chung + Gym + Đọc sách returned23/23. Independent Gym + Đi bộ fixture groups returned0, proving ALL rather than OR. Pure tests also cover independent multi-tag combinations.
7. **Sort:** stable descending local YYYY-MM-DD date, same newest-first behavior as old timeline; createdAt/updatedAt irrelevant. Sorting uses copies, no source mutation.
8. **Paging:** validate readable source → filter entire history → sort matches → slice cumulative limit30/60/90. Return entries,total,hasMore. Query/tag change resets30; Clear empties both/reset30. LoadMore focuses first newly shown source button. UI state survives editor visits only in the tab; reload resets it.
9. **>30 evidence:**75-record fixture entry55 (2026-08-13) found with dac biet before LoadMore. Filtered45 matched records rendered30 then45 (final15), not slice-before-filter. After60 unfiltered results, Gym reset to30/37 in the fixture where one even entry had been explicitly deleted.
10. **>60 evidence:** actual30→60→75 records;75 unique date/source labels, original first30/60 retained, final15, no skip/duplicates and no LoadMore at75. Pure tests independently compare slices and uniqueness.
11. **Zero-write evidence:** owned synthetic8782 probe counts Storage set/remove/clear and IDB write transactions. Search/tag/paging/Clear/open result/return produced0 JSON and0 photo writes; exact raw JSON string and photo metadata equality, changedDomains=[] after resetting baseline to current data. Empty history read also0writes. No persistent timestamp touch, repair or hidden metadata.
12. **Edit/delete refresh:** search old55, edit title/tags, Save, return derives canonical source and removes old match; new query finds edited title. Subsequent confirmed Delete removes match; reload shows74 persisted records and deleted55 stays absent. Delete cancel/Escape0writes; explicit Delete1JSON+1photo write. Existing policy removes daily55 only; same-date food55 and unrelated daily-other retained. Other state domains compare unchanged. Literal HTML query found61st record and remained text, with0img/script nodes in results. Retrieval rejects malformed shapes without repair/skip; source/backup validation remains strict.
13. **My Day regression:** valid synthetic fixture Home→Xem ngày2026-10-03→Journal exact03→Save updated title→return exact03/current title/photo. No retrieval-return button injected into MyDay-opened editor. Recent Gym tag toggle add/remove retained original tags and0writes before Save. Earlier invalid fixture tag length was correctly rejected; corrected fixture was used for successful Save verification, not a relaxed validator.
14. **Mobile:** actual iframe320/360/390, content client/scroll305/305,345/345,375/375 (15px scrollbar).14 chips, long Vietnamese query, query typing focus, selected filters, Clear, result cards, LoadMore60 and no-result checked. No horizontal overflow. New-result source button48px, bottom404/404/404 above navigation top673/688/688. Final removed-tag fallback explicitly retested320: search top356/bottom404 above nav673. Screenshot and measured JSON ignored under.local; no physical-device claim.
15. **Accessibility:** labeled native search; semantic fieldset/legend/buttons, aria-pressed and checkmark/active text; status count, disabled Clear when inactive. Tab/Shift+Tab, Enter/Space, Escape cancel, visible blue2.4px focus; Clear→search, LoadMore→first new source. Removed-chip bug reproduced BODY focus, then offscreen search with preventScroll; fixed connected-chip focus vs normal fallback search focus and proved visible320. Chips44px/source48px. Selected hover contrast fixed from white-on-yellow to rgb45,45,45 on rgb255,249,196; browser computed hover/focus state verified. No screen-reader/WCAG certification.
16. **Privacy/security:**100% local retrieval; no dependency/CDN/font/analytics/AI/network service added. Safe existing textContent APIs for query/title/note/tags, no unsafe user HTML. User8765 origin untouched; all fixtures/probes/screenshots on owned8782 and ignored.local. Private master unchanged/not staged.
17. **Performance decision:** pure in-memory linear filtering plus sorting sufficient for observed75-record workload; typing updates only result/status nodes, preserves input. No fuzzy engine/index/worker/backend. No quantified latency, large-history or photo-I/O benchmark claim. Full source validation on read is deliberate fail-safe behavior, not automatic data repair.
18. **Files:** new js/journal-retrieval-ui.js and tests/journal-retrieval.test.js; behavior changes js/journal.js, js/app.js, css/style.css. index and other JS import URLs29→30 are cache-only; no Gym/Nutrition architecture change. Docs V4_ROADMAP, this report, DATA_MODEL, README, TRACKER_PRODUCT_IDEAS, existing FULL_STEP_BY_STEP_GUIDE.txt; ignored private summary updated. Requested guide.md absent, existing guide.txt reused. No test fixtures/probes/private data committed.
19. **Git:** local main code334d541; focused contrast checkpoint79e60eb; docs checkpoint named Record Phase5B retrieval evidence and Phase5 completion. Main status inspected after docs commit; no remote command/push/branch split/reset/history rewrite. Cached origin comparison is not remote verification.
20. **NOT VERIFIED:** physical phones/mobile Safari/other engines/screen reader/WCAG certification/native quota/very large history/photo-library performance/power loss/all source editor races/manual full-image backup roundtrip this milestone. Existing regression tests pass; not every Gym/Nutrition/Check-in/Knee UI workflow was manually repeated in5B. Historical iframe observer attribution remains unproven; current5B harness and standalone captured warning/error logs empty. No deployment/backend/AI/cloud performed.
21. **DONE gate:**29/29 passed in this documented local scope (matrix below).5A and5B implemented/tested; Phase5 complete. No blocking schema/date/ownership decision and no remaining important retrieval bug in exercised flows.
22. **Exact next phase:**Phase6 — faster food reuse và cookbook: bounded approved milestone for existing food/recipe reuse, selective/multi-item review and safe logged snapshots; persistent additions require migration/tests when needed. No Phase6 implementation started. **STOP here; await a separate task.**

## Phase5B 29-gate matrix

| Gate | Evidence / result |
| --- | --- |
|1 Baseline216 retained |PASS; original files/assertions unchanged,231final |
|2 Schema8 |PASS; no persistent fields/migration |
|3 Local full-text |PASS; pure tests + browserB/C/D |
|4 Vietnamese accents |PASS; NFD/đ tests + met/tap gym browser |
|5 Title/note/tags |PASS; independent per-field cases |
|6 Tag filtering |PASS; exact normalized equality |
|7 Query+tags composition |PASS; ALL and AND,23match/0exclusive browser |
|8 Full history before slice |PASS; entry55 without LoadMore |
|9 >30 paging |PASS;30→60, filtered45→30/45 |
|10 >60 paging |PASS;30→60→75 |
|11 No duplicate/skip |PASS;75unique dates and stable prefixes |
|12 Filter reset |PASS;60→30/37 after Gym, query reset/mobile |
|13 Clear restores |PASS;30/75, search focus, disabled Clear |
|14 Empty vs no-result |PASS; distinct rendered messages |
|15 Source date/navigation |PASS; Aug13/Aug07 exact editor |
|16 Old edit/return |PASS; renamed title/tag disappears, new search finds |
|17 Delete/return |PASS; disappears and reload retains74 |
|18 MyDay↔Journal |PASS; date03 valid Save/return/title/photo |
|19 Retrieval0writes |PASS;0JSON/0IDB + exact raw/metadata equality |
|20 No cascade |PASS; unchanged other domains; food/unrelated daily photos retained |
|21 Immutable source |PASS; frozen-input tests, browser raw equality |
|22 Mobile3widths |PASS;320/360/390 no horizontal overflow |
|23 Keyboard/focus |PASS; Tab/ShiftTab/Enter/Space/Escape, focus fixes |
|24 Local privacy |PASS; relative modules/text APIs/no new remote service |
|25 All previous tests |PASS;216retained |
|26 New tests |PASS;15new groups |
|27 Syntax/diff |PASS;53node --check + clean git diff --check |
|28 No Phase6 |PASS; source/doc scope inspected |
|29 No GitHub push |PASS; local checkpoints only |

---

# Tracker V4 — Phase5A Xem ngày release

06/10/2026 · **Phase5A IMPLEMENTED / TESTED in verified local scope. All25 gates passed. FullPhase5 remains incomplete until5B Journal Retrieval. STOP before5B.** Schema8 stays8. Local main codeffe8279; separate docs checkpoint follows in Git log. No push/fetch/reset/history rewrite. The Phase4 and earlier reports below are historical.

## Phase5A report — all32 requested items

1. **Baseline → final tests:** clean main6b76064,197/197→216/216,0failed/skipped/todo. Existing197 tests and assertions unchanged.19 new groups across tests/my-day.test.js and tests/my-day-photos.test.js. RED missing read-model/photo exports→GREEN; additional RED photo-error empty=true→GREEN unknown=null. Browser reproduced entry-row null arithmetic before canonical helper reuse fixed it.
2. **Schema:**8→8, no fields/entities/migrations added, no dailySummary/myDay/cachedDay or persisted selected date. Existing migration/backup/identity tests pass. Photo DB1 and backup format1 unchanged.
3. **Date semantics audit:** every domain joins its saved local YYYY-MM-DD date. Journal/photo createdAt/updatedAt and session updatedAt ISO do not determine membership. Knee moment does not shift saved date. Daily photos attach by date/category; food/recipe owner IDs refer to definitions, never meal dates. DATA_MODEL table records the audit. Noon/calendar stepping and localDate avoid bare YYYY-MM-DD parsing; month/year/leap/local midnight/ISO-near-midnight/future/invalid/empty tests pass.
4. **Read-model architecture:** pure daySummary derives journals, compact completed sessions, cardio/check-ins/knee, canonical food totals/counts, photo metadata, presence and source view/date references. No writes or Blob loads. readDay isolates metadata errors; UI renders JSON immediately, then metadata/thumbnails asynchronously. Frozen inputs tested, no plan/ownership edits.
5. **Persistent writes audit:** browser-owned probe counted0 JSON and0 photo writes for open/date controls and source navigation before Save. Audit showed exact JSON string and photo metadata unchanged. Initial full-day5photos:0 original URLs,4 thumbnails and one missing placeholder. Fake IDB test also verifies0readwrite transactions and no database created by an empty read. Explicit Journal Save produced1 JSON write; Check-in Save/delete produced2, not viewing.
6. **Journal behavior:** current MOODS unchanged; drained means Mệt. Title,280-character note excerpt and existing tags rendered with textContent; literal HTML remains plain text. Contract is one entry/date in source editor and strict backup, with duplicate-date rejection test. Defensive read retains every matching record rather than silently choosing one; no auto Gym tag.
7. **Workout behavior:** only data.sessions completed history, never active draft. All workouts/date displayed by frozen session title/source label. Counts are distinct exercise owners with saved sets and exact saved sets.length (label bài đã ghi), not current template size or fabricated performed exercises. Recorded exercise names/notes are compact; source opens date-filtered history, not a persisted history-edit draft.
8. **Phase4 replacement-history:** actual browser fixture includes replaced Pulldown25kg and successor15kg, each one set, showing2bài/2hiệp; history retains each exact owner, closed state and Thay cho link. No chain expansion, volume recalculation, set movement or consumer rewrite. Automated runtime-complete fixture deep-equal ownership/snapshots retained; all Phase4 tests unchanged.
9. **Cardio:** all records shown, actual activity/minutes/optional distance/intensity/notes only. Multiple activities kept independently from Gym. Source action opens the exact record/date in existing editor. No calorie estimate or rest-day label.
10. **Nutrition totals/null:** uses dailyTotals, now propagating null/undefined independently for each macro; actual zero remains numeric zero. My Day no-entry totals=null, never logged0kcal. Existing food/recipe logging and strict backup still require known macros: null fixtures are defensive legacy/manual readable-state tests, not a new supported unknown-macro import/logging feature. Browser2items/2meal-label groups=350kcal/P28, unknown C/F matched source totals; row detail also uses canonical helper. Deleting Dinner returned150kcal/P12/C18/F4.5.
11. **Check-in:** all same-date records retained; weight/waist/sleep and optional knee/notes shown only if recorded. Browser2records (one measurements, one sleep-only) preserved. Exact source editor70→71kg Save then second-record delete; return showed71kg and1record with other cards still present. No trend inference.
12. **Knee:** optional compact details card, current moment/pain/swelling/instability/stiffness/notes, unknown values stay unrecorded. Exact source date/record inspected. Record-only wording; no diagnosis/safety score/recommendation.
13. **Photo metadata/thumbnail:** new readonly metadata cursor projection, selected thumbnail getter. Original and thumbnail handles are co-located in existing IDB records; cursor.value receives structured-clone handles internally but original bytes are never decoded/retained or turned into URLs by My Day. Metadata result strips both binary fields; no getAll or new photo format/index layer. Missing thumbnail stays missing, no original fallback. URL lifetime and detached-host checks retain isolation.
14. **Photo-only day:** actual5photo fixture on2026-10-03 displayed date+strip without journal/nutrition/check-in/workout or whole-day empty.0writes/0originalURLs/4thumbnailURLs, metadata and JSON unchanged. Orphan food owner remains a visible photo on its own date, not repaired or reassociated.
15. **Empty day:** selected empty/future day says Chưa có bản ghi with light source shortcuts; no zeros/failure/rest-day language or placeholder creation. Empty domains hide large cards; useful compact nutrition missing text where other JSON records exist. If metadata fails and JSON is empty, no universal-empty claim: scoped JSON absence plus photo error; readDay.empty=null.
16. **Multiple records/day:** full browser fixture2completed workouts,2cardio,2food items/2meal labels,journal,2check-ins,knee,5photos. All kept, photo IDs counted once, distinct domains not merged. Automated combined/multiple tests pass.
17. **Date navigation:** previous/next exactly one calendar day; no skips, date picker/future allowed; Hôm nay local client date. Invalid/blank picker reports Chọn ngày hợp lệ and writes nothing. Browser year/month/leap cases and Today Enter/Space tested.
18. **Route/reload:** existing in-memory show/render retained; My Day is a today-group subview, no primary tab/framework/query or persistent route. Selected date remains during source visits/return. Reload on standalone app returns Dashboard; next My Day2026-10-06 (actual client today), selecting04still shows prior saved JSON/photos. Documented in README/guide/model.
19. **Source links:** Journal/Nutrition exact selected date; Gym history filter with view-all; Cardio/Check-in/Knee exact record/date; Photos gallery selected-date filter/view-all. Lightweight return button, no duplicate editors. All exercised in synthetic browser; source navigation itself0writes, photo source retains original gallery behavior separately.
20. **Source edit/delete refresh:** return show reloads canonical JSON and reads fresh metadata. Actual Journal title/note edit, Nutrition item delete and Check-in edit/delete reflected immediately. No cached summary. Automated update/deletion tests retain unrelated arrays.
21. **Independent failures:** simulated IndexedDB.open failure left every JSON card visible with photo warning. Missing thumbnail placeholder observed. Pure tests cover error on JSON-empty day and unsupported IDB/getter failure. Core loadData and identity validation stay fail-closed; no catch bypass/repair of corrupted JSON. My Day adds no cascade; existing explicit source deletion policies are preserved, including confirmed Journal+daily-photo deletion.
22. **Mobile320/360/390:** actual iframe widths; content client/scroll305/305,345/345,375/375 because15px scrollbar. One grid column, all populated cards, long Vietnamese title/exercise/note text, nutrition, photo strip and empty date controls checked. Buttons48px; last photo action bottom561/576/571px above nav top673/687/687. Screenshot and DOM measurements retained ignored under.local. Not physical phones.
23. **Accessibility:** semantic h1/h2/h3, wrapped date label, real buttons, native details, meaningful source names and metadata-based image alt. Tab moved previous→next; blue2.4px visible focus+2.4pxoffset inspected, Enter/Space activated date controls, focus restored after date rerender. Source button focus/bounds verified all3mobile widths. No screen-reader or WCAG certification claim.
24. **Performance:** no original photo byte decoding or original URLs on initial My Day; cursor metadata scan then thumbnails only for chosen date, no per-card whole-history recalculations or persisted indexing layer. Existing source gallery may open full-image URLs after explicit source navigation. No throughput/memory benchmark or large-library claim; physical IDB co-location caveat recorded in PHOTO_STORAGE.
25. **Security/privacy:** only local relative modules/Blob thumbnail URLs; no new CDN/fonts/analytics/upload/backend/remote AI. Existing textContent renderer handles user text; literal markup browser test did not create images/scripts. Fixtures/screenshots/probe scripts ignored; private MASTER_PLAN unchanged and not staged. User8765 origin untouched.
26. **Regression suite:** all197 original assertions retained: identity/Replace/history/backup/picker/planningDraft/Nutrition/Journal/photo/recovery/migrations. Final216 pass,51JS syntax checks, git diff --check clean after EOF cleanup. Independent read-only reviewer ran215test interim tree and found no blocking/important defect; final extra failure-absence test was verified locally.
27. **Browser actually tested:** Aempty/future, Bjournal-only/edit, Cnutritionmulti+null/source/delete, Dcompleted+replacement history, Eall-domains multiple, Fphoto-only, Gsourceedit/delete return, Hmonth/year/leap/Today/blank, Istandalone reload/data retention. Extra metadata fault, missingthumbnail, zero-write/source/date audit, keyboard and320/360/390 full/empty. Current harness and standalone captured warning/error logs empty. Older iframe observer attribution remains unproven; do not generalize historical logs.
28. **Files changed:** created js/my-day.js,my-day-ui.js,tests/my-day.test.js,my-day-photos.test.js. Behavior changes app/data/navigation/photo-store/session-ui/CSS; index/import URLs28→29 (remaining JS edits cache-only). Docs README,DATA_MODEL,PHOTO_STORAGE,TRACKER_PRODUCT_IDEAS,V4_ROADMAP,this report,FULL_STEP_BY_STEP_GUIDE; ignored private TONG_KET updated. No dependency/PROGRAM/master/source plan change. No test fixture/probe/screenshot committed.
29. **Git:** codeffe8279 on existing local main; separate docs checkpoint named Record Phase5A date audit, release gates and browser evidence. Final status inspected after that commit; no remote operation/branch split/history rewrite/private staging. Cached origin/main comparison is not remote verification.
30. **NOT VERIFIED:** physical phone/mobile Safari/other browser engines/screen reader/nativequota/large photo-library I/O/performance/power loss/user private profile/full image backup roundtrip this milestone/every editor race. Existing image backup regression tests pass, but no repeat manual full-Blob backup test. No deployment/backend/AI/cloud performed. Unknown-macro fixture is not a valid new food/recipe import contract.
31. **5A DONE gate:** all25 required gates passed in this documented local scope; matrix below. No blocking date/ownership ambiguity. Only5A marked implemented/tested; Phase5 NOT DONE.
32. **Exact remaining5B:** local Journal full-text/tag retrieval, useful filter/clear/no-result states, paging beyond current30entry timeline, preserve dates/source navigation, pure search/filter and paging tests, saved older-entry edit/return browser flows, mobile/accessibility/privacy/regression/docs/checkpoints. No5B feature added. Recommend GPT-6.1-sol/high. **STOP here.**

## Phase5A 25-gate evidence

| Gate | Evidence / result |
| --- | --- |
|1 Baseline197 retained |PASS; final216, original assertions unchanged |
|2 Schema8 |PASS; no persistent fields/migration |
|3 Derived/read-only |PASS; pure frozen-input tests + browser probes |
|4 No persisted summary |PASS; state key structure and code diff |
|5 Local dates |PASS; model audit + boundary/midnight/ISO tests + browser |
|6 Neutral empty |PASS; A/future and all3mobile |
|7 Photo-only |PASS; F5photos, no journal |
|8 Journal |PASS; drained=Mệt/tags/title/note/source Save |
|9 History |PASS; Dall sessions, draft excluded |
|10 Replacement ownership |PASS; exact owner/set tests + Dsource history |
|11 Cardio |PASS; E2activities and exact source |
|12 Canonical nutrition |PASS; helper reused, Cmatches source |
|13 Null not zero |PASS; defensive helper fixture/browser C/rowfix |
|14 Check-in |PASS; E2records, edit/delete G |
|15 Knee record-only |PASS; details/source fields/wording |
|16 Metadata/thumbnails |PASS; no getAll/binary result/original URL; co-location caveat |
|17 Source links |PASS; all7domain targets exercised |
|18 Edit refresh |PASS; Journal and Check-in source Save |
|19 Delete refresh |PASS; Nutrition and Check-in source Delete |
|20 No cascade mutation |PASS; view has no mutation, zero-write audit; source policies unchanged |
|21 Opening/date0writes |PASS; JSON exact equality/metadata/probes; absentDB test |
|22 Mobile3widths |PASS; measured populated+empty/nooverflow/source above nav |
|23 Keyboard/focus |PASS; Tab/Enter/Space/outline/source bounds |
|24 Full suite |PASS;216/216+51syntax+diff |
|25 No5B creep |PASS; no text/tag search or paging added; STOP |

---

# Tracker V4 — Phase4B-4 Live Replace / Phase4 release

06/10/2026 · **4A approved;4B-1/2/3/4 IMPLEMENTED / TESTED. All30 final gates passed in documented local scope. STOP before Phase5 My Day.** Work started05/10, completed06/10. Schema8 stays8. Code checkpoint61de602; separate docs checkpoint follows in local main Git log. No push/fetch/reset/history rewrite. Older reports below are historical.

## 4B-4 report — all37 requested items

1. **Baseline → final tests:** clean main08e533f,180/180 →197/197,0failed/skipped/todo.17 new test groups in tests/session-replace.test.js; existing180 tests/assertions retained. TDD RED missing Replace helpers/command → GREEN; new imported-prescription and decimal/whitespace timer regressions reproduced before fixes.
2. **Schema:**8→8; no entity/field/migration added. Existing1–8 migration/legacy/backup suite passes. Photo IndexedDB/backup format1 unchanged.
3. **Replace architecture:** existing canonical command/store queue + Web Lock; session-structure validates proposal, runtime clones/validates complete candidate, increments and persists once. Always close-old + append successor, including0logs. No source/template write.
4. **Replace0:** old ID/catalog/source/ordinal/snapshot/order entry retained, status replaced; fresh successor UUID/sourceSlotId=null/replacesSlotId=old.id/active. No fabricated sets. Cancel/Escape returns focus and writes nothing; browser reopen/Confirm/reload retained0/3 old row.
5. **Partial:** actual UI logged25kg and27kg source sets, then default successor1, logged31kg there, reload/Complete. Actual exports deep-equal every old set and old snapshot except closed status; new set has successor owner. Earlier browser run also exercised explicit old history set correction25→26 separately.
6. **Remaining:** max(0,source.snapshot.sets minus saved count with exact source.slotId). Count includes saved overrun; no display-position/setNumber/max/ancestor aggregation.3target/2saved→1;3/3 and3/4→0.
7. **Successor review:** raw source reps/RIR/rest retained, including ranges/unilateral/unknown/imported free text. User may edit target/prescription/notes before Confirm; edited values use current Builder bounds and documented text grammar. Source snapshot never rewritten. Unchanged imported values are retained, not coerced to internal validation placeholders.
8. **Edited target labels:** remaining1→accepted3 says **3 hiệp mới**, with source remaining1. Browser Confirm/log/reload/Complete retained3target and old2logs. Empty/invalid prescription rejected, no automatic volume addition.
9. **Load/setup isolation:** successor set fields start blank, including after previous performance exists; no auto Quick Fill from predecessor. New candidate definition notes/setup accepted separately, latest equality guarded. Old setup/technique shown read-only; old actual load/reps/RIR untouched.
10. **Shared Picker:** same Phase3 module with optional liveReplace metadata/review callback. Single pending choice, accent-insensitive search, muscle/equipment/movement AND, ranking/alternatives, manual choice, clear/no-results/selected state retained. Current source omitted; other active catalog IDs disabled. Closed IDs can create distinct occurrences. No equivalence/medical claim.
11. **Candidate changes:** exact definition/setup snapshot captured on review; archived/deleted/edited/setup-changed candidate rejects inside locked mutation. Failed review retained safely; user must reopen/review latest. Automated custom/long Vietnamese/missing-equipment cases pass; missing equipment appears unfiltered and excludes equipment-specific filters.
12. **Registry/order:** successor appended at registry end; existing ordinal and set.exerciseIndex unchanged. Insert new ID immediately after old in order; later active Reorder can break adjacency without breaking identity. Cap100 counts all active/removed/replaced entries;99→100 allowed,100/101 extension rejected without truncating imports.
13. **replacesSlotId:** exact old UUID link, no positional inference. Existing validators reject dangling links/cycles/duplicate successor; whole invalid candidate fails closed without repair/deletion.
14. **Chain A→B→C:** automated and actual browser: A3/log1→B2/log1→C1; each catalog/snapshot/log owner independent. C remaining only from B. Reorder/reload keeps chain; link-based labels follow predecessor despite nonadjacent rows.
15. **Remove successor:** C removed while A/B remain replaced; all links/logs/snapshots kept. No reopening. Closed old set correction/delete does not rebudget/reopen successor. To train old exercise again, Add creates fresh occurrence.
16. **All complete:** Replace disabled with “Đã ghi đủ hiệp; dùng Thêm bài nếu muốn tập thêm.” No target0. Browser3saved showed disabled Replace; Add/Confirm still worked. Overrun4 automated.
17. **Dirty gate:** valid Back/Save/Discard; invalid Back/Discard, no Save. Actual Back/Escape retained input, explicit Discard reset only unsaved set fields. Save before picker requires choosing Replace again; Save during picker marks review stale, keeps fields, offers Duyệt lại phần còn lại. No old intent replay. Cancel also removes recheck panel without clearing unrelated fields. Existing dirty metadata/setup block behavior retained.
18. **Focus/timer:** successful Replace focuses successor UUID and empty weight input; nextIncomplete follows active order. Verified focus at320/360/390, scroll into view. Existing running timer kept Pulldown/2min or Fixture row/1.5min label through Replace; explicit future successor rest action used30s. Decimal1.5min=90s/0.5min=30s and whitespace now parsed correctly; ranges use minimum. No timer reload promise.
19. **Atomic write/revision:** one Replace command, one cloned whole-session validation, one persistence write, revision+1. Close/new never split into separate writes. Cancel/validation/stale/quota/unsupported lock/overflow add0 persisted revisions. Disk remains old or full replaced state.
20. **Same-tab queue:** captured immutable full baseline and candidate, execution check and locked latest guard reused. Queued log→Replace and Replace→Complete reject second stale intent; no lost logs/resurrection/merge. Unrelated concurrent food note retained. Existing log/log serialization behavior unchanged when structure unchanged.
21. **Multitab tests:** eight two-client first-writer pairs: log/Replace,Replace/log,Reorder/Replace,Remove/Replace,Replace/Complete,Complete/Replace,Discard/Replace,Start-switch/Replace. Second stale rejects, exact winning bytes preserved. Separate same-tab pairs cover remaining required sequences. Actual standalone tabs also verified stale log after Replace keeps input34kg.
22. **Critical remaining race:** actual tab B reviewed2remaining, tab A logged second source set; B old Confirm rejected and pending review remained. No target2 successor written. Explicit cancel/reload/review showed1remaining, manual Confirm succeeded. Same scenario automated with disk comparison.
23. **Failure/quota:** automated quota/storage/overflow/unsupported-lock/raw/unknown/history/malformed/restore-epoch tests preserve bytes/status/revision, no half successor. Owned synthetic browser failure harness threw on fitness setItem; error/no false Saved/pending retained, source active/6registry/revision1; actual exported entire state deep-equal baseline. Disable test fault and explicit new review/Confirm worked. This is simulated persistence failure, not genuine storage pressure.
24. **History/ownership:** Complete retains final registry/order/status/snapshots/links and exact old/new sets. Actual history2old+1new, chain A/B logs separate;0log predecessor/successor show Chưa ghi hiệp, no fake performance. Thay cho labels read links, not adjacency.
25. **History editor restriction:** actual reopen had0Add and0Replace; controls function also restricts Remove/Reorder. Exact closed old set correction/Complete exercised; existing history changed/deleted-source CAS/unknown-base/recovery suite passes. Full old CAS browser matrix from4B-2 not repeated this milestone.
26. **Quick Fill/consumers:** replacement does not redirect predecessor performance; exact occurrence selection remains when same catalog ID repeats, including empty duplicate. exerciseHistory counts old/new saved data once;0logs excluded. Existing progress, focus, Phase2 recovery/backup and Phase3 Builder tests retained. Actual Builder Replace kept same slot/order/2sets/8–12/RIR2/90s and recovered after reload; live semantics separate.
27. **Source isolation:** automated PROGRAM and every non-session domain deep comparisons; actual before/after exports kept plans/activePlanId/customExercises/planningDraft/settings/Nutrition/Journal/Progress and prior history unchanged. Additional actual custom-source deletion test proves frozen snapshot Replace/Complete still work after plan removed. Private MASTER_PLAN and program definitions not edited/staged; private project summary updated separately.
28. **Backup/restore:** backup8 preserves UUIDs/source IDs/link chain/ordinal/order/status/raw snapshots/sets/revision. Actual Settings clipboard→ignored synthetic file→chooser preview→backup checkbox→explicit restore→reload→clipboard export deep-equal entire chain dataset. Failure exports also exact. Photo format/storage unchanged; full image-blob restore not repeated in this milestone.
29. **Actually tested browser:** synthetic127.0.0.1:8778 ONLY; A0Cancel/reopen/Confirm/reload, B2old→1new/Complete, Cedited3target/log/reload/Complete, Dcomplete-disabled/Add, Echain/Reorder/reload/Remove, Fvalid/invalid dirty Back/Save/Discard, Gtwo real tabs critical/opposite stale, Hstorage fault and manual retry, IComplete/history reopen/correction. Also no-results/clear, source-isolation exports, chain backup restore, timer and Builder/recovery regression. User8765 origin untouched; no private photos uploaded.
30. **Actually tested mobile:** same-origin iframe content boxes320/360/390, actual document client/scroll305/305,345/345,375/375 (scrollbars consume15px). All3picker/filter/review/edited target/dirty/history tested; conflict at360/390, valid Save at320, valid Discard360, invalid/noSave390. Separate successful Confirm/focus at all3;48px Confirm above bottom nav, successor weight empty and visible. Screenshots .local/b4-mobile-review.png, b4-mobile-history.png, b4-mobile-success.png. Iframes, not physical phones.
31. **Actually tested accessibility:** Tab between Confirm/Cancel; Enter/Space activate real buttons, Escape cancels picker/dialog; aria-pressed pending state, disabled complete-source Replace, explicit field labels, visible focus ring, Cancel source focus and success successor focus observed. Confirm viewport bounds at360/390 above nav;320 screenshot and focused weight bounds inspected. No screen-reader/WCAG certification claim.
32. **Final checks:**197/197 tests,0fail/skipped/todo;47JS syntax checks; git diff --check clean. Actual export audit checks old sets/snapshot/source/prior-history isolation,2+1ownership, failure exactstate and chain restore. Fresh standalone warning/error logs empty. Iframe harness logs captured a MutationObserver.observe Node error; app/harness source contains no MutationObserver. Browser instrumentation is suspected, not proven; do not claim every iframe console clean.
33. **Files:** created tests/session-replace.test.js. Behavior edits js/session-structure.js,session-runtime.js,live-workout-ui.js,exercise-picker-ui.js,session-readers.js,session-ui.js,workout.js. index/import URLs26→28; remaining JS edits cache-only. Updated README,DATA_MODEL,PHASE4_LIVE_WORKOUT_CONTRACT evidence,V4_ROADMAP,this report,FULL_STEP_BY_STEP_GUIDE and ignored private TONG_KET. No CSS/dependency/schema/program/photo logic changes. All synthetic fixtures/exports/screenshots ignored under .local.
34. **Git:** local main code61de602; separate docs checkpoint in Git log/final handoff. Final tracked status inspected after commit. No push/fetch/reset/branch split/history rewrite; no private master/summary/test data staged. Local origin/main reference is only a cached comparison, not remote verification.
35. **NOT VERIFIED:** physical devices/mobile Safari/other browser engines, screen reader, genuine nativequota/storage pressure, crash/power-loss durability, huge photo backup, direct IAB downloaded-file completion and every possible form/candidate timing. Clipboard file/restore is verified. Iframe observer error attribution remains unproven; standalone exercised app has no captured errors. No deployment/backend/remoteAI performed.
36. **Phase4 DONE gate:** all30 required gates passed in this verified local scope (matrix below);4Aapproved +4B-1/2/3/4 implemented/tested. No claim that NOT VERIFIED device scenarios passed. No open identity/ownership/atomicity blocker found after review fixes.
37. **Exact next step:** Phase5 My Day + journal retrieval proposal/design per V4_ROADMAP, after user request and home/subview decision. Recommend GPT-6.1-sol/high for date/source integration. **STOP here; no Phase5 code**, Nutrition6/WeeklyReview/backend/AI/PWA/Undo/catalog/template promotion started.

## 30-gate release evidence

| Gate | Result / evidence |
| --- | --- |
|1 Schema8 |PASS; model/migration suite unchanged |
|2 Close-old + successor |PASS; Replace0/partial runtime + browser |
|3 Same0/partial rule |PASS; independent UUID/logs in both |
|4 Old identity immutable |PASS; deep snapshot/ID/ordinal comparison |
|5 Old sets never move |PASS; unit and actual export deep equality |
|6 Fresh successorUUID |PASS; UUID test + exported owners |
|7 Correct link |PASS; chain/link validators |
|8 Insert after old |PASS; exact order test |
|9 Remaining correct |PASS; partial/overrun/chain/race |
|10 Edited label |PASS; browser1→3 hiệp mới |
|11 No load/setup copy |PASS; independent candidate review/empty form |
|12 Complete disabled |PASS; browser3saved + automated overrun4 |
|13 A→B→C |PASS; browser/backup/test |
|14 Remove no reopen |PASS; browser old A/B stay closed |
|15 One successor |PASS; invalid duplicate chain rejected |
|16 Dirty gate |PASS; valid/invalid/manual fresh review |
|17 Atomic |PASS; one-write/runtime/storage failure |
|18 Revision+1 |PASS; cancellation/failure+0 persisted |
|19 Stale budget reject |PASS; real two tabs2→1 |
|20 Same-tab queue |PASS; first command wins, second stale |
|21 Multitab |PASS;8pairs + actual both directions |
|22 No half-close |PASS; exact failure export/state |
|23 History owners |PASS; actual2old+1new/chain |
|24 History controls absent |PASS; reopen restriction/correction |
|25 Backup exact |PASS; actual chain restore deep-equal |
|26 Sources unchanged |PASS; full domain compare + deleted custom source |
|27 Mobile3widths |PASS; actual iframe UI/focus/nooverflow |
|28 Full suite |PASS;197/197 +47syntax |
|29 No template promotion |PASS; source isolation + scope diff |
|30 No Phase5 |PASS; no implementation diff;STOP |

## Historical Phase4B-3 report (older checkpoint)

# Tracker V4 — Phase 4B-3 Live Add / Remove / Reorder

05/10/2026 · **4B-3 IMPLEMENTED / TESTED. Schema8 unchanged. Phase4 NOT DONE.4B-4 NOT IMPLEMENTED; STOP.** Local main; code checkpoint fe3f8b9, separate docs checkpoint in Git log. No push/fetch/reset. Older reports below are historical evidence.

## 4B-3 report — 32 required items

1. **Baseline → final:** clean main74d9dac,167/167 tests →180/180. First Add/Remove/Reorder tests failed against old runtime; queue stale regression also demonstrated RED before fix. Browser badInput/focus failures reproduced before fixes and checked afterward.
2. **Schema:**8 remains8. No new stored fields/entities or migration; existing7→8 behavior untouched. Photo DB1/format1 unchanged.
3. **Add architecture:** js/session-structure validates eligible live canonical session and accepted candidates; session-runtime command/store owns persistence. Raw legacy/history/unknown baseline/recovery/malformed paths cannot structurally mutate.
4. **Shared Picker:** same Phase3 createExercisePicker; optional renderReview/contextText/review outcome. Search/AND muscle/equipment/movement filters, pending/toggle/clear/no-results/focus retained. Builder Add/Replace/recovery also exercised this milestone.
5. **Defaults/review:**2sets,8–12 reps,RIR2,90s, editable notes before Confirm. Clearly default configuration, not MASTER_PLAN prescription; no chosen load/medical claim. Accepted definition/setup and raw prescription fields remain in transient pending review.
6. **Atomic batch:** validate all latest definitions/exclusions/prescriptions/setup/cap before append in one locked persistence write. Selection-order UUID occurrences, null sourceSlotId/replacesSlotId, active status and accepted snapshot. No sets fabricated. Failure keeps pending inputs and disk unchanged.
7. **Cap:**100 registry entries including active/removed/replaced.99→100 passes;100/101 extension rejects. Imported101 retained, never truncated. Cap limits Add only; not a training recommendation.
8. **Remove0:** explicit confirmation, status removed only; row shows Dừng bài0/target. Registry/order/snapshot preserved; reload retains it.
9. **Remove partial:** browser2/3 confirmation says2saved sets retained; both remain, third new log unavailable. Existing exact correction works without reopening tombstone. Automated checks preserve every set field/array order/snapshot/target.
10. **Add-after-Remove:** same exercise permitted once inactive, fresh UUID appended. Browser logs under new occurrence while old2logs remain; actual exported IDs/owners checked.
11. **Reorder:** swap neighboring active positions in order[] only. Inactive positions fixed; registry/set arrays never sorted/reindexed. Boundary/single-active controls disabled. Sparse inactive movement tested.
12. **Ownership:** slotId/immutable registry ordinal/exercise ID/name/setNumber stay bound; actual post-Reorder log/reload and automated deep comparisons confirm. Existing duplicates remain distinct.
13. **Focus/next:** same occurrence remains focused; if moved button becomes disabled, focus uses enabled same-slot control. Next incomplete follows current active order. Browser focus mode after Reorder chose new first incomplete and saved correct owner.
14. **Timer:** Reorder/Remove leave captured label/duration alone; browser checked90s Lat pulldown and2min RDL, including after Remove. No timer reload recovery guarantee added.
15. **Dirty gate:** valid Back/Save/Discard, invalid Back/Discard only, including '-' badInput whose value is empty. Escape/Back keep inputs. Save sequential canonical writers, retain Add review, restore focus to review search and require manual structural retry. Other dirty metadata/setup blocks with existing flow. Browser valid/invalid Reorder, Add and Remove plus metadata block exercised; no silent coercion.
16. **Revision/full baseline/lock:**+1 per successful structural command, zero persisted change for failure/cancel. Captured full structural baseline checked at queue execution; latest ID/revision/full envelope inside Web Lock. Review fixed stale zero-log Remove upgrading after a queued log.
17. **Same-tab queue:** uses existing queue/epoch. Structural stale commands and downstream commands after slots/order change reject; no blind replay. Old log/log own-baseline serialization retained when structure unchanged. Rapid Reorder/log, log/Reorder, Add/Complete, log/Add and Add/Remove tests pass. Caller mutation after enqueue cannot change picks.
18. **Multi-tab:** automated ten first-writer pairs include log/Add, log/Remove, Reorder/log, Remove/edit, Complete/Add/Remove/Reorder, discard/Add, switch/Reorder and reopen/Add. Two actual tabs tested stale Add/Remove/Reorder and stale log after Reorder; inputs/pending preserved. Explicit reopen-current/review/retry succeeded; no replay/source overwrite.
19. **All-inactive:** synthetic single-slot0logs and saved1log cases tested. Add available; zero-log Complete rejects without deleting draft; focus mode/tombstone readable; reload retains draft. Add-after-all-inactive continues; saved1log Complete only after explicit action.
20. **Complete/history:** final10registry rows/order/status and5actual sets retained in browser history; zero-log rows show Chưa ghi hiệp rather than performance. Source/template edits do not rewrite snapshot history. Later synthetic all-inactive history shows0/2 and1/2 separately.
21. **History editor:** actual Add/Remove/Reorder counts0 after reopen; live Replace absent. Exact set/date-note/Complete correction remains usable; existing changed/deleted history CAS/recovery tests all pass. Those source-conflict browser flows were verified in4B-2 and were not fully repeated here.
22. **Source isolation:** automated deep-equal PROGRAM/plans/activePlanId/planningDraft/customExercises and every non-draft domain across structural writes. No source-template promotion or MASTER_PLAN edit. Unrelated concurrent food-note write retained.
23. **Backup/restore:** automated backup8 finalstructure/IDs/order/status/revision/sets; actual Settings clipboard→ignored synthetic file→chooser preview→confirmed restore→clipboard export deep-equal. Final completed export parsed. Full photo backup still separate; no photo roundtrip claim for this phase.
24. **Actual browser workflows:** A–H exercised on127.0.0.1:8776 only: batch Add/filter/review/log/reload; zero/partial Remove; correction; Add-after-Remove; sparse Reorder/log/reload; valid/invalid dirty gates; real stale tabs and explicit retry; Complete/history/reopen. Also all-inactive0/1, single-active disabled movement, timer, invalid Add prescription retaining review and Builder Add/Replace/planning recovery. User8765 untouched.
25. **Mobile:** actual same-origin iframe widths320/360/390, client/scroll305/305,345/345,375/375 with scrollbars. Workout controls/picker/review at all3; dirty dialog320, Remove confirmation360, keyboard Reorder390. Final asset26 rechecked picker at all3. Viewport capability requested320 but actual page remained1280; not counted as a mobile test. Final screenshot .local/4b3-mobile-final.png inspected.
26. **Accessibility:** real semantic labels/buttons, disabled boundary/single-active controls, Tab/Enter/Space/Escape, visible focus and same-slot boundary fallback checked. Save-gate focus returns to search after rerender. No claim of screen-reader audit or WCAG certification.
27. **Failure/quota/corruption:** injected storage failure for Add/Remove/Reorder preserves disk bytes/revision, state error and no false Saved. Invalid/edited/archived/deleted definitions/setup/dupes/limits/stale and existing corrupt/future schema/backup tests pass without replacement. Real physical quota not injected; no new corruption recovery architecture.
28. **Final count:**180 tests,0failed/skipped/todo;46JS files pass node --check; git diff --check clean. Standalone test-tab warning/error logs empty.13new test groups exercise multiple invariant cases; not180manual UI scenarios.
29. **Files:** new js/session-structure.js,js/live-workout-ui.js,tests/session-structure.test.js. Behavior changes js/session-runtime.js,js/session-ui.js,js/exercise-picker-ui.js,js/app.js. index/import URLs bumped23→26; remaining JS changes cache-only. Docs README/DATA_MODEL/PHOTO_STORAGE/contract evidence/V4_ROADMAP/this report/guide and ignored private TONG_KET. No CSS/dependency/program/photo behavior edits. Synthetic evidence ignored.
30. **Git:** main code fe3f8b9; separate documentation checkpoint follows in git log/final handoff. No push/fetch/reset or history rewrite. Final tracked status checked after commits; personal files not staged.
31. **NOT VERIFIED:** physical phone/mobile Safari, screen reader, genuine storage pressure/quota, huge photo backup, crash between multiple dirty-form saves, every possible metadata/setup path, deployment and completed IAB file download. Clipboard file/restore is verified. No remote service configured/uploaded.
32. **Exact remaining4B-4:** live Replace reviewed alternative with new successor UUID/link, closing old occurrence while preserving logs/snapshot/ownership; explicit prescription review/dirty gate/atomic guard and predecessor/successor/history/backup/race/mobile tests per approved contract. No Undo/template promotion/backend/AI/schema9 in this completed scope. **Do not automatically begin4B-4.** Recommended model/reasoning: GPT-6.1-sol/high.

---

## Historical Phase 4B-2 checkpoint

# Tracker V4 — Phase 4B-2 Runtime Slot Ownership + Write-Guard Cutover

05/10/2026 · **4B-2 IMPLEMENTED / TESTED. Schema8 unchanged. Phase4 NOT DONE. STOP before4B-3/4.** Main; code checkpoint41dc047, separate documentation checkpoint follows; no push. Older reports below remain historical evidence.

## 4B-2 report — 27 required items

1. **Baseline → final tests:** clean main54d0fa5,136/136 →167/167 Node tests,0fail/skip. Added21 runtime and10 reader tests; all existing136 retained.43 JS files pass node --check; git diff --check passes. Red/green observed for missing runtime/readers, immutable queued sources and empty duplicate occurrence selection. Independent read-only review found three Important issues, fixed and verified: unsaved-form rerender loss, empty-duplicate Quick Fill, and editable forms during pending setup/session writes.
2. **Schema:**8→8; no new field or migration.1–8 migrations remain.7→8 load only bumps in memory, no rewrite/enrichment. IndexedDB1/photo format1 unchanged; MASTER_PLAN/program unchanged.
3. **New Start:** Original/custom/one-off/Builder-reviewed create session/occurrence UUIDs, frozen prescription/setup snapshots, basis started, revision0, historyEditBase:null in one successful write. Planning cleanup shares that write. Source plan CAS; source template and active selection unchanged by Start.
4. **Legacy cutover:** pure load/preview writes0times. First safe latest-state guarded mutation materializes deterministic legacy-slot:index, binds existing logs, applies change/revision and persists once. Original over-target logs remain. Ambiguous records stay raw, with unique exact corrections/date/notes only; no new logging/Quick Fill/guessed recovery copy.
5. **Canonical writer:** js/session-runtime.js commands own by slotId; validate every candidate. Active slots only for new logs; malformed structured data never falls back to indexes. Registry immutable, display order separate.
6. **Log/edit/delete:** exact unique set ID and expected slot; edit preserves owner/name/exercise ID/number. New log checks duplicate owner+number and configured set bounds; zero/negative/nonfinite/blank/invalid reps/RIR reject. All successful commands increment revision once. UI confirmations protect deletion.
7. **Date/notes:** explicit Lưu ngày & ghi chú saves both values atomically, validates dates and increments once. Unsaved metadata must be saved before Complete/other rendering actions. Stale metadata cannot overwrite a newer draft.
8. **Focus/next:** sessionStructure.order → active slots → existence of saved set numbers. Duplicate exercise occurrences remain separate; inactive imported rows keep logs/corrections but cannot log new sets. Focus follows next missing slot after Save.
9. **Previous/Quick Fill:** exact exercise ID; Original raw fallback exact source occurrence+historical name. Latest previous session with matching saved data; multiple occurrences require explicit selection, including empty duplicates. Empty/ambiguous occurrence cannot fill. Copies weight/unit/reps/RIR values only, never owner IDs or auto load advice.
10. **exerciseIndex compatibility:** preserved immutable registry ordinal; never display order. Existing pure workout helper API retained for compatible tests; live writers no longer use index-based ownership. Canonical history uses frozen snapshots; raw history shows saved names.
11. **Same-tab queue:** serialized commands, immutable intent/source captures, own successful baseline advance, epoch cancellation after reset/context changes. Tests rapid distinct saves, duplicate saves, queued mutated source/Start and no completed-draft resurrection. All workout controls freeze during pending session/setup writes; original disabled states restore afterward. Actual browser held/released the same write lock in a synthetic tab: delayed note Save froze set inputs and navigation; delayed set Save froze open note textarea; release persisted the intended note/set and re-enabled controls. No typing window before success rerender.
12. **Web Lock + baseline:** full reviewed draft plus session ID/revision checked against latest inside updateData/Web Locks. Exact envelope also detects same-revision restore/old-writer edits. No Web Locks means existing fail-closed error; no unsafe fallback or replay.
13. **Stale multi-tab:** storage notification keeps visible input/baseline. Reject stale log/edit/delete/date/notes/Start/switch/Complete/discard; explicit review loads latest, then manual retry. Actual two-tab log first wins; rejected tab retains30/10/2, review retry adds only intended second set. Stale edit/delete/metadata/Complete/discard and switch-confirm race exercised. Automated guards cover remaining permutations.
14. **Complete:** >=1 saved set; candidate guard then revision+1, history append/replace and draft=null in one locked write. Quota/CAS failures retain draft. Unsaved set/metadata/setup text blocks Complete. Timer cleared on successful Complete/discard/copy; actual Rest→Complete→reopen shows no timer.
15. **Reopen historyEditBase:** exact cloned completed source, draft independent, same session ID. Source unchanged while editing; baseline survives reload/backup. Reopen source itself must still match the reviewed record.
16. **History CAS:** latest completed source must exactly equal stored baseline at Complete. Success strips historyEditBase from completed record. Source changed/deleted rejects without resetting candidate or resurrecting source.
17. **Changed/deleted recovery:** candidate kept/exportable; view latest source or deleted-state message; explicit confirmed reopen latest establishes fresh baseline. Confirmed independent copy is separate history and counts as another session; source stays changed/deleted. Browser source-change fixture restored only source.notes while preserving draft/base, so rejection proved history CAS rather than draft guard; deletion tested via another actual tab.
18. **Unknown baseline:** legacy-unknown never fabricated into a known baseline; Complete blocked. Browser candidate→view source→confirmed latest reopen→Complete verified; raw ambiguous exact set correction/export preserves names/indices/IDs with no structure injected.
19. **Copy ID remapping:** fresh session/slot/set UUIDs, mapped order/set.slotId/replacesSlotId, baseline stripped. Node comparisons of actual browser exports confirm remapping and source preservation. Ambiguous raw ownership cannot safely copy as a canonical session by guessing.
20. **Backup:** data backup8 accepts mixed legacy/structured history and editing baseline; validated structured imported draft editable after reload. Malformed/future backup reject without replacement. Actual Settings clipboard→private JSON→chooser preview→confirmed restore exercised; final exported JSON parsed and compared for unchanged settings/nutrition/journal/checkins/custom definitions/Original source plan/legacy history. Expected one explicitly saved new plan and Builder/Planner cleanup confirmed. Candidate-only export is not a Settings backup. Full photo backup still separate.
21. **Browser A–G:** isolated8774 synthetic fixtures, user8765 untouched. A Original Start/log/invalid/edit/delete/relog/Complete/reopen/date-notes/reload/CAS; B custom; C reviewed Builder duplicates/choice/focus; D Original legacy over-target first-write cutover; E imported structured replacement+inactive/order/log/edit/delete/Complete; F changed/deleted history source/candidate/copy; G real two-tab stale/switch. Additional Phase2 recovery→Shared Picker Add→Save Plan and Planner accept→Builder review→Start→Complete, unknown and ambiguous flows passed. Final standalone app warn/error logs=[]; no claim that every possible browser path was tested.
22. **Mobile:** actual iframe widths320/360/390, overflow metrics305/305,345/345,375/375 after15px scrollbars; earlier390 no scrollbar390/390. Save/error/stale retry, keyboard Tab/Enter, visible focus, labels/buttons and recovery text checked. Save heights >=48px observed. Final asset23 layout rechecked and screenshot inspected. Harness frame locator limitation required accessibility controls; a tool inspection MutationObserver error was observed in harness, absent in standalone app. Private screenshots .local/4b2-mobile-live.png, conflict.png and final.png.
23. **Failure/quota/corrupt:** automated injected Start/cutover/log/Complete quota, invalid/revision overflow, stale/epoch, duplicate ownership, corrupt/future schema and backup failures preserve persisted bytes/no false Saved. Existing photo transaction rollback tests pass. Real device storage-pressure injection was not performed.
24. **Files:** new js/session-runtime.js, js/session-readers.js, js/session-ui.js, tests/session-runtime.test.js, tests/session-readers.test.js. Runtime integration js/app.js; session-identity activation comment. index.html and JS import cache URLs22; other modules have cache-only edits. Docs README, DATA_MODEL, contract evidence, V4_ROADMAP, this report, guide, PHOTO_STORAGE and ignored private TONG_KET. No dependency/CSS/program/photo behavior change. Private fixtures/evidence ignored.
25. **Git/status:** main; code checkpoint and separate documentation checkpoint in git log/final handoff. No push/fetch/reset/history rewrite. MASTER_PLAN/TONG_KET/.local remain ignored; no user fitness records or fixtures staged. Final verified status reported after commits.
26. **NOT VERIFIED:** physical phone, Safari, screen reader, real quota pressure, giant photo export/restore, finished IAB download-link saving, photo-browser roundtrip in this milestone. Clipboard/file restore and existing automated photo tests were verified. No remote service/backend/AI integration or new photo promise.
27. **Exact remaining:**4B-3 Add/Remove/Reorder with guarded current candidate and immutable ownership/registry/order, dirty-input/save/discard gates, mobile controls, stale races, snapshot/history/backup preservation. No Replace until4B-4; no implicit template promotion or structural live UI now. Next model GPT-6.1-sol / high. Continue only on the next authorized task.

## Current limitations and handoff

Legacy ambiguous records are records to review/export, not a license to guess ownership. Explicit independent history copies add workout count. All old Tracker tabs should reload for asset23. Backend/remote AI/product decisions stay DECIDE LATER. Phase4 is not complete.

---

# Historical Tracker V4 — Phase 4B-1 Session Identity Foundation

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
