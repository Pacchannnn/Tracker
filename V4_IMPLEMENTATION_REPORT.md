# Tracker V4 — Phase7B-1 Weekly Life Review

06/10/2026 · **Phase7A CONTRACT APPROVED; Phase7B-1 WEEKLY REVIEW IMPLEMENTED / TESTED; Phase7B-2 MONTHLY MEMORIES NOT IMPLEMENTED; Full Phase7 NOT DONE.** Schema8 remains8. Asset36. Code checkpoint **5a6b9c5**; separate documentation checkpoint named **Record Phase7B1 evidence and bounded weekly handoff**. No push. Earlier dated sections are historical reports.

## Phase7B-1 final report — 32 requested items

1. **Baseline → final tests:** clean main4a97ada verified before edits; npm test283/283. Final fresh npm test333/333,0fail/cancel/skipped/todo.50 new tests:30 domain,14 UI,6 exact-source. Existing test files/assertions unchanged. Missing-interface RED precedes production helpers; additional RED cases cover unknown-nutrition provenance, empty certainty after mood failure, duplicate source identities, repeated evidence focus, blank-mood vs absent-journal dates and late control-focus theft.
2. **Syntax:**59 baseline →65 final `node --check` checks across js/tests; all pass. Working/staged diff checks pass. No package/dependency change.
3. **Schema:**8→8; no migration, entity, field, summary cache, storage key or persisted route. Same localStorage JSON, IDB tracker-photos DB1/store photos and photo backup format1.
4. **Files:** new js/life-review.js, js/life-review-ui.js, js/life-review-source.js and corresponding3 test files. Integrations app/session-ui/my-day-ui/navigation/CSS/index. Other existing JS changes are import-query34→36 only, including progress.js/data.js/photo-store.js; existing weeklySummary, storage and backup implementations unchanged. Docs roadmap/report/model/README/guide plus ignored private summary. MASTER_PLAN and approved Phase7 contract unchanged; fixtures/evidence stay ignored.local.
5. **Calendar:** pure lifeReviewPeriod uses validated stored local dates, local-noon calendar stepping and Mon–Sun normalization. Full period validity includes0000–9999 boundaries, leap/month/year crossings and unsupported neighbouring periods. Month helper semantics tested as shared calendar only; no deriveLifeMonth or monthly UI.30 domain tests also pass under TZ America/New_York; this is not physical browser timezone certification.
6. **Eligibility:** past7; current Monday→captured today inclusive; future0/null ratio. Browser current fixture Oct5–6 gives2 eligible days; Sunday future meal remains exact future evidence, excluded from eligible totals/coverage/distribution. Invalid date retains prior valid range and gives inline error; no0/0 percentage.
7. **Coverage:**8 independent distinct-date numerators with eligible-day denominator; separate record counts. Mixed browser fixture3 food entries/1 nutrition day,2 history sessions/1 workout day,10 IDs/1 photo day. Separate-domain/empty/future-only tests do not infer rest days or missing measurements.
8. **Mood:** existing MOODS labels/marks/order unchanged, including drained=Mệt. Blank counts journal only. Browser4 journal days/3 known moods gives journal4/7,mood3/7,drained2/3 known mood days. Unknown nonblank mood fails only mood submetric; missing dates and blank recorded dates separate. No valence/average/health interpretation.
9. **Tags:** explicit saved tags only, trim/Vietnamese case fold with accents/internal spacing retained; distinct tag-date evidence. UI “Thẻ hoạt động do bạn ghi”; no title/note inference or sum-to100 claim.
10. **Structured workouts:** saved sessions only; canonical slot IDs. Logged old replacement owner and successor retain separate occurrences; zero-log added/removed/replaced slots contribute0. Empty saved session counts1 with0 performed work. Active/planning/history-edit drafts excluded; source/source-set provenance retains session and slot identities.
11. **Legacy:** saved index/name/consistent optional IDs/unique set-number evidence only. Ambiguous exact denominator unknown, proven occurrences retained and unresolved set refs/count exposed. Browser G unresolved2. No current PROGRAM/catalog reconstruction or arbitrary winner.
12. **Muscles:** proven work labelled Không xác định; no catalog/name inference. Ambiguous occurrence denominator gets no percentage. No frozen-muscle schema extension.
13. **Nutrition:** existing dailyTotals reads entries.food snapshots×servings, per macro independently.100/null/0 on3 logged days: full calories unknown, knownSubtotal100,knownDays2,known-day average50. Known0 counts as known; missing does not. Overflow is unavailable for affected arithmetic, not Infinity/0. All-unknown contributions keep exact refs. Strict invalid backup acceptance unchanged; no targets/deficit/advice in Weekly.
14. **Cardio/check-in/knee:** record count and independent coverage; valid recorded durationMinutes only. Notes-only check-in valid. No trends, symptom scores or safety judgments.
15. **Photos:** existing listPhotoMetadata readonly whole-store cursor projection, no Blob/image for Weekly coverage or lightweight photo-source route. Unique IDs/own dates count even orphan owners; variants count once. No indexed date-range-I/O claim. Source Journal uses metadata and relevant-day thumbnail reads, no original fallback; existing My Day reads relevant thumbnails. Absent localhost origin stayed databases=[] through Weekly navigation/Refresh and nested MyDay→Journal→Back;0IDB writes/0binary reads.
16. **Isolation:** canonical loadData only. Whole consumed domains validate before period filter; no malformed skipping/repair/duplicate winner. Root failure makes JSON unavailable while independent photos10 still show. Photo read failure leaves JSON valid. Invalid nutrition does not disable journal. Invalid mood outside selected week leaves empty certainty unknown. Empty tri-state tested; root failure cannot route into empty-success editors.
17. **Provenance:** aggregates/distributions/counts carry detached exact SourceRefs; coverage references all contributing records. Unknown macros and future records retain refs. Set IDs resolved in session scope, plus exact slot/legacy owner. Latest-source validation rejects duplicate IDs/dates and changed/deleted/mismatched refs; no name lookup.
18. **Routes:** journal exact date/ID; nutrition date/entry; history date/exact session+set owner; cardio/check-in/knee exact record/form; photo lightweight metadata; My Day selected date. Browser9 exact sources includes same set ID in another session and same record ID across cardio/knee, preventing cross-owner focus collisions. Existing Progress/MyDay/editor navigation retained.
19. **No reopen:** H fixture contains a valid active draft. Viewing both workout/session-set sources, including copied set IDs, leaves entire raw JSON byte-equal and draft intact,0Storage writes. Route uses historyView, never store.reopen; explicit existing Edit remains a separate action.
20. **Back:** transient week/metric/ref/scroll/focus only; canonical reread and fresh derivation. H returns same Sep28 week/exact evidence; nested MyDay→Journal→MyDay→Weekly retains stack. K explicit journal Save/Delete each writes1 separately; Back writes0 and derives latest journal count1. Deleted source focus falls back to metric. Dirty Back/internal calendar navigation blocked with input retained, no auto-save/discard.
21. **Async:** view/request generation and connected-host checks reject old-week/left-view results. Tests hold promises and resolve out of order. Control focus restores immediately after header rebuild, late metadata preserves user's later focus; source Back restores after summary. Captured journal dates/disconnected checks prevent stale thumbnail append/object URL creation.
22. **Zero writes:** browser probes Storage.setItem/removeItem/clear and IDB readwrite transactions. Open/change/prev/next/current/expand/source/Back/Refresh all0. Weekly and exact metadata-source routes0 Blob/getAll reads before My Day. Existing nested My Day thumbnail reads are readonly and counted separately, not claimed metadata-only. No absent DB creation. Explicit source Save/Delete counted outside viewing audit.
23. **Backup:** actual createBackup pre/post full data equality for valid fixtures, exact raw JSON/photo metadata/original+thumbnail bytes unchanged. F unknown nutrition/M malformed/root invalid states retain identical strict backup rejection (backupValid=false,backupEquivalence=true), not a claimed successful export. Existing schema8 JSON roundtrip/photo backup tests pass. No new manual full-image restore performed.
24. **Browser:** A full/B sparse/C empty/D current+future/E mood/F unknown nutrition/G ownership/H exact sources/K explicit edit/delete+dirty guards/L reload/M root/domain/photo errors executed on synthetic127.0.0.1:8786; absent DB on localhost8786. I/J Monthly flows not implemented/run as release functionality. Standalone warning/error logs empty; final probed flows errors=[] and externalRequests=[]. Harness developer logs also contain2 MutationObserver.observe Node errors; no MutationObserver exists in app/probe/harness source, attribution unproven. A cold-load harness attempt clicked before module initialization; QA now waits for rendered main before actions, full final flows pass. These are recorded, not a claim of every harness console being clean. Real8765 user data untouched.
25. **Mobile:** real iframe320/360/390; Weekly expanded long sections and error/unknown states client/scroll305/305,345/345,375/375 (15px vertical scrollbar). All9 source routes at each width same equality; metadata panel has no scrollbar320/320,360/360,390/390. Buttons≥48px, wrapping, focused return reachable above bottom nav. These are rendered iframe tests; browser viewport override did not yield an independently verified320px standalone viewport, so no such claim.
26. **Keyboard/accessibility:** actual Tab/ShiftTab moved Previous↔Next; Enter previous/source/Back and Space next/disclosure worked. Exact source and originating evidence focus observed; deleted source metric fallback. Blank date gives role=alert and preserves range; read navigation audit0writes. Semantic headings/details/buttons, textual counts/denominators/states, visible focus/contextual source labels. Empty alert is hidden. No screen-reader/WCAG certification.
27. **Regression:** all283 previous tests retained/pass; Phase2 recovery,3 picker,4 live/history ownership,5 MyDay/journal and6 batch/cookbook suites unchanged. progress weeklySummary body unchanged; no history/nutrition/photo data rewritten. Independent final review reports no remaining material finding; focused50/50.
28. **Privacy/network:** no remote call/AI/CDN/analytics/backend/account/upload/new dependency. Local assets only; probes externalRequests=[]; no personal data sent. Synthetic fixtures/screenshot/evidence ignored. MASTER_PLAN preserved.
29. **NOT VERIFIED:** physical phone/Safari/other browser engines/screen reader/WCAG/large real dataset/native quota or power loss/new manual complete image restore/all pre-existing browser workflows. JSON+IDB reads are not one atomic cross-store snapshot; metadata scans whole store. Tests use synthetic errors/timezones. Standalone viewport override limitation noted above.
30. **Git/checkpoints:** local main only; inspected baseline/diff/staged file lists. Code5a6b9c5 and separate documentation checkpoint named above; no push/fetch/reset/history rewrite/new branch. Private source/summary and.local excluded. Owned test tabs/server8786 cleaned up at handoff; user8765 untouched.
31. **Exact gate:** all32 requested7B-1 done conditions below pass in verified scope.7A APPROVED,7B-1 IMPLEMENTED / TESTED,7B-2 NOT IMPLEMENTED,Full Phase7 NOT DONE. No monthly runtime/schema9/Phase8 or GitHub push.
32. **Exact next:** STOP.7B-2 Monthly Memories only on separate user instruction using unchanged approved contract. Current coding model/high reasoning recommended for calendar/source/readonly tests; medium for docs. No new remote/product decision needed for delivered7B-1.

