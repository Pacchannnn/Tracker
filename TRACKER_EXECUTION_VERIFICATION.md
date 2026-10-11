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
