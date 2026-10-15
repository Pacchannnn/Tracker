# Tracker — execution evidence, 11/10/2026

## Direct domain delivery —15/10/2026

User corrected handoff to require a domain opening the app directly. Assigned **tracker-ppap7.vercel.app** to deployment `dpl_69mUp4zVUXCQb6Zd1zp1rFP1itK4`; official alias API exception exposes only this domain, preserving project protection for other previews. Stable URL is both generated public gateway origin and server exact CORS origin. Anonymous native HTTPS request without cookies:200/no Location redirect. Actual browser opens Tracker home directly; no Vercel login/Windows helper required for local browser use. This confirms the specific delivery fix only. No additional regression, E2E, cloud data/photo transfer or recovery tests were run. Supabase Auth/RLS/private bucket/write allowlist unchanged; no user records or old-origin browser storage accessed.

## Current hosted execution —14/10/2026

### Latest user-directed deployment without further QA

User stopped additional checks/tests. New server CA configuration and deployment below have no new regression/syntax/E2E acceptance run; previous817/158/SQL evidence is historical. Operator/runtime native connection already completed before the stop, with TLS authorized:true, restricted runtime LOGIN and approved function privileges. DB secret is Windows-DPAPI stored locally and Vercel preview Secret remotely; postgres credential is not hosted.

Preview `https://tracker-preview-fe3lsoph4-ppap7.vercel.app/` (`dpl_whuL1hX7LnNc9sGGSVjUCv21BNF7`) built/deployed with server CA PEM plus verified pg TLS, exact A/B synthetic write allowlist and source/frontend public configuration separation. Existing packaging/build security checks are part of deployment, not a new functional QA run. A/B synthetic accounts and visible UI device `fe2f984e-972f-4824-b68e-7c25a7dfdd87` registered transactionally through existing operator workflow; previous device retained. Login/workspace setup performed to obtain required metadata only; no synthetic record/photo logging, manual sync, HTTP health or backup/recovery tests after the user stop. Positive cross-device sync/photos/conflict/recovery acceptance remains NOT VERIFIED. No claim of complete tested release.

Final setup handoff incidentally showed normal automatic synchronization completing B's empty workspace: UI **Đã đồng bộ**,0pending JSON/photo operations. Saved `preview-connected-setup.png`. This supports actual deployed connection/empty-scope synchronization only; it does not prove data/photo transfer or two-device correctness. No additional QA scenario was run.

### Latest HTTPS continuation

Protected combined Preview deployed: `https://tracker-preview-5jdrv7imh-ppap7.vercel.app/` (`dpl_tsv1xySopXpijMNMkqX4ihkhA5Er`, READY, productionUrl:null). Dry inventory77files/1047659bytes; exact frontend57 plus reviewed backend/build graph. Preview public environment variables configured, source local-only unchanged, writes OFF, no DATABASE_URL. Vercel Auth protection remains enabled. Official CLI curl generated a provider protection-bypass credential for operator requests only; no credential appears in frontend or artifact.

Observed FUNCTION_INVOCATION_FAILED500 root cause: provider tracing missed query-versioned import custom-workout.js despite its presence in uploaded files. Shared packager now uses exact14module includeFiles brace expansion (173chars). Regression reproduces missing module and invokes isolated complete Lambda with sanitized missing-config503. Redeployed actual HTTPS `/health`:503 `{status:"error",code:"gateway_unavailable"}`; no false DB readiness claim. Private source/package/MASTER_PLAN/.env/build-script HTTP paths each404. Browser direct health navigation was blocked by client; the health response is authenticated CLI evidence, not browser health evidence.

Fresh full regression817/817 (0fail/skip/cancel/todo),158 JS syntax,SQL45+121+60 WASM, public57/882646B and gateway18/combined77 graph/privacy/hash checks PASS. Independent scoped reviewer confirmed exact graph, staging allowlist, same-origin credentials and cache/API separation; no remaining concrete finding. Evidence ignored `.local/preview-final-*`, `.local/preview-fixed-*`.

