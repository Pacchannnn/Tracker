# Tracker — Cloud Batch1 implementation

08/10/2026 · IMPLEMENTED / TESTED LOCAL ONLY; STOP after Batch1.

## Baseline and approved scope

Baseline main340c2fb clean; fresh475/475 tests and80/80 syntax verified.
Local schema8/photoDB1/backup8+1 remains independent of cloud database migrations.
Approved batch covers Auth adapter/UI, private PostgreSQL model/RLS and trusted
transactional gateway; no browser outbox/sync, cloud photos or real-data writes.

## Design / execution plan

Existing Vanilla paper UI retained. Auth defaults disabled until reviewed public
project configuration is supplied; session/refresh credentials stay memory-only,
outside portable data. Fixed-project Supabase Auth user lookup verifies identity;
no frontend UID assertion authorizes server data. Account editing remains disabled.

Private tracker_sync functions run under least-privilege nonlogin owner with
fixed empty search_path, forced RLS and scoped UID; backend login has EXECUTE only.
Account-head locking, CAS, receipts, whole operation version groups and immutable
as-of-H versions preserve ordering/atomicity/history. Initial no-GC foundation.

Gateway validates protocol and entire proposed schema8 projection using current
validators, captures latest head/readset, then SQL checks it again under lock.
Client cannot provide a trusted UID, validation proof or cloud success marker.
Nonempty operation dependencies/photo commands fail closed until approved later.
Mutation route is disabled by default; no browser cloud data writer is connected.

- [x] 1. Fresh baseline; review9A/9B1/9B2A/model/source. Official Auth/PG research.
- [x] 2. Auth/UI TDD: OTP REST contract, identity/lifecycle/epoch/pending/privacy.
- [x] 3. SQL/RLS migrations + executable negative tests. Real local PG engine.
- [x] 4. Gateway TDD: schema/domain validation, auth, parameterized private calls,
  receipts/CAS/lost-ack/pull/bootstrap; real SQL integration, no real records.
- [x] 5. Package new reviewed frontend modules only; mock/backend/assets privacy;
  disposable browser QA, full regressions/syntax/build/diff; five reports/roadmap.
- [x] 6. Local checkpoint (Git log), accurately separate local evidence from provider tests.
  STOP after Batch1; no push/deploy/Batch2.

## Dependencies

Frontend: native fetch/timers/AbortController only. Separate cloud/package.json:
pg8.23.1 production connection driver; PGlite0.5.8 dev PostgreSQL/WASM runner.
Native PostgreSQL/Docker/WSL absent; WASM real SQL supports local migration/RLS
verification without provisioning. Single-connection results cannot prove native
multiconnection locks/production runtime. All backend dependencies excluded dist.

References: [parameterized queries](https://node-postgres.com/features/queries),
[PGlite docs](https://pglite.dev/docs/),
[Supabase OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Files and implementation

Created public runtime `js/cloud-auth.js`, `js/cloud-auth-ui.js`,
`js/cloud-config.js`; existing `js/app.js` integrates a Settings panel and pending
source fingerprint without changing persistence. Disabled config means no remote
Auth calls by the normal app. Local editing stays available; account editing is
disabled. Signed-in sessions still use the original anonymous local workspace.

Created private `cloud/gateway.js`, `cloud/server.js`,
`cloud/migrations/001_foundation.sql`, `cloud/package.json`,
`cloud/package-lock.json`, `cloud/tests/run-db.js`,
`cloud/tests/rls.integration.sql`, `cloud/tests/auth-browser.html`.
Server entry point is loopback/read-only, not a Vercel function. Missing server
config exits1 safely; no project credentials were configured.

Created five new Node test files: cloud-auth, cloud-auth-ui, cloud-gateway,
cloud-http, cloud-sql. Updated existing packager/static-package test with an exact
42-file count and extra Auth/backend privacy assertions; no original test removed.
Created the five CLOUD_BATCH1 reports; updated V4 roadmap/implementation report
and README with local commands; .gitignore excludes future env files. No Original plan, data/model/schema/photo/backup
implementation, root dependencies, CSS, HTML entry point or Vercel config changed.

## Verified results and acceptance gates

| Gate | Result |
| --- | --- |
| Baseline |475/475,80/80; clean340c2fb before changes |
| Full Node regression |522/522;0 fail/skip/cancel/todo; original475 retained |
| Syntax |91/91 standalone JS + inline Auth harness module PASS |
| Real local SQL |Migration + executable RLS/transaction negative integration PASS;45 gateway assertions on real PostgreSQL WASM |
| Browser |8830 six-area smoke, set save/reload/history,2450 setting;8831 fake-transport Auth A/B/pending/expiry/error/local-only/reload; both console captures empty |
| Mobile/keyboard |Actual320/360/390 Settings/Gym/Nutrition widths, no horizontal overflow; Tab focus checks PASS |
| Anonymous preservation |Downloaded JSON exact data equality across read-only navigation; Auth guarded-storage/backup tests PASS; no8765 access |
| Backups |Schema8 preserved; actual0-photo backup download/parse; nonempty photo restore not repeated |
| Artifact |42 approved files,684170 bytes; graph/privacy/hash checks PASS;42 HTTPasset hashes match;8 excluded private/backend/mock paths404 |
| Mutation boundary |CLI writes disabled, no frontend data upload path; no real-data cloud writes |
| Provider/deploy |NOT VERIFIED / not performed; no Supabase/Vercel project, cloud data/OTP delivery, GitHub push |

**LOCAL PASS** within this table's scope. **REAL SUPABASE PASS is not claimed.**
Native multiple connections, real-device Safari/iPhone, deployed TLS/pooler/CORS,
actual OTP delivery/rotation/revocation and large-history performance remain open.
No complete browser network trace is claimed. No retention/GC/import orchestrator
or durable account workspace/outbox implemented. Current head guard intentionally
rejects unrelated concurrent writes; no automatic merge/rebase.

## Runtime artifact inventory

Original39 public paths retained; three additions only:
`js/cloud-auth.js`, `js/cloud-auth-ui.js`, `js/cloud-config.js`.
Exact reviewed allowlist lives in scripts/static-package.js; reproduce every
path/byte count/SHA256 with `node scripts/static-package.js --inventory`.
42 paths comprise index.html, css/style.css, two font/license files and38 JS
modules. Backend SQL/driver/test harness/reports/secrets stay outside dist.
Secret patterns, symlink/hard-link restrictions, import reachability, remote assets
and unexpected files remain rejected. One exact native Auth fetch entry is
reviewed; no broad network exemption. Provider activation still fails packaging.

## Next decision / STOP

Approve a synthetic Supabase project (owner/region/environment/accounts/email/
secret management/cost limits) before provider checks; follow SETUP_GUIDE.
Batch2 needs its own approved persistence/outbox/import/conflict scope. Photo
cloud migration and production deployment are separate future decisions.
No further architecture change or synchronization work begins in Batch1.
