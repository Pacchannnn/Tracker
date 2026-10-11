# Cloud Batch 3 — preview readiness

11/10/2026. Scope approved: build-time public configuration, hosted gateway preparation, hosted SQL review and beginner setup guide. No provider writes, migration, role creation, deployment or personal upload.

## Design / implementation plan

1. Test then extend existing packager: explicitly named public environment variables; complete preview config only; deterministic generated module; source stays disabled; output integrity uses generated expected bytes. No new runtime assets/dependencies.
2. Test then prepare existing Node server for hosting TLS termination: optional exact HTTPS frontend origin, host/PORT configuration, health endpoint, same Auth verification/restricted DB checks. Writes remain hard-disabled.
3. Review001/002 against hosted docs; retain migrations unless evidence demands change. Record role ownership and pooler gates, never bypass RLS.
4. Document Dashboard OTP/test accounts/SMTP, Render preview proposal and approval boundaries.
5. Run full Node/syntax/SQL regression and public artifact security/integrity checks. Stop with exact operator actions.

Local-only and preview builds are distinct; no credentials or user data provided. Source origin8765 remains untouched. User preference: single main, one integrated batch; no worktree/extra phase needed for this scoped change.

## Implemented and verified

Baseline a9d1a78 plus the previous untracked setup checklist; fresh634/634 baseline tests. No Batch3 reports existed before this work.

- Packager accepts five TRACKER_PUBLIC_* variables documented in setup guide; only complete preview config. No variables yields exact existing disabled source bytes. Invalid/partial/secret/production config fails before replacing output; values are redacted.
- Generated config replaces only expected artifact bytes, participates in hash checks and narrowly reviewed URL allowance. Secret scan still runs; all other module/network/allowlist restrictions remain. Source config remains empty/disabled;48 assets unchanged. check/inventory need same env as build.
- Node server exact HTTPS allowed-origin validation,hosting PORT/bind,liveness health. Managed hosting terminates HTTPS; local default loopback,CORS denied. Same authoritative fixed-project `/auth/v1/user` JWT verification,parameterized SQL,restricted DB role and verify-full TLS. Writes fixedfalse,not configurable. No third-party dependency added.
- Hosted review identifies ALTER OWNER/SET ROLE membership gate,shared-pooler custom username and verified TLS/CA.001/002 unchanged. Read-only preflight is operator aid,not migration or proof of all effective rights; ran before/after001+002 on disposable PostgreSQL WASM with6forcedRLS tables.
- Beginner setup guide covers public env file/build,OTP6digits,A/Bconfirmed users,SMTP team-only2emails/hour default,Dashboard approvals,role/provisioning and hosting options. Render Free proposed,not selected/deployed. Sleep/cold-start15sec timeout incompatibility and paid/egress/SMTP cost risks recorded.

## Fresh local evidence

| Gate | Result |
| --- | --- |
| New behavior RED before code | 4 expected failures for env packaging and hosting/CORS/health |
| Focused final packaging/HTTP |25/25 PASS; backend-only secret sentinel excluded,config tamper rejected |
| Full regression |639/639 PASS,0fail/skip/cancel |
| Standalone JS syntax |112/112 PASS |
| Batch1 SQL / RLS |45 assertions PASS |
| Batch2 SQL / RLS001+002 / isolatedIDB |121 assertions PASS |
| Read-only preflight |PASS before/after001+002 on disposable PGlite; not hosted |
| Synthetic preview artifact |48files/766302bytes,graph/privacy/hash PASS;actual generated config constructs Auth adapter,no network called |
| Final local-only artifact |48files/766401bytes,graph/privacy/hash PASS;source config bytes preserved |
| Independent review |No actionable findings;reviewer25/25 focused tests PASS |
| Protected files |MASTER_PLAN,001/002,source cloud-config,dependencies/locks unchanged |

Evidence ignored under `.local/batch3-*`; public asset inventory `.local/batch3-artifact-inventory.json`. Synthetic public URLs/keys are test fixtures,not real credentials. Final dist restored to local-only. No browser QA performed this batch; existing Batch2 browser evidence retained,not claimed as new hosted verification.

## Remaining gates / handoff

Hosted SQL permissions,custom LOGIN role/pooler/TLS certificate,SMTP delivery/OTP refresh/revocation,managed HTTPS/CORS,rate limiting,cold start,native multi-connection and physical devices all NOT VERIFIED. Server health is liveness only and gateway credential can authorize across scoped accounts;secure storage/provisioning is required. No automatic Auth account/device registration or personal import added.

Current status: LOCAL READINESS PASS;REMOTE ACCEPTANCE NOT VERIFIED. Git checkpoint recorded in Git log. Next operator actions/approval boundaries are in CLOUD_BATCH3_SETUP_GUIDE.md sections A–F. STOP: no remote migrations/roles/deploy/writes/data upload/GitHub push. Schema8/photoDB1/backup8+1 unchanged.