## Phase7B-1 gate evidence index

All32 gates passed in bounded verified scope:

| Gates | Evidence |
| --- | --- |
|1 baseline;2 RED;3 schema|Items1–3; saved pre-implementation RED logs; no stored-field diff|
|4 calendar;5 eligibility;6 future|Items5–6; P1–P6 and browser D|
|7 coverage;8 mood;9 tags|Items7–9; C1–C3/M1–M3/T1, browser A/E|
|10 structured;11 legacy;12 muscle|Items10–12; W1–W4, browser G/H|
|13 snapshots;14 macro states|Item13; N1–N3, F/overflow/unknown refs|
|15 refs;16 drilldown;17 no reopen|Items17–19; source6 tests/H intact active draft|
|18 Back;19 domain isolation|Items16/20; I1–I2,K/M, deleted-source focus|
|20 Storage;21 IDB;22 absent DB|Items15/22; instrumented0 counts, nested absent route|
|23 async;24 honest states|Items16/21; held-read UI tests/D1–D2|
|25 accessibility;26 widths|Items25–26; rendered widths, actual keyboard|
|27 browser flows;28 previous tests|Items24/27;333/333|
|29 backup;30 no Monthly;31 no Phase8;32 no push|Items3/23/30–32; Git diff and scope inspection|

