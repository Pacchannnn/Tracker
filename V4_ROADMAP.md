# Tracker V4 — implementation roadmap

04/10/2026 · Baseline V3 schema6, 55/55 tests đạt trước thay đổi. User cho phép cải tiến local nhỏ sau nghiên cứu; thay đổi sản phẩm lớn được giữ ở proposal để duyệt. Không yêu cầu remote AI/backend trong giai đoạn này.

**Goal:** giảm thao tác lặp lại và nối dữ liệu của Tracker thành trải nghiệm cá nhân nhất quán.
**Architecture:** giữ Vanilla JS, một JSON versioned và IndexedDB photos. Mở rộng module hiện có theo milestone, dùng derived views khi đủ; chỉ thêm schema khi có persistent structure mới.
**Tech stack:** HTML/CSS/JavaScript, Node test runner, fake-indexeddb chỉ cho test.

## Trạng thái và quy ước

### Approved local photo/recovery execution —12/10/2026

- [DONE LOCAL] R8 account IDB2/SQL003/photo protocol2/private manifests/operator prepare-only packet.
- [DONE LOCAL] R9 atomic JPEG pair+intent, verification/finalize/cache, exact owner/daily CAS and compound journal deletion.
- [DONE LOCAL] R10 three-file full recovery/new detached offline restore/saved recovery inspection.
- [PARTIAL] R11/R12 reviewed supported schema8 import/receipts; legacy ownership/old schema/raw drafts/photo migration still local, full mapper/rehearsal required before personal import.
- [VERIFIED LOCAL]765tests/147syntax/SQL45+121+60; frontend57/backend16 privacy/hash checks. Synthetic browser actual downloads/cross-device bytes/restore/import/delete-scope evidence.
- [NOT VERIFIED] Hosted/native/iPhone/max-size Safari/cold-offline; exact new320/360/390 override did not match observed width.
- [PENDING ACCESS/APPROVAL] Hosted catalog sign-in, Auth changes, install001/002/003/LOGIN/provision/Storage, hosting/deploy/synthetic writes. Hosting choice remains local preparation only.

Worklist, evidence and next manual steps: TRACKER_EXECUTION_STATUS.md, TRACKER_EXECUTION_VERIFICATION.md, TRACKER_PHOTO_RECOVERY_IMPLEMENTATION.md. Older entries below are historical; no new phase prompt required.

### Continuous R1–R16 execution —11/10/2026

Local operator installation/provisioning, native QA harness, gateway packaging/rate bound/cancellation and default-off reviewed preview write gate implemented; device identity setup UI added/tested. Public provider values confirmed in ignored env; gateway URL/hosting/remote actions pending approval. Prioritize real Auth+Gym/Nutrition/Journal preview once required security/account/deploy approvals arrive. Photo/recovery/import additions documented in TRACKER_PHOTO_RECOVERY_CONTRACT.md for required review before changing formats/ownership. No new phase prompt needed; worklist/status/evidence in TRACKER_EXECUTION_STATUS.md and TRACKER_EXECUTION_VERIFICATION.md. Real providers/physical devices/production NOT VERIFIED.

### Cloud Batch3 — preview readiness,11/10/2026

User approved one integrated local readiness batch from a9d1a78; Singapore Free project designated preview/synthetic-only. Build-time public environment config and exact HTTPS-origin CORS/proxy-ready Node gateway prepared; local-only defaults and disabled writes preserved. See CLOUD_BATCH3_IMPLEMENTATION.md and CLOUD_BATCH3_SETUP_GUIDE.md. Hosted migrations/roles/Auth/network/deploy/upload still NOT PERFORMED; personal migration/photos/production remain unapproved. No schema or dependency change.

### Cloud Batch 2 Final Browser QA — 11/10/2026 (LOCAL SYNTHETIC ACCEPTANCE PASS; STOP)

Verified clean main d633f17/632tests/112syntax/SQL45+121/48files. No baseline mismatch.
- [DONE] Actual laptop and final390px mobile set1→ACK→set2→Complete→second-device
  pull;exact history/snapshot/identity/order,distinct sets,no false-stale errors.
- [DONE] All requested conflict UI cases,including reload/stale review/tombstones
  and unsupported compound chain;A→B→A,pending logout,cache/reauth,delayed expiry/switch.
- [DONE]48 measured responsive cases across12 views/4 widths +3 Cloud Settings
  cases,Tab/Enter/focus,empty captured console error/warn lists.
- [DONE] Actual JSON/photo downloads,paired restore onto new8846,reload/exact bytes;
  full account rows/anonymous source unchanged across8 views;48-view JSON/photo integrity.
- [DONE] Locked queue-count0 bug fixed with2 RED→GREEN tests and browser retest;
  current634tests/112syntax/SQL45+121/48files766401bytes,HTTP48hashes/9private404.
- [DONE] Acceptance reports/docs/local checkpoint;no push. Normal cloud config disabled.

Schema8/photoDB1/backup8+1/MASTER_PLAN preserved. Real Supabase,native concurrent
PostgreSQL,iPhone/Safari/large data/quota/production NOT VERIFIED. Further provider
or Batch3 work needs separate approval. Older partial-browser status below is historical.

