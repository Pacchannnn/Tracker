# Tracker — execution status

## Direct website correction —15/10/2026

User explicitly requires typing a domain to open the website, rejecting the protected-preview/Windows-launcher delivery. Stable public app address is now **https://tracker-ppap7.vercel.app/**. This latest request authorizes public access to the app shell for this domain; personal records/credentials/private bucket remain protected and no personal data is uploaded. Existing Vercel project/deployment protection stays enabled; only the named alias has an alias-protection-override exception through the official API. No project-wide authentication removal or production promotion.

New Preview deployment `dpl_69mUp4zVUXCQb6Zd1zp1rFP1itK4` (`tracker-preview-kk6xacejf-ppap7.vercel.app`) is assigned to that stable alias. Build public gateway origin and server exact CORS origin both use the stable HTTPS domain, avoiding calls back to a protected generated URL. Source public config remains disabled locally; database credentials remain server-only; existing A/B synthetic write restriction and Supabase Auth/RLS remain. README and optional Windows credential helper now use the stable domain; the helper is not required to open/use local browser mode.

Opened stable domain directly in browser, Tracker home visibly loaded; anonymous HTTP request without cookies returned200 without redirect. These are delivery observations for the reported access issue, not another functional/regression QA run. No new tests, logging fixtures, photo upload, schema changes, data migration/reset, GitHub push or origin8765 interaction. New-origin device enrollment and two-device/record/photo transfer acceptance remain unverified. Previously saved data on other origins is not silently moved.

## Handoff —15/10/2026

User refuses creating another account and requests closure without further tests. Existing preview A/B accounts are reused; no signup/personal account created. `MO_TRACKER.cmd` opens `scripts/open-tracker.ps1`: private Windows-only credential card reads existing DPAPI accountA credentials, masks password and offers user-triggered copy/open buttons. No credential is committed or embedded in public frontend. README now leads with the latest preview URL and simple login steps; old Batch2/current wording corrected to historical. Local origin8765 remains the existing private-data location and is not accessed or modified.

This hands over the existing local app and configured synthetic preview. It does not turn omitted cross-device/photo/recovery acceptance into PASS or authorize personal uploads. Vercel protection remains enabled; no production release, new account, migration, reset, push or extra tests. This final convenience launcher was not executed as a test under the user's no-test instruction.

## Current execution —14/10/2026

### Latest instruction: deploy without further tests

User explicitly stopped additional checks/tests and requested immediate completion. No new regression, syntax, HTTP health, cross-device, conflict, photo or recovery acceptance tests are run after this instruction. Earlier817/158/SQL results below are historical and do not cover the new CA change.

Operator credential is now saved with Windows DPAPI outside OneDrive. The local collection callback issue was fixed by explicitly loading the Windows PowerShell security module. Actual native operator/runtime connection completed with Dashboard-supplied Supabase CA, verified TLS and restricted `tracker_preview_runtime`; LOGIN provisioned, push/photo_prepare EXECUTE available. No bypass-RLS/admin credential is hosted.

Server-only CA support added to gateway: verified sslmode required first, bounded valid CA PEM supplied as explicit pg SSL configuration with rejectUnauthorized:true and default hostname verification. DATABASE_URL is stored as a Vercel preview Secret; CA and exact project/A-B synthetic allowlist stored in preview configuration; synthetic writes enabled only for those two UIDs. Frontend receives only public URL/publishable key.

Latest Preview deployed: `https://tracker-preview-fe3lsoph4-ppap7.vercel.app/`, deployment `dpl_whuL1hX7LnNc9sGGSVjUCv21BNF7`. This is deployment completion, not a claim of new acceptance PASS. Packaging/build retained the existing mandatory allowlist/privacy validation; no standalone QA suite was run. A/B preview accounts activated using existing transactional restricted-role provisioning; actual new-origin device `fe2f984e-972f-4824-b68e-7c25a7dfdd87` obtained from visible setup UI and registered for both. Prior known origin device retained; no removal/reset. A/B login/workspace opening performed only to obtain registration metadata, no fixture logging or manual sync/health/backup tests. Two-device Gym/Nutrition/Journal/photo sync and full recovery remain unverified at the user's instruction; private data/origin8765/GitHub/production unchanged.

During the final setup handoff, the app's normal automatic synchronization changed B's empty workspace to **Đã đồng bộ**, outbox0/photos0. This is an observed live connection/empty-workspace synchronization result, not a deliberately executed data-transfer acceptance test. Screenshot `preview-connected-setup.png`; no new records/photos were created. Positive Gym/Nutrition/Journal/photo transfer remains unverified.