Reproducible tracked tests: `npm test`, `node --check` on every js/tests file.
Private local evidence (ignored, synthetic only): `.local/phase7b1-final-tests.txt`,
`phase7b1-domain-red.txt`, `phase7b1-ui-red.txt`, browser flows JSON,
sources320/360/390-final JSON, edit-final JSON, absent-db-final JSON,
keyboard-audit JSON and desktop/mobile screenshots. Harness and fixtures are
development evidence, not an application route shipped in Git.

## Historical Phase6B Cookbook / full bounded Phase6 release

06/10/2026 · **Phase6B IMPLEMENTED / TESTED; full bounded Phase6 IMPLEMENTED / TESTED. All36 gates passed in verified local scope.** Schema8 stays8. Code checkpoint **ad1a8f5**; separate local documentation checkpoint named **Record Phase6B cookbook evidence and bounded Phase6 release**. Asset34. **STOP before Phase7.** Earlier dated sections below are historical checkpoint reports.

## Phase6B final report — 34 requested items

1. **Baseline → final tests:** verified clean main4864322,6A code2d27a81,262/262 tests and56 JS syntax checks before code. Final fresh npm test:283/283,0fail/cancel/skipped/todo;59 JS syntax checks; git diff --check and staged diff check pass.21 new cookbook groups; all original262 tests/assertions unchanged.20 groups failed before missing helpers were implemented; the imported structured-separator case failed before its fix. Independent final reviewer reports no remaining actionable finding.
2. **Schema:**8→8, same localStorage key/root/entities/backup JSON8. No persistent6B fields or migration. Photo IndexedDB DB1/backup format1 unchanged. No dependencies/package changes.
3. **Search semantics:** entire recipe library filtered in memory, stable source order; substring checked independently in name, each tag and each ingredient name. No cross-field phrase concatenation. Blank returns all subject to tags; clear empties query and tags. Results count, no-result and empty-library messages are distinct. No fuzzy matching/network/index.
4. **Fields/normalization:** name/tags/ingredient.name only; NFD combining-mark removal, Vietnamese đ/Đ→d, lowercase, trim and collapse whitespace. Only derived strings normalize; stored text unchanged. Browser COM GA / DAU DO / muoi / gia vi cases exercised.
5. **Filters:** choices derived from existing tags, first existing label per normalized key; exact normalized tag matching, ALL selected tags plus query AND. No taxonomy/favorite/pin added. Selected stale tags remain removable. Keyboard Space/Enter/Clear verified.
6. **Duplicate architecture:** existing inline recipe editor reused for explicit Nhân bản→review/edit→Lưu bản sao. Closure stores reviewed source/raw fields. No write on opening/editing/Cancel; Save uses canonical validateRecipe/locked updateData/ensureUnchanged. No second editor, router, merge framework or logging implementation.
7. **Identity/deep clone:** new unique UUID, whitelist current definition fields only: name,description,servings,ingredients,steps,tags,notes,nutritionPerServing. Default name ends “— Bản sao”, editable. No source ID/timestamps/UI/history/photo ownership copied; current recipe schema has no created/updated timestamps. Nested arrays/macros clone independently both ways. Untouched structured arrays preserve valid imported newline/comma/pipe text exactly; edited text uses the original editor grammar.
8. **Stale source:** complete source baseline compared inside locked write. Edited/deleted source rejects without writing or resurrecting it; draft remains for inspection, Cancel/reopen latest source to review again. Browser parent controls changed/deleted source while review open:0attempts/0writes, no new recipe. Other unrelated latest domains merge through existing updateData, tested automatically.
9. **Failure/double-submit:** injected quota gives0new recipes/0successful writes, exact disk unchanged, name/ingredient/raw draft retained and retry enabled. Healthy explicit retry adds exactly1. Pending controls disabled; writer also rejects in-flight/already accepted review. Held Save + repeated pointer attempts produced1 successful copy; pure test repeats before/after acceptance. Review fixed failure-after-navigation updating a detached old form: live editor now gets enabled/error/focus on return. Native quota was not simulated by filling real storage.
10. **Cooking architecture:** explicit Chế độ nấu opens a read-only subview, snapshot/target in closure. Reuses scaleRecipe + recipeTotals; no arithmetic fork or definition save. Missing/changed source fails closed; invalid target clears ingredients/steps/macros/notes before error. Back and base reset remain available. No optional cooking step checkboxes implemented.
11. **Scaling:** base4/400g/300kcal per serving; target2→200g and600kcal batch, per-serving300 unchanged. Base4/target8/fractional1.5/known0/null and invalid empty/<=0/>100/infinite/text tested. Browser fractional ingredient0.125×1.5/4=0.046875,8serves=0.25; no nutrient estimation.
12. **Cook vs consumed proof:** changing cook target2 wrote0; shortcut returned to existing single recipe logger with consumed amount1, not2. Explicit original recipe log1.5 at Sep20/Dinner produced450kcal/P45/C60/F7.5; no automatic meal was created by Cooking.
13. **Steps:** exact stored strings/order rendered safely into numbered ol/li; notes preserved, no instruction/time/prose generation. Long fixture has12 steps including literal HTML-looking text;0img/script descendants in its ol. CSS visual QA found old history-list style hid numbers and corrected list-style decimal; final asset34 confirmed decimal markers at320/360/390. Empty-step defensive message is neutral (pure helper preserves[]); strict current recipe editor/backup still expects a valid nonempty steps array.
14. **Transient cooking state:** query/tags/cooking source/target/duplicate raw stay only in memory; no backup fields/keys. Reload reset query blank and Cooking absent; reopening saved copy gave canonical base4 after previously previewing2. Saved duplicate remained. No persistent checklist/pending recovery.
15. **Navigation/state:** Back returns to source card and keeps query/tag context, focuses Chế độ nấu above bottom nav. Duplicate Cancel returns to original Nhân bản; successful Save focuses new copy Cooking action or search if copy excluded by current filter. Latest deleted/filtered source falls back to search. Search retains focus while results refresh; photo object URLs revoked on card replacement. Existing navigation/source-date flow retained.
16. **Recipe→logging:** Cooking shortcut routes to existing single logger only and leaves consumed default1. Unknown macros stay DATA NOT DEFINED YET and disable shortcut. Existing explicit recipe log snapshots per-serving macros using recipe:<id>/1 phần; logging body unchanged. No second direct writer or cook-target transfer.
17. **Phase6A regression:** duplicate appears in Add-many/search/review like any recipe; default1 verified. Explicit copied recipe batch log into Sep21/Lunch appended1 with300kcal/P30/C40/F5 and fresh entry ID. Recents/selection/copy/MyDay helpers tested automatically; original31 batch groups pass. Existing single log and selective copy exercised in browser. No amount-default/deletion/meal semantics change.
18. **Deleted-source/history:** deleted duplicate disappears from cookbook; saved Lunch snapshot still300kcal in daily log/My Day (1item/1meal). Selective copy of that deleted-definition snapshot into Sep22/Dinner at2serves gave600kcal/P60/C80/F10. Old6 entries stayed byte-equal in audit; source date and other domains unaffected. No history relink/rewrite/cascade.
19. **Photo ownership:** synthetic r1 owns recipe-photo in IDB. Duplicate has no owned photo and displays the existing empty state. All tested duplicate/search/cooking/delete/log flows wrote0 IDB; source photo metadata/owner retained exactly. No cloned bytes/re-owned references/schema change. Existing explicit photo management remains available; full manual image-backup restore not newly tested in6B.
20. **Batch UI polish:** visible Bỏ món, aria-label Bỏ <full name> khỏi batch. Long recipe review at320/360/390 retained full accessible name and48px height without horizontal overflow. Removal uses unchanged6A row/focus semantics. Recipe card Nhân bản/Chế độ nấu similarly short with contextual accessible names.
21. **Zero-write audit:** synthetic Storage set/remove/clear attempts/success + IDB readwrite probes, exact JSON comparison and photo metadata comparison. Open cookbook/search/filter/Clear/open Cooking/change target/reset/Back/open Duplicate/edit draft/Cancel:0JSON/0IDB. Final v34 Cooking/draft/Cancel repeated:0attempts,0writes,0photoWrites, jsonUnchanged=true, photosUnchanged=true. Explicit duplicate Save writes only recipes1time; explicit nutrition logging/deletion writes normally. Parent fixture mutations are outside frame counters and never claimed read-only.
22. **Backup/restore:** automated schema8 createBackup→parseBackup→restoreBackupData→deep comparison includes original+copy+original log+copy log+deleted-definition historical log. No transient field enters backup. All existing migration/reliability/photo suites pass unchanged. This6B gate is automated JSON roundtrip, not a new manual full-photo export/restore claim.
23. **Browser A–L:** all executed on disposable127.0.0.1:8784. A accent-name search; B ingredient; C no-result/Clear; D name+ingredient review/save fresh1copy/source unchanged; E Cancel0writes; F held quota failure/live-form retained/explicit retry1; G4→2 ingredient/batch/per; H invalid clears; I Back/filter/focus; J duplicate Add-many snapshot; K delete/history/MyDay/copy; L reload saved copy/search reset/canonical cook target. Additional source-stale/delete/unknown macro/long HTML-looking content checks. Final standalone index app warning/error logs empty. Harness captured one MutationObserver.observe Node error; no MutationObserver exists in app/harness source, attribution unproven. Do not claim every harness console clean.
24. **Mobile:** actual iframe viewport widths320/360/390, inner client/scroll widths305/305,345/345,375/375 with15px scrollbar. Cookbook/search/filter/long names/editor/ingredients12steps/fractional targets/macros/Back/bottomnav and short batch Remove exercised. No horizontal overflow. Final v34 decimal marker/12steps geometry rechecked at all widths. Screenshots inspected; evidence remains ignored.local. No physical-phone claim.
25. **Accessibility:** wrapped native labels/search/number controls, real buttons, pressed tags/status/count, ordered ol/li, safe text, visible solid focus;48px exercised actions. Tab target→Reset and ShiftTab reverse, Enter/Space search tags/summary/duplicate/Cancel/Save/Cooking/Back/Remove/review tested. Source-return action observed above mobile nav, Cancel/Save focus explicit; failed Save focuses role=alert tabindex=-1 and retry enabled. No new modal/Escape contract; unchanged copy-all Escape already exercised6A and tests remain. No screen-reader/WCAG certification.
26. **Privacy/security:** no external calls/recipes/images/CDN/analytics/AI/account/backend/cloud/PWA/dependency added. Recipe text uses textContent/node text, literal HTML stays text. Only synthetic owned origin used; user's8765 storage untouched. MASTER_PLAN unmodified; private summary and fixtures ignored/uncommitted. One existing localStorage JSON/IDB photos remain local.
27. **Performance:** linear in-memory search for personal dataset, no index/worker/backend. No large-library speed claim. Object URLs for obsolete search result images revoked; photo-storage logic reused unchanged.
28. **Files changed:** new js/cookbook.js, js/cookbook-ui.js, tests/cookbook.test.js. Runtime integrations js/app.js, canonical structured-array input validation js/nutrition.js, concise action js/nutrition-batch-ui.js,6 CSS rules/index. Other changed JS import URLs only31→34; data/photo/runtime contracts unchanged. Docs V4_ROADMAP,V4_IMPLEMENTATION_REPORT,DATA_MODEL,README,FULL_STEP_BY_STEP_GUIDE.txt,TRACKER_PRODUCT_IDEAS and ignored private summary. No original tests/package/MASTER_PLAN edits.
29. **Git:** local main code ad1a8f5 and separate documentation checkpoint ef4b5dc named above, followed by a documentation clarification checkpoint. Explicit stage lists exclude private/synthetic files. Status/staged diff inspected; no fetch/push/reset/rebase/history rewrite or extra branch. Final local status confirmed after docs commits; cached origin/main is not remote verification. Only owned test tabs/server8784 cleaned up; no change made to user's8765 origin or processes.
30. **NOT VERIFIED:** physical phones/Safari/other engines/screen reader/WCAG certification/native quota/power loss/very large recipe library/real simultaneous Nutrition two-tab writes/new manual full-image restore/every pre-existing form workflow. Current automated regressions pass; browser quota injected. Browser instrumentation attribution unproven. Optional step checks omitted. User-origin personal data not accessed for tests.
31. **Phase6B gate result:**36/36 below passed in verified local scope. No blocker/new persistent structure needed; no remaining important review finding after fixes.
32. **Full Phase6 release:** approved bounded6A+6B IMPLEMENTED / TESTED.6A34gates retained; final suite preserves original262 assertions and all earlier functionality under automated regression. DONE does not include deferred proposals.
33. **Exact deferred proposals:** favorites/pins; portion basis (including grams mapping); pending-batch recovery; cooked-weight/yield repartition; shopping list. Also no persistent cooking progress, AI/nutrition recommendations/backend/cloud/auth/PWA. None described as implemented.
34. **Exact next phase:** Phase7 — Weekly Life Review and Monthly Memories, separately scoped/approved period/coverage/denominator/source drilldown contract first. Recommended current coding model with high reasoning for that contract and data tests, medium for documentation. **STOP; no Phase7 implementation started.**