### Cloud Batch 2 — 10/10/2026 (IMPLEMENTED LOCAL; AUTOMATED PASS / BROWSER PARTIAL)

Baseline clean main1487cf3 /522tests /91syntax /schema8/photoDB1/backup8+1 verified.
User authorized complete local two-way sync, superseding Batch1 stopping boundary
for this batch only. No provider/project/production activation or personal import.

- [DONE] Separate scoped IndexedDB, atomic projection+outbox, stable installation
  identity, localRevision guards, raw legacy/snapshot-preserving aggregate mapping.
- [DONE] Bootstrap/pull/push, exact ACK/retry/lost-ACK recovery, tombstones,
  durable conflicts, explicit review and offline/cache/reauth lifecycle.
- [DONE] Existing app editor integration, minimal status/conflict/cache/live-choice
  UI, preview-only import preparation, guarded anonymous photo boundaries.
- [DONE] Real PostgreSQL WASM/RLS + two isolated IDB devices; 121 sync assertions
  and retained45 Batch1 SQL assertions. Actual SessionStore/planning after JSONB ACK.
- [DONE] Public runtime allowlist48, no new dependencies, module queriesv41.
- [DONE] Observed two-origin browser food exchange/offline reload/cache/reauth,
  explicit conflict choice, lost-ACK retry and import Cancel. Anonymous fixture unchanged.
- [DONE] Final regression after scope-memory and outer-await fixes: 632/632 tests,
  112/112 syntax; artifact48/766240bytes and HTTP hashes/private404 probes PASS.
- [DONE] Six reports, data model appendix, implementation report and recovery
  documentation. Local implementation checkpoint recorded in Git log; no push.
- [PENDING] Final browser retest/full six-area navigation/backup downloads and
 320/360/390 on final code. Computer Use stopped on URL confidence policy; no more UI input.

LOCAL automated evidence and browser release gate are separate. Real Supabase,
native multiple PostgreSQL connections, real iPhone/Safari/production NOT VERIFIED.
Schema8/photoDB1/backup8+1/Original plan retained; no8765 restore/test/upload/push.
Six CLOUD_BATCH2 documents record contracts, evidence, limitations and rollback.

**STOP after Batch2. NEXT:** complete missing synthetic browser QA, then separate
approval for provider setup/testing and Batch3 migration/photo contract. Do not
begin actual personal import, photos upload, provider provisioning or deploy.

### Cloud Implementation Batch1 — 08/10/2026 (IMPLEMENTED / TESTED LOCAL ONLY; STOP)

Latest user-authorized batch supersedes the prior9B-2A stopping boundary only
for Auth adapter/UI + private SQL/RLS + trusted gateway foundation. Baseline
clean main340c2fb,475/475tests,80/80syntax verified. No local schema change.

- [DONE] Supabase REST Email OTP adapter, authoritative UID, refresh/expiry,
  logout/switch/epochs/pending warnings; actual Settings paper UI. Public config
  disabled; tokens memory-only; anonymous workspace retained/account editor locked.
- [DONE] Private SQL migration: six tables, forced RLS, NOLOGIN/NOBYPASSRLS helper
  owner and EXECUTE-only gateway, scoped helpers, CAS/head locks, receipts,
  tombstones/feed/as-of-H bootstrap, device drafts and import ledger foundation.
- [DONE] Parameterized Node gateway + loopback read-only server, strict/domain
  validators, exact correction source/candidate checks, durable reject receipts.
- [DONE] Fresh522/522 Node tests (475 retained),91/91 syntax + inline harness;
  real PostgreSQL/WASM SQL integration +45 gateway assertions;42-file artifact
  graph/privacy/hash +42 HTTPassets/8 private404 probes; diff checks.
- [DONE] Disposable8830 packaged UI save/reload/history/backup integrity,8831
  fake-transport Auth A/B/error/expiry/pending/reload; actual mobile320/360/390.
- [DONE] Five CLOUD_BATCH1 reports/setup guide, roadmap/report/README updates.

**LOCAL PASS only.** Real Supabase/email/pooler/native multi-connection/iPhone/
Safari/production NOT VERIFIED. No8765 operation, personal upload, deployment,
GitHub push, local schema8/photoDB1/backup8+1/Original plan change. CLI writes
disabled; browser full sync/outbox/cloud photos not implemented.
pg8.23.1 and PGlite0.5.8 are isolated backend/test dependencies, excluded dist.

**NEXT / approval needed:** synthetic provider setup and verification; Batch2
account-scoped persistence/outbox/import/conflict contract. Do not begin Batch2
or provider provisioning automatically. Historical phase boundaries below retain
their original meaning; current checkpoint is in Git log.

### Phase9B-2A — 08/10/2026 (IMPLEMENTED / TESTED LOCAL SYNTHETIC ONLY; STOP)

Verified clean baseline727ed2f,453/453tests,76syntax,39artifact files; schema8/
photoDB1/backup8+1 unchanged. Approved9B-2A executes only synthetic lifecycle.