The user has explicitly approved the whole non-destructive PREVIEW deployment and synthetic acceptance workflow for `wwcfzotkxpqtelfvvhpd`, including the exact CHECK-constraint replacement in003. This supersedes the approval-pending historical entries below. No further A–D approval is needed. Production, fees, personal data upload, destructive reset and GitHub push remain outside scope.

**Actually completed on hosted Supabase:** wrapped001+002 transaction; Dashboard private `tracker-preview-photos` bucket (JPEG,20971520-byte limit); wrapped003 private database transaction; exact seven Storage policies in a separate transaction. Do not rerun these install packets. Actual catalog postcheck: eight private tables all ENABLE/FORCE RLS; no unsafe role flags; runtime not an owner member; helper UID bridge allowed only to helper; browser/anon/runtime bridge access denied; private schema unavailable to authenticated Data API.

**Actual Auth/security checks:** synthetic confirmed A/B accounts created; both password logins and independent `/auth/v1/user` verification PASS; invalid JWT403. Actual Storage unprepared INSERT denied403 for each account, visible objects0, private schema API denied406/PGRST106. Public signup was switched OFF and saved; anonymous login/manual linking remain OFF, confirm email ON. Email OTP length changed from8 to the requested6 digits and saved; delivery/SMTP not tested. These checks do not prove successful cross-device sync or cross-account object isolation after a valid upload.

**Current access blocker:** the encrypted operator database password is still not available. Runtime remains NOLOGIN; gateway TLS/role connection and provisioning not executed. The user replied “Ok”; this did not create the credential file. Need the existing DB password through the already opened secure local input; no credentials/OTP in chat. No service_role fallback.

**Actual HTTPS deployment:** Vercel CLI login verified; PPAP workspace plan Hobby; project `tracker-preview` created. Protected Preview URL: `https://tracker-preview-4hcfateuc-ppap7.vercel.app/`. Dashboard verifies Environment Preview/Ready, Vercel Authentication ON, analytics/speed insights OFF. Uploaded58files = reviewed57 public runtime + minimal deployment configuration, no repository/private files. Source cloud config remains disabled; this is a real HTTPS local-first app, not yet a connected sync app. Six main views loaded on1280px desktop, console errors/warnings0. Two synthetic Gym sets20kg×8/RIR3 and22.5kg×9/RIR3 completed, survived reload and appeared with distinct IDs in a downloaded schema8 JSON backup (1session/2sets,5679bytes,sha256 `0215884cf33e7134a8966ef01b4f10c69e68f8e2f1d1a4e74d21d883a90d8392`). No Supabase sync claimed. Requested320px override measured1280px, so mobile NOT VERIFIED; override reset.

**Hosting deviation corrected:** Vercel automatically assigned its first new-project deployment target production despite explicit preview CLI flag. Its default public alias `tracker-preview-eta.vercel.app` was removed immediately and verified404; unique initial deployment requires authentication (anonymous302). No cloud config/data existed in that artifact. Subsequent deployment is verified Preview; no production promotion/push or existing production application changed. Keep the first deployment unaliased, do not reuse it for cloud. The API represents Preview with target:null; Dashboard/CLI environment, not an equality-to-string check, is the authoritative confirmation here.

**Latest protected combined Preview:** `https://tracker-preview-5jdrv7imh-ppap7.vercel.app/`, deployment `dpl_tsv1xySopXpijMNMkqX4ihkhA5Er`, READY/Preview, productionUrl:null. Uploaded77 reviewed files/1047659bytes;57 public runtime files plus exact backend/build graph. Preview-only public configuration is injected during build; private credentials are not included. Vercel Authentication remains ON; gateway uses browser-managed cookies only for exact same-origin requests; Supabase Auth/Storage remain credentials:omit.

**Live bug fixed:** Vercel tracing omitted query-versioned ESM dependency `js/custom-workout.js`, causing FUNCTION_INVOCATION_FAILED500. Exact173-character includeFiles brace expansion now retains only14 approved backend modules. Isolated Lambda test reproduces the omission and proves corrected import/invocation; actual protected HTTPS health request now returns503 with only `{status:"error",code:"gateway_unavailable"}` because DATABASE_URL is absent. This proves deployment/module loading, not a working DB gateway. The official authenticated Vercel CLI generated its protection-bypass token for operator curl verification; it is not in source/public config/artifact. Application browser protection remains enabled.

**Actual latest browser evidence:** A and B password login succeeded on this HTTPS origin. A synthetic food was saved in its local account workspace with1pending operation; switching to B required pending-data confirmation, sealed A and showed an empty B food library/0pending operations. Return-to-A login experienced one authentication timeout; retry succeeded, reopened A retained the exact synthetic food and1pending operation. A→B→A local cache isolation/retention PASS; server-side sync isolation remains NOT VERIFIED. Native provider A/B login/user verification and Storage denial checks were rerun successfully. Sync remains unavailable; no positive cloud ACK or cross-device/photo sync claimed. Private routes `/cloud/vercel.js`, `/package.json`, `/MASTER_PLAN.md`, `/.env`, `/scripts/vercel-preview-build.js` actually return404.