## Phase6B / full boundedPhase6 — 36-gate evidence

| Gate | Evidence / result |
| --- | --- |
|1 baseline262 retained|Original tests/assertions unchanged; final283/283|
|2 schema8|Same SCHEMA_VERSION8, no fields/migration|
|3 recipe search|Pure groups + browser A/C|
|4 Vietnamese accents|COM GA/DAU DO, đ/case/whitespace tests|
|5 ingredient search|muoi/gia vi browser B + pure|
|6 search0writes|Storage/IDB probes + exact bytes|
|7 duplicate explicit review|Editor open/edit/Save separately|
|8 fresh ID|Unique UUID audit/new record|
|9 deep clone|Nested independence both directions|
|10 original immutable|Source record array/macros audit/tests|
|11 history unchanged|Old6 snapshots byte-equal|
|12 no nutrition by duplicate|6 entries before/after duplicate Save|
|13 double-save safe|Held/pending UI + writer pending/accepted tests|
|14 stale-source safe|Edited/deleted rejection0attempts0writes|
|15 storage failure safe|Injected quota retained/retry exactly1|
|16 cooking read-only|0writes + source equality|
|17 canonical scaling|scaleRecipe/recipeTotals reused|
|18 cook≠consumed|Target2→existing logger amount1|
|19 per-serving unchanged|300kcal/P30/C40/F5 at4/2/8/1.5|
|20 batch correct|Target2=600;8=2400;1.5=450|
|21 steps order/content|Exact12 strings, ol decimal, literal text|
|22 cooking target0writes|Probe/reset/invalid/Back tests|
|23 Phase6A integration|Duplicate select/review/log1; prior suite|
|24 selective copy|Deleted-copy snapshot2serves→600 at new date|
|25 MyDay|Deleted copy1item/1meal300kcal|
|26 deleted snapshots|Original/copy history/source old entries retained|
|27 photo ownership|recipe-photo remains r1; copy has no owned photo|
|28 backup8 roundtrip|create/parse/restore deep comparison|
|29 mobile3widths|Actual320/360/390, no overflow long content|
|30 keyboard/focus|Tab/ShiftTab/Enter/Space/error/Cancel/Save/Back|
|31 remove polish|Visible Bỏ món/full aria-label/48px|
|32 full tests|283/283;59syntax;diff check|
|33 no persistent6B fields|Closure UI, stored schema unchanged|
|34 no favorites/pins/etc|Scope/source diff inspected|
|35 no Phase7|No implementation, STOP|
|36 no GitHub push|Local code/docs checkpoints only|