- [DONE] Provider-independent context and deterministic test-only mock under
  dev/auth; local-only/signed-out/authenticating/authenticated/expired/switching/error.
- [DONE] Scoped memory workspaces by env/project/UID/device; pending warnings,
  explicit fresh confirmation, epoch/AbortSignal guards, stale/newer-input protection,
  seal/URL cleanup. No real verified identity, native storage or data import.
- [DONE]22 auth tests; full475/475;80/80syntax; unchanged39-file artifact hashes,
 39HTTPassets and mock/private404 exclusions. All453 original assertions retained.
- [DONE] Disposable8820 mock A→B→A/expiry/rapid response/logout/reload/keyboard;
  harness/mobile320/360/390;8821 Tracker save/reload/history/six views and actual
  portable JSON before/after deep equality. No8765/user-data operation.
- [DONE] PHASE9B2A_AUTH_FOUNDATION, SECURITY_TEST_MATRIX and LOCAL_QA; report update.

PASS only in local/synthetic scope. Harness outside dist; normal runtime/public
UI/data unchanged. Mock reload intentionally resets memory; no durable/offline
cloud storage, outbox, account migration, Auth SDK, provider project or deployment.
Real Supabase/Auth/RLS/physical devices NOT VERIFIED. Pending scope seal is not
encryption. Detailed integration boundary and limitations in the three reports.

**NEXT:**9B-2B requires separate approval for real-adapter scope, SDK/dependency,
isolated project/accounts, credentials, privacy/cost and OTP/SMTP. No9B-2B/provider
work started; no push. Historical9B-1/9A stop notes below retain their original scope.

### Phase9B-1 — 08/10/2026 (IMPLEMENTED / VERIFIED LOCAL ONLY; STOP)

Baseline clean main541162b,439tests/74syntax; schema8/photoDB1/backup8+1 unchanged.
Approved scope completed: native Node explicit allowlist packaging into dist,
minimal static Vercel config, fourteen focused packaging tests and disposable QA.
Runtime UI/source/assets and existing assertions unchanged; no dependency added.

- [DONE] RED/GREEN packaging tests, junction/hardlink guards, secret redaction,
  exact graph/inventory/byte checks, unknown output retained rather than deleted.
- [DONE]39 files/664470bytes,453/453tests,76/76syntax; build/check/diff pass.
- [DONE]8800/8801 synthetic browser: six views + Weekly/Monthly,24 checks at
  320/360/390, keyboard/focus, reload/log/history, paired backup deep equality.
- [DONE] Read-only JSON/photo state equal; old216sessions preserved after one
  synthetic new session; restored JSON and4photos/5224binarybytes match.
- [DONE] Readiness/inventory/local-QA docs and reproducible README commands.

Acceptance PASS only for this local scope. No deployment, push, user-origin8765
operation or cloud setup. Vercel production/HTTPS/cache and physical devices
NOT VERIFIED; network audit is source/DOM based, not a complete browser trace.
See PHASE9B1_DEPLOYMENT_READINESS.md, PHASE9B1_ARTIFACT_INVENTORY.md and
PHASE9B1_LOCAL_QA.md for gates/limitations. Phase9A documents remain historical
design proposals; their NOT STARTED wording records that earlier milestone.

**NEXT:** separate approval for9B-2 Auth foundation and its provider/privacy,
credential/OTP/SMTP/test-environment/cost gates. Static deployment also requires
explicit approval. No9B-2 implementation authorized here. STOP AFTER9B-1.

### Phase9A — 08/10/2026 (DESIGN / RESEARCH ONLY)

Baseline verified trước tài liệu: clean main `93befc1`, code `2e4dfc7`;
fresh439/439 tests,74/74 syntax; schema8, photoDB1, JSONbackup8/photoformat1.
Không có khác biệt đáng kể với baseline user đưa.

1. [DONE] Audit source/storage/snapshots/drafts/backup và tài liệu liên quan;
   tách VERIFIED local contracts khỏi PROPOSED cloud và NOT VERIFIED devices.
2. [DONE] Official research: Vercel/Supabase pricing, Auth/SMTP/RLS/private
   Storage, Edge limits, PostgreSQL ordering, browser transaction/origin/eviction.
3. [DONE] Năm design deliverables: architecture, sync contract, cloud data model,
   security/privacy/photo/migration và implementation roadmap.
4. [DONE] Ghi decisions/approval gates; update report/roadmap DESIGN ONLY.

Recommendation có điều kiện: Vanilla UI + Vercel static + Supabase Auth/PG/private
Storage; aggregate JSONB CAS, server-authoritative commit groups, receipts,
account-scoped transactional IDB/outbox. Persistence boundary và trusted gateway
là proposals cần duyệt, không phải app hiện có. Không LWW hoặc auto import.

