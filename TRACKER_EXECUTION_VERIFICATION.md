# Tracker — execution evidence, 11/10/2026

## Scope and baseline

Continuous execution from main549b1a1. Original untracked audit/prompt files preserved. Fresh baseline:639/639 Node tests,112 standalone JS checks,SQL45/121,48 public files/766401 bytes; schema8, anonymous photoDB1, accountDB1, JSON8/photo1. Local implementation authorized; real provider/deployment/writes and material format changes require separate user review.

No access to8765, no actual Supabase requests, no migration/LOGIN/provisioning/deploy/cloud upload/GitHub push/personal file import. Public URL normalized to project origin and confirmed publishable key stored in ignored `.env.preview.local`; neither hardcoded in source nor copied into reports. Actual gateway URL is absent; cloud activation absent.

## Implemented and reviewed locally

| Capability | Evidence / practical limit |
|---|---|
| Preview write guard | Default off; enabled only with environment preview, exact project reference, HTTPS origin and reviewed UUID allowlist. JWT verification precedes allowlist/SQL. Unapproved UID rejected before database calls. Runtime remains OFF; no remote activation |
| Bounded gateway |120 valid POST/min/process,429/Retry-After,2MiB existing body bound,10s Auth timeout, socket-disconnect AbortSignal. Health reports configured writes state/liveness only. No distributed rate-limit/production claim; a DB commit already started may still complete after client disconnect, repaired through receipts |
| Operator prepare |001/002 unchanged bodies inside one transaction, reviewed project metadata and source hashes, existing schema refusal, unsafe memberships rejected, role ownership temporarily granted in correct direction; runtime created NOLOGIN |
| Operator provision |Confirmed Auth UID checked without selecting email/token, actual reviewed device IDs, parameterized scoped registration, temporary SET grant restored transactionally. Default CLI offline; remote requires execution flag+matching approval+verified-TLS env-only secret |
| PostgreSQL16 role edge |Non-superuser postgres characterization preserves bootstrap ADMIN-only memberships/grantor-specific self options; runtime grant explicitly ADMIN FALSE/INHERIT TRUE/SET FALSE. Unusable or unsafe other-grantor edge fails closed.14 focused tests; this is PGlite, not hosted Supabase proof |
| Native acceptance harness |Two independent clients/PIDs with observed lock wait, CAS/head race, rollback/no version leak, exact receipts/retries/operation-ID collision,fixed-H snapshot/feed/counts,UID isolation. Expiring reviewed synthetic-only scope and direct verified TLS.6 local tests; default CLI returned NOT VERIFIED:approval_required and connected nowhere. Actual native run still NOT VERIFIED |
| Backend packaging |12 explicit runtime files, import graph/privacy/hashes, linked/unexpected paths rejected; private input files not copied; sensitive source blocks without replacing previous artifact. Specific private-key headers avoid mistaking gateway's own validator regex for a key. Actual known key/token fixtures still refused |
| Device setup identity |Readonly status exposes existing installation device ID, scoped UID/environment/project. Visible details use safe text, do not register/sync on view; sealed/logout removes IDs. Installation can be shared across account scopes; ID is metadata, not a credential |
| QA entry safety |Observed old fixture hardcoded app version42 while index now43, so mock did not initialize. Replaced with exact single-entry extraction, matched version import, fail-closed missing/duplicate entry. Browser was not sent Auth requests until mock controls/owned URL confirmed.2 regression tests; importing helper starts no server |

Independent requesting-code-review reviewed runtime/operator/native/package/workspace changes; discovered runtime inheritance/ADMIN/SET P2, fixed with two RED→GREEN cases; reviewer reran16 focused tests and confirmed resolved. No new important findings reported in reviewed scope; this is not a claim of exhaustive hosted security certification.

## Fresh final verification

- `npm test`: **669/669 PASS**, no skipped/cancelled tests. `.local/execution-final-regression.txt`.
- `node --check` over standalone source/tests/scripts excluding dist/gateway-dist/node_modules/.local: **120/120 PASS**.
- `node cloud/tests/run-db.js`: **45 PASS** on actual PostgreSQL WASM/PGlite.
- `node cloud/tests/run-sync-db.js`: **121 PASS**, SQL+isolated IDB; no native/hosted inference.
- `npm run build` + `npm run check:artifact`: **48 approved public files/766989 bytes**, graph/privacy/hash PASS; local-only config.
- `node scripts/gateway-package.js` + `--check` + `--inventory`: **12 approved backend runtime files**, imports/privacy/hash PASS. Inventory JSON retained under ignored `.local`.
- Incomplete `.env.preview.local` build tested through child process: expected rejection, `dist/js/cloud-config.js` exact bytes unchanged. Source config still disabled. No network from packaging.
- `git diff --check` PASS (Git CRLF conversion warnings are line-ending notices, not whitespace failures). Migrations001/002,MASTER_PLAN,dependency files and data formats unchanged.

## Actual browser smoke executed in this workflow