**Local progress:** fresh817/817 Node tests,158 JS syntax checks,SQL45+121+60 PostgreSQL WASM assertions, public57files/882646bytes and gateway18/combined77 packaging checks pass. Scoped independent review found no remaining source blocker. Live DB-backed routing/streaming, real sync writes, conflict/retry/recovery and independent-browser acceptance remain NOT VERIFIED. Anonymous schema8/photoDB1 and backup formats unchanged; source cloud config remains local-only. DATABASE_URL is not configured, preview writes OFF, runtime NOLOGIN. No8765 interaction, personal data upload, fee or GitHub push.

Evidence retained in ignored `.local/hosted-execution-2026-10-14/` (catalog/policy/bucket screenshots and token-free `auth-native.json`). Test credentials are DPAPI-encrypted outside OneDrive under LOCALAPPDATA, not committed or in public artifacts.

## Historical SELECT-only status —14/10/2026

User approved real preview SELECT-only preflight and completed Dashboard login. Actual Singapore PostgreSQL17.11/postgres: CREATEROLE and six required creation/Auth/reference/Storage privileges TRUE; Tracker schema/roles absent. Supautils session preload and postgres→storage.objects policy delegation observed; managed ownership/RLS unchanged. **Read-only capability preflight PASS**, no DDL run. Full001→002→003 still **CÒN BLOCKER**: private bucket absent and003 CHECK-constraint exception unapproved.001/002, bucket,003 DB/ACL/bridge/constraint and policies need separate write approvals. Evidence: `SUPABASE_PREFLIGHT_READONLY_REPORT.md`; next actions: `SUPABASE_HOSTED_MIGRATION_RUNBOOK.md`. No app/user data change, deploy, upload, push or8765 interaction. Previous771tests/148syntax are historical, not rerun for this docs-only follow-up.

## Latest local migration review —13/10/2026

Hosted migrations reviewed locally from main `b8c6369`; user's real catalog preflight recorded. **771tests/148syntax/SQL45+121+60/public57/backend16 PASS**. Offline hosted003 now separates private DB from seven unchanged Storage policies, requires Dashboard private bucket and uses a narrow postgres-owned UID bridge without managed Auth grants. Default function ACL and helper-membership leaks guarded; source001/002,portable schema8,backup formats and runtime UI unchanged. README's preceding local-link edit and original untracked audit files preserved.

**Hosted verdict: CÒN BLOCKER.** Actual creation/reference/read privileges and provider policy execution authority need confirmation;003's existing DROP CHECK constraint requires an explicit decision under the no-DROP instruction. No hosted SQL/deploy/upload/push/data changes or8765 access. Next action is read-only evidence, then separate approvals per **SUPABASE_HOSTED_MIGRATION_RUNBOOK.md**. New operator packets supersede old combined hosted photo instructions. All other R1–R16 limitations below remain.

## Historical local implementation status —12/10/2026

Continues main a546334 (669tests/120syntax), same R1–R16 workflow. Contract approved and implemented locally. Fresh **765/765 tests,147 syntax,SQL45+121+60,public57/backend16 artifacts** pass. No hosted apply/deploy/upload/push or8765 access.

| Work | Current state / evidence scope |
|---|---|
| R1 | PARTIAL: approved read-only public settings email enabled/signup not disabled; REST without JWT401; Dashboard sign-in blocks private catalog. OTP/users/SMTP not verified |
| R2–R4 | PARTIAL: local offline001/002/003 packets, restricted/provisioning checks; hosted permissions/LOGIN/TLS/registration need approval |
| R5–R6 | LOCAL DONE:16-file gateway, common verified identity, CORS/rate/cancellation/default-off preview writes. Hosting remains local preparation only |
| R7 | PARTIAL: native harness prepared, no actual native/provider run. Historical Batch2 synthetic acceptance retained |
| R8–R9 | LOCAL DONE: account IDB2/private SQL003/photo protocol2, atomic bytes+intent/CAS/exact receipts/verified download; synthetic browser daily+food image ACK/cross-device bytes/compound delete |
| R10 | LOCAL DONE: full three-file recovery, trusted completeness, validated detached restore/new device and inspection after reload. Actual downloads/byte comparison/paired restore passed; maximum-size Safari unverified |
| R11–R12 | PARTIAL: durable reviewed schema8 supported-record import/queue/receipt resume; actual food import ACK+device2. Old schemas/ambiguous ownership/raw drafts/collisions/photo-linked/raw photo1 remain local. Whole legacy/photo migration acceptance absent |
| R13 | PARTIAL:57-file local-only frontend prepared; hosting/deploy declined for now |
| R14 | PARTIAL: six areas load, errors0/external0/anonymous unchanged on synthetic browser. Latest requested320/360/390 override reported611px, so exact-width gates NOT VERIFIED. Physical iPhone/provider absent |
| R15 | NOT VERIFIED: no SW/PWA; durable queues do not prove offline cold-load |
| R16 | PARTIAL: scoped independent reviews closed findings, fresh regression/privacy/hash evidence. Production/personal data/retention/budget/device gates pending |