CURRENT PHASE:9A DESIGN / RESEARCH ONLY. CURRENT STEP:design handoff.
IN PROGRESS:none after handoff. NEXT PROPOSED:9B-1 Deployment readiness,
LOCAL ONLY; cần approval riêng. 9B-1…9B-10 NOT STARTED / NOT APPROVED.
BLOCKERS:none for9A; future gates: provider/privacy/region/budget/SMTP,
account storage/outbox/gateway, conflicts/drafts, retention/offline shell,
independent backup vượt caps và devices thật. KNOWN LIMITS:photo backup200MB,
JSONdata10MB; one selected draft/device export không chứa tất cả cloud drafts;
browser eviction, PG/object storage không atomic, cloud không E2EE.

App/tests/schema/photoDB/backup formats/dependencies/master/user data unchanged.
Không project creation/credentials/deploy/upload/migration/SW/PWA/AI/E1/E2/push.
Evidence/proposals: PHASE9A_ARCHITECTURE_DECISION.md, PHASE9A_SYNC_CONTRACT.md,
PHASE9A_CLOUD_DATA_MODEL.md, PHASE9A_SECURITY_PRIVACY.md,
PHASE9A_IMPLEMENTATION_ROADMAP.md. **STOP AFTER9A.**
Earlier dated STOPs below remain historical boundaries.

### Phase8B-2 — 08/10/2026 (IMPLEMENTED / TESTED · verified local scope only)

Baseline main c3eb5c3 clean; code6dea230; fresh412/412 tests,71syntax;schema8.
1. [DONE] Baseline/source/backup/storage audit; separate automated/engine/device evidence.
2. [DONE] Focused RED→GREEN blocked-open/late-close and failed export URL fixes;
   27new tests, all412old tests retained:439/439;74syntax;diff/review PASS.
3. [DONE] Disposable origins8794/8795,60 total cases (10 screens × 6 widths), native download/filechooser
   restore/reload/exactJSON+photo bytes, repeat import, UI and zero-write evidence.
4. [DONE] Compatibility matrix, backup evidence, manual device checklist, report/guide.
   Code2e4dfc7; docs checkpoint separate. Main-only, local commits, no push.
Only reproduced bounded fixes; no schema/format/restore semantics/dependency changes.
Real devices NOT VERIFIED. STOP after8B-2; E1/E2/PWA/cloud/AI excluded; no push.
CURRENT STEP:handoff. IN PROGRESS:none. NEXT:manual device checklist only.
BLOCKERS:none for completed local scope; Safari/Gecko/real-device surfaces unavailable.
KNOWN LIMITS:browser eviction, native quota/crash/private/OOM/safe-area/keyboard pending;
two-file restore remains non-atomic, photo ID collisions skip. FullPhase8 incomplete.
DECISIONS NEEDED:devices and secure disposable transport for manual tests, no deployment
automatically approved. Model:current coding model/high for tests; medium for docs.
Evidence:PHASE8B2_COMPATIBILITY_MATRIX.md,PHASE8B2_BACKUP_VERIFICATION.md,
PHASE8B2_MANUAL_DEVICE_CHECKLIST.md. Earlier STOPs below are historical boundaries.

### Phase8B-1 — 08/10/2026 (IMPLEMENTED / TESTED)

Strict user authorization: Food Library search + exercise-history paging only.
Baseline eab9cd9 clean main, fresh388/388 tests and69syntax, schema8→8.
1. [DONE] RED→GREEN shared Food search and pure existing-set paging tests.
2. [DONE] App integration: reuse searchFoods, explicit Clear;20→40→60→remaining,
   count/LoadMore/focus; transient DOM context resets, same order/group/details.
3. [DONE] Disposable browser/zero-write/backup identity/mobile320/360/390/keyboard,
   full388 regression + new tests/syntax/diff and independent review.
4. [DONE] Report/README/guide, local code/docs checkpoints. STOP8B-1; no push.
Depends1→2→3→4. Main-only preference applies; no schema/key/IDB/dependency change.
E1/E2/pins/recovery/grams/PWA/AI and all other Phase8 work remain excluded.

Result388→412/412;24new tests,71syntax; original388tests/assertions unchanged.
Browser8792 Food Search/Clear/noresult/photo,73sets20→40→60→73/context/reset/
reload, actual320/360/390/keyboard and0Storage/IDBwrites. RawJSON/meta/bytes/
backup equal, JSON8/photo1 roundtrip; no native restore/destructive tests.
Domain/final reviews PASS. Code6dea230; docs checkpoint separate;modules40/styles39.
Only8B-1 complete; fullPhase8 incomplete. NEXT:STOP8B-1, no8B-2/no push.
Known limitations/device readiness unchanged;17-item evidence in implementation report.

### Phase8A — 08/10/2026 (DESIGN / RESEARCH ONLY)