Private evidence: .local/cookbook-history-evidence.json, cookbook-copy-evidence.json, cookbook-stale-evidence.json, cookbook-mobile-evidence.json, cookbook-reload-evidence.json, cookbook-final-zero-write.json; inspected screenshot cookbook-final.png and mobile renders. They are synthetic/ignored and intentionally excluded from commits.

---

# Historical Phase6A Faster Meal Logging release

06/10/2026 · **6A IMPLEMENTED / TESTED in verified local scope; all34 gates passed. FullPhase6 NOT DONE. STOP before6B.** Schema8 stays8. Baseline clean local main88bba6b; code2d27a81; separate docs/whitespace checkpoint follows in local Git log. No push/fetch/reset/history rewrite. Earlier reports below are historical.

## Phase6A report — all29 requested items

1. **Baseline → final tests:**231/231→262/262,0failed/skipped/todo.31new groups in tests/nutrition-batch.test.js; all231 original files/assertions unchanged. Initial29 RED missing domain interfaces before implementation→GREEN; two additional snapshot/latest-state regression groups. Final suite after UI fixes;56JS syntax, final diff checks. Independent reviewer reran262/56 and found no remaining important correctness/scope defect.
2. **Schema:**8→8, no persistent fields/migration/favorite/pin/pending batch. Photo DB1/backup format1 unchanged. Original PROGRAM/master/dependencies unchanged; existing other-module diff is cache30→31 only.
3. **Recent algorithm:** derive from historical entries; exact same meal label first, then explicit global fallback, each newest local saved date first and reverse append position on ties. Dedupe food/recipe source keys, up to6choices including missing sources. Breakfast fixture prioritizes Oct02 missing source then Oct01 same-meal recipe/foods, before newer Oct04 Lunch egg. Selecting Lunch puts Oct04 egg first as same-meal; other candidates labeled bữa khác. No frequency score/persisted list.
4. **Deleted-source recent:** historical label shown disabled when current definition is absent; incomplete/unknown macro recipe also disabled. Selection rechecks latest live source and rejects missing/invalid; never resurrects a definition. Existing historical logs remain readable.
5. **Search integration:** reused searchFoods for projected food/recipe names, unchanged Vietnamese accent/case behavior. Daily single logger/editor search remains intact. Query Clear/type filter changes preserve selected rows; browser com trang→dau do→Clear→recipe filter retained all3choices. Original-container focus fix prevents jumping from library results to duplicate recent button.
6. **Pending architecture:** one UI closure with destination/source dates+meals, query/type, selected rows and review; one row per live source, copy one per selected logged-entry ID. Rows capture full source baseline and snapshot. Search/filter/Back/navigation preserve local state; explicit Cancel discards only transient batch; reload drops it. No recovery persistence claim.
7. **Review:** explicit Review batch before Confirm, date/meal/source type/names, individual amount, canonical macro preview and meaningful Remove. No Save when choosing. Back preserves edited2.25amount; removing3→2 focuses next amount and clears old error; success/Cancel focus launcher. Pending controls freeze.
8. **Amount:** live food/recipe defaults1, never last consumed amount; copy defaults saved servings. validateEntry0.01–100, independent decimal inputs. Preview uses dailyTotals per snapshot; known0fat retained; invalid/blank amount rejects. Unknown/null snapshots remain unknown in defensive history reads but cannot newly log/copy. Cook-size does not change consumed servings.
9. **Atomic commit:** review validates initially; Confirm uses existing updateData + origin Web Lock, clones latest, revalidates every row/source/snapshot/amount/destination, creates all IDs/records before push, appendsN and saves once. No half-write. Browser3 created exactly3records, only entries changed,1JSONwrite/0IDBwrite; source records and other domains unchanged.
10. **Double submit:** automated delayed concurrent commits and repeat after success reject, N not2N; same for copy. Browser held native write pending, all controls disabled, repeated forced pointer attempts did not invoke duplicate writes; release produced exact3/one persisted write. Normal Enter/Space tested; tool refused key press on disabled button, so repeated pending Enter was not independently exercised in browser.
11. **Stale/concurrency:** complete selected food/recipe or copy-entry baseline and destination-day entries compared against latest inside lock. Changed/deleted relevant source or changed destination rejects whole batch; unrelated dates/settings merge and are preserved (automated writer proof). Browser synthetic parent edited source while review open; Confirm rejected0writes and retained review. This is cross-document synthetic mutation, not a claim of two real browser-tab race testing. No merge/replay framework.
12. **Storage failure:** injected Storage.setItem quota failure left exact persisted JSON unchanged,0successful writes/1attempt, retained3rows and amounts2/1/1, error/no success. Disable fault→explicit retry wrote once, exact3. Copy automated failure/retry proves same atomicity. Native real quota not tested. Only after successful persistence does review clear.
13. **Date/meal:** batch3 into historical2026-09-20/Dinner, totals650kcal/P60/C100/F5; not today. Date handled as validated local YYYY-MM-DD, no UTC conversion. Copy2of3 into2026-09-22/Lunch,550kcal/P55/C90/F5. Mobile copy default kept Breakfast source labels alongside2Lunch target items;4total,2meal groups, append only.
14. **Snapshot ownership:** live food uses existing foodSnapshotForEntry; recipe foodId=recipe:<id>, frozen per-serving food object. Historical records keep independent snapshots after library edit/delete; new-food+recipe regression, existing old snapshot tests and browser source totals remain unchanged. No live macro reference/MyDay batch special case.
15. **Selective copy:** choose source date/optional meal, subset, destination date and preserve individual source meal labels or explicit target meal; review/edit amount, Confirm once. Copy uses historical entry food/foodId and existing source fields, fresh logged IDs, no destination overwrite, source untouched. Pure1of3/2of3; browser2of3 and current copy-all/Escape smoke passed. Distinct old entries referencing same definition may each be selected because they are separate records, not duplicate candidate selection.
16. **Deleted-source copy:** strict existing backup accepts independent complete snapshots with missing library source. Selective copy retains that contract, no fake food/validator bypass. Browser selected old food100kcal+recipe300kcal, edited amount food2.5; deleted food, edited recipe999 then deleted recipe before Confirm; copy still250+300=550, source history unchanged, library counts2foods/1recipe rather than resurrecting records. Malformed/null snapshots disabled/rejected; source logged-entry edit/delete rejects.
17. **MyDay:** actual saved batch3 dateSep20 shows3items/1meal,650/P60/C100/F5 matching canonical Nutrition; no MyDay body change. Pure daySummary count/group/totals tests pass, snapshots unchanged after definition deletion. Original Phase5 tests retained.
18. **Recipe scaling:** existing tests pass. Browser4→2cook preview showed200g ingredient and600kcal batch while300kcal per serving and consumed logger default1 remained. No yield redistribution/cooked grams or modified recipe definition. Batch recipe logging uses original per-serving snapshot.
19. **Backup/restore:** schema8 fixture containing old records, multi-add records, copy records, recipes and deleted-food-source snapshot createBackup→parseBackup→restoreBackupData deep equals original, including IDs/dates/food snapshots. Existing migration/backup/photo tests pass. No manual full-image restore repeated this milestone; no photo-format change.
20. **Zero-write audit:** synthetic8783 probe after reset: opening recent/search/select/unselect/amount/review/Back/selective-copy selection/review/Cancel0JSONwrites/0attempts/0IDBwrites. Exact raw JSON and photo metadata equality, changedDomains=[];6initial records unchanged. Source edits made by synthetic parent are counted separately, never attributed to retrieval. After parent reload baseline metadata needed reset; temporary false equality before reset was a harness-baseline gap, not app photo mutation.
21. **Browser A–L:** Ameal order/dedupe/fallback/missing; B3+amount→exact3; Cquery/filter selection; D3→2→exact2; Einvalid0; Fheld save/duplicate attempts; Gquota0/retained/retry; Hold-dateSep20; Isubset2of3; Jsource edit/delete/snapshots; KMyDay count/totals; Lreloadsaved9 retained/transient panel0. Extra stale-source0writes, Cancel/Back, old copy-all/Escape, recipe scale, safe local probes. Current harness/standalone warning/error captures empty.
22. **Mobile320/360/390:** actual iframe widths; client/scroll305/305,345/345,375/375 (15px scrollbar), no horizontal overflow. Recent5choices, search/long Vietnamese names, multi3,3reviewrows, blank error, amount changes/remove, Confirm/add2, selective-copy2, bottomnav tested each. Result4target records/2meal labels, sources unchanged, unique IDs. Success launcher48px, bottom404 above nav673/688/688. Measured JSON and screenshot ignored under.local; no physical-phone claim.
23. **Accessibility:** native wrapped labeled search/select/amount inputs, unique numbered amount labels, real meaningful selection/remove buttons, aria-pressed and selected count, alert/error focus target, visible blue2.4px focus. Tab amount→Remove, ShiftTab→amount; Enter/Space select/review/Save/Cancel; Escape existing copy-all dialog cancel0writes. Selection stays originating result container; Remove→next amount; Cancel/Save→launcher above nav. Pending Confirm/inputs/Back/Cancel disabled. No screen-reader/WCAG certification.
24. **Privacy/security:** local relative modules only, no new dependency/CDN/font/AI/analytics/upload/account/backend. Safe text APIs; no user-entered HTML injection. No photo storage change. Fixtures/probes/audits/screenshot ignored.local on owned8783; user8765 origin untouched. Original private master not modified/staged.
25. **Files:** created js/nutrition-batch.js, js/nutrition-batch-ui.js, tests/nutrition-batch.test.js. Small app integration and CSS additions; index/import URLs30→31 cache-only in other JS. Docs V4_ROADMAP,this report,DATA_MODEL,README,FULL_STEP_BY_STEP_GUIDE.txt,TRACKER_PRODUCT_IDEAS; ignored private summary updated. No original tests/dependencies/program changes, no synthetic/private files committed.
26. **Git:** local main code2d27a81, docs/one-line whitespace cleanup checkpoint named Record Phase6A meal logging evidence and remaining6B. Final status inspected after commit; no fetch/push/reset/rebase/history rewrite or branch split. Cached origin/main comparison not remote verification.
27. **NOT VERIFIED:** physical phones/Safari/other engines/screen reader/WCAG certification/native quota/power loss/very large histories/real multi-tab Nutrition race/manual full-image restore/all pre-existing editor workflows. Automated regressions pass, browser storage failure was injected. Pending batch deliberately not recovered after reload. Historical observer-error attribution unproven; current captures empty.
28. **DONE gate:**34/34 passed in verified local scope; matrix below. Only6A marked implemented/tested. FullPhase6 remains incomplete. No blocking source-snapshot/schema issue and no remaining important review finding.
29. **Exact remaining6B:** cookbook recipe search/duplicate/cooking mode and remaining library/reuse polish are unimplemented. Favorites/pins/portion basis/pending recovery require separate approved persistent-data contract/schema decisions; cooked-weight/yield repartition/shopping list remain later proposals. No6B code started. **STOP here; await a separate task.**