Actual A/B browser password login succeeded on combined origin. A local synthetic food/1pending outbox retained during confirmed switch; B food library empty and outbox0. Return A login timed out once; retry succeeded and reopening A showed the same synthetic food/1pending operation. Local cache A→B→A isolation/retention PASS, screenshots `https-account-b-isolation.png` and `https-account-a-return.png`. Native HTTPS A/B password/user checks rerun PASS; invalid JWT403, unprepared Storage insert403 each, visible objects0, private schema not exposed. Neither local cache separation nor these denial tests prove successful DB-backed cross-account/cross-device sync. Latest browser UI sync request reports unavailable; no ACK/upload claimed.

Earlier standalone protected HTTPS Preview had six views/desktop/error-free navigation and two synthetic Gym sets surviving reload, verified actual schema8 downloaded backup. Those are local-persistence evidence on a different preview origin. Mobile override did not reach requested widths; physical devices, positive sync, photo transfer, conflict/recovery and SMTP delivery remain NOT VERIFIED. Existing operator credential collection window is open but its encrypted file is absent; restricted runtime still NOLOGIN. No8765 interaction/personal data upload/GitHub push. See current status for corrected first-deployment production-alias deviation.

Hosted001/002 and003 DB packets committed on approved preview project; private bucket created through Dashboard; exact2 permissive+5 restrictive Storage policies committed. Actual postcheck8/8 private tables FORCE+ENABLE RLS and narrow bridge/role ACLs passed. Screenshots retained ignored in `.local/hosted-execution-2026-10-14/`. No source migrations rerun or managed Auth/Storage owner changed.

Native HTTPS requests using only encrypted synthetic A/B credentials: successful password token issuance, independent provider user/UID verification, confirmed/non-anonymous authenticated claims; invalid JWT403. Unprepared Storage INSERT denied403 for each account; lists empty; `tracker_sync` REST exposure denied406/PGRST106. No tokens persisted in evidence. Auth public signup disabled through Dashboard. This is limited actual provider evidence, not completed cloud sync or successful image upload evidence.

Earlier local checkpoint before combined hosting:807/807 Node regression;154 standalone JS syntax checks;SQL45+121+60 PostgreSQL WASM assertions; frontend build/check57files882551bytes; Vercel gateway build/check18allowlistedfiles. Scoped reviewer findings fixed, including retry initialization/raw byte cap/cancellation and password Enter/logout/navigation cleanup. Test harness updated to assert sensitive inputs clear before workspace DOM replacement.

Vercel gateway requires `NODEJS_HELPERS=0` at build and runtime, `VERCEL_ENV=preview`, exact HTTPS CORS origin and verified restricted role. Encrypted operator credential remains absent; no runtime LOGIN/DB TLS/provisioning/write activation has run. Hosting login/deployment/actual HTTPS app are now verified as above; Gym/Nutrition/Journal/photo two-device sync, conflicts/offline/full cloud recovery acceptance remain NOT VERIFIED. Existing source local-only config/schema8/backup formats preserved. No8765 interaction/personal data/GitHub push.

## Historical scope and baseline

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

## Actual hosted SELECT preflight —14/10/2026

User approved SELECT-only preview inspection and completed normal Dashboard login. Verified exact project URL/ref/Tracker/Singapore, then executed queries through actual SQL Editor UI. PostgreSQL17.11/postgres, CREATEROLE true, six creation/Auth/reference/Storage privileges true; managed owners/no-admin-membership and Storage RLS verified. Tracker catalog/roles empty. Supautils session preload plus registered policy_grants GUC explicitly delegates postgres/storage.objects; no DDL probe. Default ACL six rows limited to public/storage, no global row. Exact preview bucket absent. Detailed result table, SQL Editor URL and local screenshot evidence in `SUPABASE_PREFLIGHT_READONLY_REPORT.md`.

Read-only capability preflight PASS;001/002 can be submitted for separate approved install. Full001→002→003 still blocked by absent private bucket and unapproved003 CHECK replacement. Actual CREATE ROLE/ALTER FUNCTION OWNER/CREATE POLICY, native DB TLS and hosted A/B isolation NOT VERIFIED. No config/role/policy/bucket/data writes, deploy/upload/push or8765 interaction. Documentation-only follow-up; no app/test/SQL source changes and no new regression/syntax claims. Historical771/148/SQL45+121+60 evidence above remains unchanged.