User chỉ duyệt product audit/experiment planning, không8B implementation.
Baseline main1fc8add clean; code6c67590; fresh388/388tests và69syntax;schema8.
1. [DONE] Audit6module từ source/tests/report và backlog/research hiện có; C/T/O7/H/R tách riêng.
2. [DONE] Matrix16hướng theo value/frequency/actions/cost/risk/schema/modules/tests/rollback.
3. [DONE] Tối đa2proposal: E1 fill từ hiệp trước cùng slot; E2 MyDay Home prototype conditional.
4. [DONE] Backup/device/Safari/large-data checklist và decision report; docs-only main checkpoint.
Dependencies1→2→3→4; no model/provider/dependency decision required for this audit.
Documents: [PHASE8_PRODUCT_AUDIT.md](PHASE8_PRODUCT_AUDIT.md),
[PHASE8_EXPERIMENT_BACKLOG.md](PHASE8_EXPERIMENT_BACKLOG.md),
[PHASE8A_DECISION_REPORT.md](PHASE8A_DECISION_REPORT.md).
No appcode/tests/schema/dependency/data changes, no new browser/restore/seed QA.
Experiments PROPOSED / NOT APPROVED;8B NOT STARTED. STOP8A, no push.
Decision backlog: repeated-set usage, Home purpose, device availability/transport,
which experiment to approve. Backup readiness is a gate, not experiment3.
Earlier phase handoff/STOP statements below are historical boundaries.

### Phase7B-2 execution — 07–08/10/2026 (IMPLEMENTED / TESTED)

Baseline15676ff clean main;333/333 tests,65 syntax checks; schema8→8.
1. [DONE] RED monthly tests → pure deriveMonthMemories, shared calendar/validation; task review PASS.
2. [DONE] Monthly UI, explicit selected-photo reads and URL lifecycle tests; task review PASS.
3. [DONE] Exact month-source return, synthetic I/J/source/error/reload/Weekly regressions;
   actual320/360/390/keyboard, zero-write/absentDB/backup evidence and final review.
4. [DONE] Docs/local code+docs checkpoints; STOP beforePhase8, no push.
Depends1→2→3→4. Model/current coding tier/high; no persistent entity/migration.
Risks: month/future denominators, metadata conflict, deleted/late photos, URL
lifetime, dirty sources/focus; no ranking/narrative/AI/highlights/schema9.

Results333→388/388;55 new tests,69 recursive JS syntax checks; Weekly focused50/50.
Code6c67590; separate docs checkpoint. Modules38/styles39. Browser I/J, exact
source8 routes at320/360/390, dirty/edit/delete/Back, independent errors/reload,
absentDB, immutable raw/meta/original/thumbnail/backup and0Storage/IDBwrites.
Weekly10 flows/9source routes/error-mobile/reload remain passing. Real keyboard
and screenshot QA completed; selected-tab hover contrast corrected. Independent
review PASS; no material remaining finding in exercised scope. All30 gates PASS.
7A APPROVED;7B-1/7B-2/full bounded7 IMPLEMENTED / TESTED;schema8 unchanged.
Limitations: whole-store metadata scan/non-atomic JSON+IDB reads, cold iframe QA
timeout/cache issue resolved for repeated runs; physical phone/Safari/screen
reader/native quota/large dataset not certified. Evidence:V4_IMPLEMENTATION_REPORT.md.
CURRENT STEP:handoff. IN PROGRESS:none. NEXT:STOP beforePhase8.

### Phase 7B-1 execution — 06/10/2026 (IMPLEMENTED / TESTED)

Phase7A contract APPROVED by explicit7B-1 request. Baseline main4a97ada, clean,
283/283 tests and59 JS syntax checks. Schema8→8; no migration or stored summary.
1. [DONE] RED calendar/domain/provenance tests → pure Weekly Review helpers.
2. [DONE] Weekly UI under Tiến độ, exact source IDs and transient Back.
3. [DONE] Synthetic browser A–H/K/L/M,320/360/390,0writes/backup/regressions.
4. [DONE] Independent review/fixes, documentation; local checkpoints at handoff. STOP before7B-2.
Dependencies:1→2→3→4. Model/reasoning: current coding model/high for validation,
ownership/unknown denominators.333/333 tests,65 syntax checks;50 new tests.
Code checkpoint5a6b9c5; separate documentation checkpoint at handoff. Asset36.
Risks: legacy ambiguity, root failure isolation, async metadata/focus, dirty
editors. No Monthly Memories runtime, anatomical guessing, Phase8 or push.

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
- **CURRENT PHASE:**8B-1 IMPLEMENTED / TESTED in verified local scope;schema8;412tests/71syntax.8A design remains complete;fullPhase8 incomplete,8B-2 not started.
- **CURRENT STEP:**handoff. IN PROGRESS:none. NEXT:STOP8B-1; await separately approved next scope. BLOCKERS:none in exercised8B-1 scope. Current implementation evidence:V4_IMPLEMENTATION_REPORT.md; E1/E2 remain proposals in PHASE8A_DECISION_REPORT.md.
- **BLOCKERS:** none in bounded7 scope. KNOWN BUGS: no material remaining finding in exercised Monthly/Weekly flows. Selected-tab hover contrast corrected; final standalone warning/error logs empty. Earlier6B observer error remains historical and unattributed.
- **DECIDE LATER:** favorites/pins, portion basis, pending recovery, cooked-weight/yield repartition, shopping list; MyDay-as-Home, richer mood/catalog/backend/AI remain proposals. No blocking6B product decision.
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

### Phase 6B execution plan — 06/10/2026 (IMPLEMENTED / TESTED; STOP)