## Phase6A 34-gate evidence

| Gate | Evidence / result |
| --- | --- |
|1 Baseline231 |PASS; originals unchanged,262final |
|2 Schema8 |PASS; no fields/migration |
|3 Recent by meal |PASS; order/dedupe/fallback pure+browserA |
|4 Recent0writes |PASS; probe/raw equality |
|5 Multi-select |PASS;3 through query/type changes |
|6 Explicit review |PASS; no selection writes |
|7 Amount each |PASS; independent2/1/1, decimals |
|8 Atomic batch |PASS; validate all before append/save once |
|9 ExactN |PASS;3/2 actual, mobileadd2+copy2 |
|10 FreshIDs |PASS; unique/new IDs and collision tests |
|11 Double submit |PASS; delayed writer + disabled pending pointer attempts |
|12 Date |PASS; historicalSep20, exact local string |
|13 Meal |PASS; Dinner/Lunch/preserve-source |
|14 Snapshots |PASS; independent per-serving food/recipe |
|15 Edit/delete isolation |PASS; old/new snapshots and browserJ |
|16 Invalid all rejects |PASS; blank row0writes |
|17 Stale safe |PASS; source/destination reject; unrelated merge |
|18 Failure atomic |PASS; exact JSON unchanged on injectedquota |
|19 Pending retained |PASS;3rows2/1/1 + retry |
|20 Selective subset |PASS; pure1of3/2of3, browser2of3 |
|21 Source unchanged |PASS; full original logged records comparison |
|22 CopyIDs fresh |PASS; UUID/new/unique append |
|23 Deleted source |PASS; recent disabled, copy historical allowed |
|24 MyDay |PASS;3items/1meal650macro browser+pure |
|25 Recipe scale |PASS; retained tests and4→2 browser |
|26 Search |PASS; accent behavior and pending retention |
|27 Backup roundtrip |PASS; create/parse/restore deep compare8 |
|28 Readonly0writes |PASS; opening/select/review/edit/Back/Cancel |
|29 Mobile3widths |PASS; no overflow and above-nav focus |
|30 Keyboard/focus |PASS; Enter/Space/Tab/ShiftTab/Escape and fixes |
|31 Full suite |PASS;262/262,56syntax |
|32 No migration |PASS; version8/code diff |
|33 No6B |PASS; scope/source review |
|34 No push |PASS; local checkpoints only |

---

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