Details: TRACKER_PHOTO_RECOVERY_IMPLEMENTATION.md and TRACKER_EXECUTION_VERIFICATION.md. Personal import remains unapproved. Next dependencies: Dashboard catalog access under existing read-only approval; separate Auth/SQL/LOGIN/Storage/provision/hosting/deploy/synthetic-write approvals. No new phase prompt needed. Existing two original audit files preserved untracked.

## Historical status —11/10/2026

One continuous R1–R16 workflow, starting from main549b1a1. The entries below record that earlier checkpoint; the current table above takes precedence.

The user approved local technical implementation and asked to prioritize actual preview Auth + Gym/Nutrition/Journal sync before photos. Two original audit files are preserved. Read-only Supabase preflight and the photo/recovery local contract are now approved. Hosting remains local preparation only. No origin8765 access, real Auth login requests, migration, deployment, writes or uploads are approved.

## Current work (updated after implementation/review)

- Baseline verified:639 tests,112 standalone JS,SQL45/121 and48-file artifact.
- R1 PARTIAL: confirmed public URL/key stored only in ignored `.env.preview.local`; gateway URL/activation absent. Incomplete preview build rejected with unchanged local-only artifact. Actual OTP/test emails/SMTP NOT VERIFIED.
- R2–R4 PARTIAL: offline operator install packet and transactional confirmed-UID/device provisioning implemented.14 PGlite tests, including non-superuser postgres/grantor-specific membership restoration; runtime stays NOLOGIN. Settings exposes read-only actual device identity. Hosted permissions/TLS/LOGIN/provisioning require approval.
- R5 LOCAL DONE / HOSTED NOT VERIFIED:12-file gateway allowlist, imports/privacy/hash checks, exact CORS,120 POST/min/process, disconnect cancellation, redacted errors. Hosting/deployment approval pending.
- R6 LOCAL DONE / ACTIVATION NOT APPROVED: preview-only project/account allowlist, default false and kill switch; no actual writes/upload enabled.
- R7 PARTIAL: native two-session/PID/observed-lock acceptance runner prepared and locally tested; default run reports approval_required and makes no connection. Real SQL/browser sync/conflicts NOT VERIFIED in this workflow; Batch2 synthetic historical acceptance preserved.
- R8–R12 IN PROGRESS / LOCAL CONTRACT APPROVED: `TRACKER_PHOTO_RECOVERY_CONTRACT.md` account IDB2/photo protocol2/private manifests/recovery envelope1/detached restore/import ledger approved for local code/tests. No hosted migration/Storage policy applied; no retention change.
- R13 PARTIAL:48-file local-only frontend artifact passes; public config partially prepared. Hosting/account/delivery/deploy remain pending.
- R14 PARTIAL: new identity UI browser smoke on owned8840; desktop and320/360/390 fit, logout seals ID, empty console errors/warnings. Actual Supabase/iPhone NOT VERIFIED.
- R15 NOT VERIFIED: no SW/PWA; cold-open offline not proven. Retained queues do not prove offline shell.
- R16 PARTIAL: independent code review resolved runtime grant inheritance/ADMIN/SET edge; local regression/artifact/SQL evidence recorded in `TRACKER_EXECUTION_VERIFICATION.md`. Production/personal import/budget/retention/device gates pending.

## Decisions/gates

Approved: read-only preflight, local photo/recovery/import contract implementation. Hosting decision: only local preparation for now. Dashboard sign-in is currently needed to inspect catalog/Auth administration; no password/OTP requested in chat. Pending: hosting/HTTPS URLs/account/delivery; Auth/test accounts/SMTP changes; hosted install/roles/provisioning; actual Auth login; synthetic writes/upload. Public provider values confirmed. Paid costs, personal data, production and GitHub push remain separate.

## Execution approach

Use existing Vanilla JS/domain/sync modules, no rebuild or new dependency. Operator setup and native QA are independent local tasks delegated under the execution-plan workflow; root owns runtime write gating and HTTP protections. Run tests before checkpoints. This file is handoff state, not a new batch or permission to act remotely.