Verified baseline: clean main4864322 (6A code2d27a81), schema8,262tests/56syntax. Actual recipe fields: id,name,description,servings,ingredients[{quantity,unit,name}],steps[],tags[],notes,nutritionPerServing(null or four known macros). CRUD validates through validateRecipe/updateData/ensureUnchanged; recipe logging snapshots recipe:<id>/1 phần, amount1, independent of cook-size. Recipe photo belongs to IDB ownerType=recipe/ownerId; deletion retains historical snapshots and photos for explicit management. No safe photo clone needed: new duplicate starts without owned photo. No timestamps in current recipe schema.

Design: pure js/cookbook.js for temporary normalized name/tag/ingredient search, exact tag ALL + query AND, original library order; whitelist deep-cloned definition + raw editor values; guarded fresh-ID duplicate writer reuses validateRecipe and existing locked updateData; cooking preview wraps scaleRecipe+recipeTotals. js/cookbook-ui.js owns query/tags/cooking{id,target}/duplicate{source,raw} only in memory. app reuses current recipe editor/cards/logging; duplicate input tracked in transient raw draft, failure retained, Save source baseline checked under lock and double-submit guarded. Cooking shows numbered exact steps/notes and scale preview, no step progress (optional omitted), no second logger. Back keeps filters and source card; log shortcut returns to original recipe log form. Latest missing source fails closed. Batch Remove visible Bỏ món with full contextual aria-label.

- [x] 1. RED tests tests/cookbook.test.js: accent/name/tag/ingredient/blank/no-match/ALL/immutability/0writes; whitelisted deep clone/freshID/history/no log, double save/stale/deleted/quota/retry; scale base/smaller/larger/fractional/invalid/known0/null/steps/source immutable; recipe-to6A/recents/copy/MyDay; schema8 create/parse/restore with original+copy+deleted history and photo-owner isolation. Run node --test tests/cookbook.test.js before helpers exist.
- [x] 2. GREEN domain helpers + duplicate writer in js/cookbook.js; reuse validateRecipe/ensureUnchanged/scaleRecipe/recipeTotals/updateData/UUID; retain262 assertions, no schema/index/dependency/photo writes.
- [x] 3. UI integration: labeled local search/chips/clear/count/no-results; original form binds duplicate raw inputs/review/pending/Cancel/failure/freshSave; actions Nhân bản/Chế độ nấu; read-only cooking target/errors/ordered steps/Back/log shortcut; concise batch Remove accessible context. Cache34 and minimal wrap CSS only. Verify syntax/full tests.
- [x] 4. Separate synthetic origin browser A-L, photo owner fixture, probe0writes for readonly/draft edits/Cancel; duplicate failure/retry/double-save/stale; cooking4→2/invalid/Back/search retained; new copy6A log/delete/history/MyDay/reload;320/360/390 long name/ingredient/step/tag/many steps/decimal/editor/cooking/short Remove, keyboard/focus and captured logs/screenshot.
- [x] 5. Independent correctness review/fixes; fresh full tests/syntax/diff,36-gate evidence; update report/roadmap/model/README/guide/product ideas/private summary; local code/docs checkpoints, clean main, no remote operation. Only mark full boundedPhase6 implemented/tested after all36gates. STOP before7.

Dependencies1→2→3→4→5. Model/reasoning: coding model/high for snapshot/stale/ID/state/navigation verification, medium for docs. Minimal approaches chosen: reuse inline editor instead of second editor; dedicated read-only subview instead of router; exact tags from data instead of taxonomy; omit optional step checkboxes. Schema8 stays8. Deferred proposals remain favorites/pins/portion basis/pending recovery/cooked-weight/yield/shopping; not required for bounded6 release and not implemented here.

Results:262→283/283 tests,59syntax, clean diff.21 new groups with original262 assertions unchanged.20 groups RED before source; imported structured-separator regression RED before fix. Synthetic8784 browser A-L:0write search/filter/Cooking/draft/Cancel, source-stale/delete rejects, injected quota retained/retry1copy, double-save guarded;4→2=200g/600kcal with300kcal per serving and existing consumed default1. Duplicate batch log→delete retains MyDay300kcal; selective snapshot copy2serves gives600kcal. Actual320/360/390 long data/12steps/editor/batch/navigation/keyboard/focus no overflow,48px buttons. Reload saved copy retained, search blank and cooking base4 restored. Source photo owner/metadata unchanged, no IDB write. Independent review resolved three issues; visual QA fixed hidden step numbers. Standalone final console empty; one iframe MutationObserver error recorded (no such code in repo; attribution unproven). Code ad1a8f5; separate docs checkpoint follows. All36 gates passed; full boundedPhase6 IMPLEMENTED / TESTED. Deferred proposals remain unimplemented. STOP Phase7.

### Phase 6A execution plan — 06/10/2026 (IMPLEMENTED / TESTED)