Owned `node cloud/tests/prepare-sync-browser.js` process verified via TCP8840 PID/command line. Gateway uses in-memory PGlite; Auth transport mocked before app import. Only browser tab URL `http://127.0.0.1:8840/` interacted with, plus local assets. No8765.

1. Settings → synthetic email/OTP123456 intercepted locally → verified mock accountA → explicit account workspace open.
2. Expanded **Thông tin thiết bị cho setup preview**; exact scope preview/syntheticqa/UIDA and existing device33333333-3333-4333-8333-333333333333 displayed.
3. Geometry desktop1280:document scrollWidth1265. Expanded identity view at320/360/390:body+document widths305/345/375 respectively; **no horizontal overflow**.
4. Captured browser error/warn list empty; fixture diagnostics external0/errors0/anonymousUnchanged=true. Domain/outbox counts unchanged in visible diagnostics; no claim of byte-for-byte whole-row browser comparison here. Workspace activation can update lifecycle/localRevision; Node readonly-row equality test passed separately.
5. Logout sealed account; IDs disappeared and unknown queue count displayed, saved cache retained. No sync button clicked; fresh mock DB was not used to re-accept historical cached data. Browser statuses alone do not prove server equality.

This is focused smoke for the new UI, not a repeat of all Batch2 E2E or an actual OTP/provider/device release test. Existing Batch2 browser acceptance remains historical evidence. New workout cross-device sync, backup actual downloads/paired restore, cloud conflicts and physical iPhone were **not rerun in this workflow**; no PASS inferred from Node tests or viewport measurements.

## Artifacts, rollback and approvals

Public frontend48 files; backend12 files (server,gateway,cloud pg manifest/lock,seven domain modules,generated root package type). Neither artifact contains reports/operator/test/migrations/private plans/env/data/photos or node_modules. Backend must run as Node, not static published files. Secret-scanning tests and inventories are local evidence; actual hosting assets/network/caches still NOT VERIFIED.

Writes kill switch false+restart retains local queue; revert frontend to local-only using normal build. No DROP/schema reset/data cleanup. Gateway package rejects invalid/unexpected inputs instead of deleting them. Auth secrets live in memory/client and server secret manager as applicable; no secrets requested in chat.

Pending: remote read-only approval/access; hosting/account/delivery/HTTPS URLs; Auth/test emails/SMTP; hosted migrations/LOGIN/verified TLS/device provisioning; explicit synthetic write/upload approval; native SQL and actual A/B browser+iPhone. Proposed photo protocol/IDB/recovery/import contract awaits required user review. No Service Worker, GC, production or personal migration approval.

See TRACKER_PREVIEW_EXECUTION_GUIDE.md for manual steps and TRACKER_EXECUTION_STATUS.md for each R1–R16 state. This milestone is **LOCAL READINESS PASS / FULL RELEASE NOT VERIFIED**, not workflow completion.

## Latest approved local photo/recovery verification —12/10/2026

Supersedes the earlier contract-pending/counts/accountDB1 statements for current implementation. Baseline main a546334:669 tests/120syntax/SQL45+121/public48/backend12. User approved local photo/recovery contract and read-only provider checks; hosting remains local preparation only.

- Fresh `npm test`: **765/765 PASS**, no failures/skips/cancellations; `.local/photo-release-final.txt` (54.2s).
- Standalone `node --check`, `rg --files -g '*.js'`: **147/147 PASS**; ignored artifact/node_modules/.local excluded.
- Actual local SQL runners: **45 Batch1 +121 Batch2 +60 photo assertions PASS**, PostgreSQL WASM/PGlite. No native/hosted concurrency or policy proof inferred.
- `npm run build`, `check:artifact`, public inventory after final EOF cleanup: **57 files/878367 bytes**, graph/privacy/byte-integrity PASS; local-only config.
- Gateway build/check/inventory: **16 files**, imports/privacy/hash PASS. Both inventories retained ignored; no private planning/env/data/test/operator/migration files in artifacts.
- `git diff --check` and staged diff check PASS after removing extra EOF blank lines (including newly staged files). MASTER_PLAN, migrations001/002 and dependency manifests unchanged. Portable schema8/anonymous photoDB1/photo1 stay unchanged; only additive account IDB2 and opt-in photo protocol2 introduced.
- Bounded independent review: final58 focused tests +60 photo SQL assertions passed; no outstanding actionable finding in reviewed scope. Prior file-race/pending-photo badge/paused refresh/coalesced sync/status precedence/owner dependencies/recovery domain validation findings corrected with RED→GREEN tests. Not a provider security certification.
- Actual browser accountA photo ACK→independent device2 missing-byte placeholder→verified download/display. Six actually downloaded paired files across devices were parsed/compared: accepted identities equal, independent devices, two assets identical raw bytes/hash. Empty and photo-bearing detached restores passed; reload finds saved copies. Account row unchanged by restore.
- Actual importer food source review→keep settings collision local→queue/manual local-gateway sync→receipt resume: accepted/one batch/one ACK; device2 food visible; anonymous/source unchanged. Full legacy/photo rehearsal still PARTIAL.
- Actual browser discovered food-photo/daily-date false conflict; SQL fixed then retested with fresh B on restarted disposable gateway. At H4: journal1/food1/photos2/assets4/applied jobs2, no conflict. Three actual B files parsed/scope/hash/count/asset-byte validated; detached restore left active revision21/H4 unchanged. Compound journal+one daily-photo delete ACK H5 kept food/photo and retained bytes. Old A cache preserved, not synchronized against restarted empty server.
- Six main areas load on observed611px viewport without overflow; current error/warn logs empty, synthetic fixture external0/errors0/anonymousUnchanged=true. Requested320/360/390 override did not match actual measured width, so new exact-width gates **NOT VERIFIED**. Prior checkpoint mobile evidence remains historical. Physical laptop+iPhone/provider/cold-offline/max-capacity exports not verified.
- Actual read-only Supabase `/auth/v1/settings`200: email enabled/public signup not disabled; REST without JWT401; Dashboard sign-in blocked catalog. No configuration/Auth-login/migration/upload occurred; detailed sanitized evidence in SUPABASE_PREFLIGHT_READONLY_REPORT.md.

