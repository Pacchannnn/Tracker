# Tracker — execution status

11/10/2026 · One continuous R1–R16 workflow, starting from main549b1a1.

The user approved local technical implementation and asked to prioritize actual preview Auth + Gym/Nutrition/Journal sync before photos. Two original audit files are preserved. No origin8765 access, real Supabase requests, deployment, writes or uploads are currently approved.

## Current work (updated after implementation/review)

- Baseline verified:639 tests,112 standalone JS,SQL45/121 and48-file artifact.
- R1 PARTIAL: confirmed public URL/key stored only in ignored `.env.preview.local`; gateway URL/activation absent. Incomplete preview build rejected with unchanged local-only artifact. Actual OTP/test emails/SMTP NOT VERIFIED.
- R2–R4 PARTIAL: offline operator install packet and transactional confirmed-UID/device provisioning implemented.14 PGlite tests, including non-superuser postgres/grantor-specific membership restoration; runtime stays NOLOGIN. Settings exposes read-only actual device identity. Hosted permissions/TLS/LOGIN/provisioning require approval.
- R5 LOCAL DONE / HOSTED NOT VERIFIED:12-file gateway allowlist, imports/privacy/hash checks, exact CORS,120 POST/min/process, disconnect cancellation, redacted errors. Hosting/deployment approval pending.
- R6 LOCAL DONE / ACTIVATION NOT APPROVED: preview-only project/account allowlist, default false and kill switch; no actual writes/upload enabled.
- R7 PARTIAL: native two-session/PID/observed-lock acceptance runner prepared and locally tested; default run reports approval_required and makes no connection. Real SQL/browser sync/conflicts NOT VERIFIED in this workflow; Batch2 synthetic historical acceptance preserved.
- R8–R12 DESIGN READY / AWAITING CONTRACT REVIEW: `TRACKER_PHOTO_RECOVERY_CONTRACT.md` proposes account IDB2/photo protocol2/private manifests/recovery envelope1/detached restore/import ledger. No migration/code/retention change for these items yet; approval is explicitly required by the user prompt.
- R13 PARTIAL:48-file local-only frontend artifact passes; public config partially prepared. Hosting/account/delivery/deploy remain pending.
- R14 PARTIAL: new identity UI browser smoke on owned8840; desktop and320/360/390 fit, logout seals ID, empty console errors/warnings. Actual Supabase/iPhone NOT VERIFIED.
- R15 NOT VERIFIED: no SW/PWA; cold-open offline not proven. Retained queues do not prove offline shell.
- R16 PARTIAL: independent code review resolved runtime grant inheritance/ADMIN/SET edge; local regression/artifact/SQL evidence recorded in `TRACKER_EXECUTION_VERIFICATION.md`. Production/personal import/budget/retention/device gates pending.

## Decisions/gates

Pending: hosting/HTTPS URLs/account/delivery; Auth/test accounts/SMTP changes; remote preflight/install/roles/provisioning; actual Auth requests; synthetic writes/upload; photo/recovery/import contract. Public provider values are now supplied and confirmed. See `TRACKER_PREVIEW_EXECUTION_GUIDE.md` for concrete commands/actions/rollback. Async approval questions are pending for read-only preflight, hosting choice and local photo/recovery contract. Time passing is not approval. Paid costs, personal data, production and GitHub push remain separate.

## Execution approach

Use existing Vanilla JS/domain/sync modules, no rebuild or new dependency. Operator setup and native QA are independent local tasks delegated under the execution-plan workflow; root owns runtime write gating and HTTP protections. Run tests before checkpoints. This file is handoff state, not a new batch or permission to act remotely.