Verified baseline: clean local main88bba6b, schema8,231/231 tests,53JS syntax. Existing entries carry id/date/meal/foodId/food per-serving snapshot/servings. Recipe IDs in entries use recipe:<id>; foodSnapshotForEntry retains historical snapshot on same-food edits. Strict backup accepts missing live sources if snapshots have complete nonnegative finite macros. CopyDayEntries clones snapshots/fresh IDs and preserves original meal. Recipe consumed amount defaults1 and remains separate from cook-size preview. Existing updateData clones latest JSON inside the origin Web Lock and persists once; unrelated changes merge, ensureUnchanged protects edited records. No schema or photo change needed.

Design: focused js/nutrition-batch.js for derived recent choices, immutable selection/review validation/record creation and guarded write; js/nutrition-batch-ui.js for inline add/copy selection + review. Integrate as daily-view shortcut, preserve single food logger/edit/search, copy-all, saved meals and recipe scaling/logging. Recent prioritizes exact same meal label, newest saved local date then latest append position; dedupe source key, fallback global explicitly labeled. Missing/unknown-macro definitions visible disabled, never resurrected. Search reuses searchFoods for food/recipe name lists.

Transient rows capture complete source baseline; new-source amount1, copy amount uses saved servings. Review captures destination date/meal and all destination-date entries. Confirm validates all rows, compares relevant source records and destination-day baseline against latest under updateData lock, creates unique fresh IDs and appends once. Changed relevant data rejects; other dates/domains merge. Writer prevents in-flight/repeated acceptance; failure retains review and allows explicit retry. Copy uses historical food snapshot and old foodId even if source definition edited/deleted; source entry change/deletion rejects. Known zero stays0; incomplete/null snapshots reject, no validator bypass.

- [x] 1. RED automated tests: meal-priority/dedupe/fallback/missing source/frozen input; select1/3/duplicate/remove/amount; exactN/UUID/date/meal/macros; stale-source/destination/unrelated merge; double-submit/storage failure/retry/cancel0write; copy1/2of3/source unchanged/deleted definition; MyDay totals, recipe/search, schema8 backup roundtrip. Run node --test tests/nutrition-batch.test.js; verified missing-interface failure before source.
- [x] 2. GREEN helpers/writer in js/nutrition-batch.js, reuse validateEntry/dailyTotals/foodSnapshotForEntry/ensureUnchanged/updateData. Retained231 existing tests/assertions. Domain and UI share the verified code checkpoint2d27a81.
- [x] 3. UI/module integration + minimal CSS/cache31: daily add-many shortcut; meal/recent/search/type filters preserve selection; selected count; review labeled independent amounts/macros/remove/Back/Cancel; freeze controls during pending save; source/destination selective-copy picker, optional preserve original meal vs explicit target meal; focus after select/remove/success. Existing editors/copy-all remain.
- [x] 4. Browser separate synthetic origin A-L: recent meal order;3items/amount; search selection;3->2; invalid all reject; doubleConfirm; injected storage failure retained/retry; old date; selective2of3; edited/deleted definitions; MyDay totals/count; reload transient lost/persistent retained. Probe readonly flows0JSON/0IDB; actual320/360/390 long names,3+rows/review/error/copy/bottomnav and keyboard/focus. No user origin access.
- [x] 5. Independent review/fix, fresh full suite/syntax/diff, schema8 roundtrip,34-gate evidence; update report/roadmap/model/README/guide/private summary; local code/docs checkpoints. Only6A DONE; full6 remains incomplete. STOP before6B.

Dependencies1->2->3->4->5. Model/reasoning: current coding model/high for atomicity/snapshot/source/focus integration; medium for docs. Decisions: inline panels over modal wizard (less navigation), no persistent batch over recovery schema (scope), derived recents over favorites (scope). No blocking product decision; schema8 stays8. Pending survives search/filter/Back/navigation in the same tab, no reload recovery; Cancel explicitly discards only transient state. No6B/portion/grams/yield/shopping/backend/cloud/AI/PWA.

Results:231→262tests,56syntax;31new groups, all231 existing assertions unchanged. Synthetic8783 A-L plus candidate stale, old copy-all/Escape, derived-meal0writes and recipe scale smoke. Batch3:one write, exactSep20/Dinner/650kcal/P60/C100/F5; remove3→2 exact2; copy2of3 toSep22/Lunch550kcal from saved100/300 per serving even after source food/recipe deletion. Probe0JSON/0IDB and exact equality for open/search/select/unselect/review/amount/Back/Cancel; pending freeze and repeated click attempts do not add2N; synthetic quota retains2/1/1review then explicit retry. All320/360/390 no overflow; add2+copy2 append4 at same target date, two meal labels, sources unchanged. Original-container selection focus, Cancel/Save launcher focus verified; independent final review262/56 no important defect. Code2d27a81; separate docs/formatting checkpoint follows. Detailed34-gate matrix and limits in V4_IMPLEMENTATION_REPORT.md. FullPhase6 NOT DONE; STOP6B.

**Current bounded6B:** cookbook search/tag filters/duplicate review/cooking mode and concise batch actions IMPLEMENTED / TESTED. No remaining approved6B work. **Deferred proposals:** Persistent favorites/pins, portion basis, any pending recovery need a separately approved contract/schema decision. Cooked-weight/yield repartition and shopping list remain separate later proposals, not automatically authorized by6A. Current cook-size preview remains unchanged; no new grams mapping or nutrient estimates.