Photo conflict UI retains comparison and recovery, without automatic resolution. Full legacy/photo importer remains partial. No personal release claim, no8765 access, no deploy/push/real writes/physical GC. Full capabilities, limitations, exact manual actions and rollback: TRACKER_PHOTO_RECOVERY_IMPLEMENTATION.md. Current R1–R16 state: TRACKER_EXECUTION_STATUS.md.

## Hosted SQL compatibility review —13/10/2026

Baseline main `b8c6369`,765 tests/147syntax in prior report; README local-link edit and two original untracked audit/prompt files preserved. Supplied real catalog results (postgres, absent Tracker schema/roles, managed Auth/Storage owners, no admin memberships) came from the user. This session made no Supabase SQL/network request or changes to Tracker data.

- Local hosted solution: existing001→002 transaction wrapper plus new offline `prepare-hosted-photos`;003 DB and all seven unchanged Storage policies split. No managed Auth GRANT or bucket INSERT. Dashboard private bucket prerequisite, postgres-owned fixed UID bridge, helper-owned predicates/FORCE RLS preserved. Bridge and private function ACLs rebuilt narrowly; foundation rejects unexpected function ACL recipients and003 rejects helper outbound membership.
- Tests reproduced global-default EXECUTE leakage and unexpected helper membership before correction (RED→GREEN). Final focused operator suites **23/23 PASS**; six new hosted characterization tests. Ordinary nonowner Storage policy installation fails atomically; provider Supautils delegation is not simulated or proved.
- Fresh `npm test`: **771/771 PASS**,0fail/skip/cancel/todo,48.2s; ignored evidence `.local/hosted-migration-regression.log`.
- Standalone `node --check` via `rg --files -g '*.js'`: **148/148 PASS**.
- Fresh local SQL runners: **45 Batch1 +121 Batch2 +60 photo assertions PASS**. Native/provider execution, concurrency, TLS and actual Storage policies **NOT VERIFIED**.
- Public build/check **57files/878367bytes**, gateway build/check **16files**, imports/privacy/hash PASS. Runtime artifacts unchanged; no operator/migration/report/test/private file published. No dependency/schema/backup/runtime UI changes.
- `git diff --check` and staged `git diff --cached --check` PASS, including the new runbook/test. Local checkpoint excludes the preceding README edit and two original untracked audit files; no push.
- Executed the runbook's PowerShell preparation block locally: generated001/002 SQL,003 private SQL,003 policy SQL and source-hash packet JSON under ignored `.local`; no connection or --execute. Source001/002 unchanged;003 hash `13b5761529645065c01c30148800d871364ade1a625df3f8a19dd12e9a4b6d93`.
- Independent scoped reviewer reproduced and rechecked ACL leaks; final additional in-memory inherited-USAGE/EXECUTE case denies browser calls while gateway/helper rights remain. User explicitly skipped cross-model review. Not a provider security certification.
- Verdict **CÒN BLOCKER**: actual role creation/Auth/reference/Storage read capabilities and provider policy DDL authority need evidence. Existing003 DROP CHECK constraint also requires explicit resolution of the user's no-DROP boundary. No remote SQL, migration, bucket, policy, deploy, personal/synthetic upload, push or origin8765 access occurred. New browser QA is not relevant to this operator-only change and was not run.

Use **SUPABASE_HOSTED_MIGRATION_RUNBOOK.md** for exact local commands, Dashboard preflight/postchecks, staged approvals, failure handling and the no-DROP constraint gate. Old combined photo packet/bucket creation guidance is superseded by this hosted runbook; do not paste old packets into hosted SQL Editor. Hosted migration/release acceptance remains pending.