**Delivered bounded6 goal:** meal recents/multiadd/review/selectivecopy and cookbook search/duplicate/cookingmode, all schema8. **Separate future proposal:** favorites/pins/portionbasis/pending recovery may need an approved schema contract; they are not release requirements or implemented features.

Tests: double-submit batch, exact itemcount, date/meal retained, deletedfood, stale favorite, nullmacro, grams chỉ khi explicit mapping, unit invalid, historical snapshots. Arithmetic yield repartition phải giữ batchtotal, cookedgrams phải có measuredW. Manual: chọn3món → sửaamount1 → saveonce → reload3items; recipe edit/delete không đổi bữa trước. Shoppinglist làm sau, giữ scale và provenance.

## Phase 7 — weekly life review và monthly memories

**Phase7A CONTRACT APPROVED; Phase7B-1 WEEKLY REVIEW IMPLEMENTED / TESTED; Phase7B-2 MONTHLY MEMORIES IMPLEMENTED / TESTED; Full bounded Phase7 IMPLEMENTED / TESTED.** Approved contract: [PHASE7_LIFE_REVIEW_CONTRACT.md](PHASE7_LIFE_REVIEW_CONTRACT.md), unchanged. Weekly/Monthly use derived readonly schema8 data, exact-source transient Back and independent metadata reads. Monthly has full chronology/closed previews/explicit selected thumbnail and original actions. No stored highlights/hide/pins/ranking/narrative. Evidence: [V4_IMPLEMENTATION_REPORT.md](V4_IMPLEMENTATION_REPORT.md). Broader proposal below remains a backlog, not delivered functionality. STOP beforePhase8.

**Goal/value:** tìm lại dữ kiện có ích từ dữ liệu đã ghi. **Depends:** phase5 + agreed missing-data/mood semantics; richercatalog optional. **Data:** derived periodsummary; hiddenmemory/highlight flags nếu persist cần migration; không reinterpret legacy `drained`. **UI:** coverage/mooddistribution/activities, sources, photo highlights do user mở/chọn.

Tests: denominators journal/mood/nutrition riêng, same-date dedupe, sparse sample, emptyweek, chronological order, unknownmuscle bucket, hiddenmemory không xóaentry. Manual: fixture4journal/3mood/2fooddays phải hiển thị chính xác; không báo “tuần tốt/xấu” hoặc medical cause. Done: mọi số truy về records được và unknown không thành0.

## Phase 8 — experiments và quyết định ngoài local

**08/10/2026: Phase8A DESIGN / RESEARCH ONLY, không triển khai.** E1/E2 chỉ proposal,
chưa approved. [Audit](PHASE8_PRODUCT_AUDIT.md), [matrix/contracts](PHASE8_EXPERIMENT_BACKLOG.md),
[decision report](PHASE8A_DECISION_REPORT.md). No schema9/AI/cloud/backend/SW/push.
Broader ideas below are conditional backlog, not instructions to implement8B.

Notifications/PWA, advancedsettypes, equipmentprofiles, grams, associations, importers theo backlog. Mỗi experiment cần một câu hỏi usability và stop condition khi không giảm effort. Associations cần present/absent/unknown và sample window trước code; không có ngưỡng nhỏ nào tự chứng minh causation.

Remote AI/cloud/backend **DECIDE LATER**: provider, server keys, exactdata, cost, retention, offline/manual fallback, account/deletion, storage. Không triển khai trong research này. Chỉ nghiên cứu deployment sau nhu cầu đa thiết bị và backup được chứng minh.

## Evidence log

- 04/10 pre-change: npm test55/55, không thay appcode trong lúc thu thập corpus.
- 04/10 post-change: 60/60 tests, JS syntax và diff checks đạt; browser search/scale/tags/save/reload/mobile đã chạy. Bằng chứng và các test chưa thực hiện: `V4_IMPLEMENTATION_REPORT.md`.

- 05/10 Phase 2: baseline60/60 →74/74; schema6→7 additive. Builder3bài/reorder/raw blank/reload/Continue/Discard; Planner result reload/input invalidation; Start/Save cleanup; two real tabs conflict. Paired backup8770→8771 giữ toàn bộ JSON +3 photo metadata/owners/blob/thumbnail bytes. Narrow iframe320/360/390 không overflow. Code checkpoint7c41470; full evidence/limits trong V4_IMPLEMENTATION_REPORT.md. STOP, không Phase3/push.

- 05/10 Phase 3: schema7→7, baseline74/74 →82/82 tests. Shared inline Add/Replace, AND filters, accent search, pending review, Phase2 draft integration. Browser A–E at disposable8772; Add/Replace confirmations at iframe320/360/390, no horizontal overflow. Code checkpoint b0d31cf. See V4_IMPLEMENTATION_REPORT.md for evidence and limits. STOP/no push/no Phase4.

- 06/10 Phase4B-4:180→197 tests; schema8 unchanged;47 syntax checks; code61de602; source/ownership/atomicity/two-tab/backup/mobile evidence in current report. Phase4 complete in tested local scope; STOP before5.
