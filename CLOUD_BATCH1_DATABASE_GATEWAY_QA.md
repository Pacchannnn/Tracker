# Tracker — Cloud Batch 1: database / gateway QA

08/10/2026 · LOCAL PostgreSQL/WASM PASS; native/provider NOT VERIFIED.

## Engine and reproducible commands

Node24.19.0. Native PostgreSQL, Docker and usable WSL unavailable. PGlite0.5.8
executes real PostgreSQL compiled to WASM in a fresh in-memory database; this is
not mocked RLS. It supports a single exclusive connection, so it cannot prove
multi-connection lock scheduling or Supabase production behavior.
[PGlite documentation](https://pglite.dev/docs/).

```powershell
cd "C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym"
npm --prefix cloud ci --ignore-scripts --no-audit --no-fund
npm --prefix cloud run test:db
npm test
npm run build
npm run check:artifact
git diff --check
```

`cloud/tests/run-db.js` creates synthetic auth.users and browser roles, applies
the real migration, runs `rls.integration.sql`, then exercises the actual gateway
and parameterized SQL store against the same real engine. SQL test fixture
transaction rolls back; the entire in-memory database is closed afterward.
No stored user data or provider connection is read.

## Evidence matrix

| Gate | Local evidence | Provider/native |
| --- | --- | --- |
| Migration/role grants/FORCE RLS/fixed search_path | Real SQL migration+negative SQL integration script PASS | NOT VERIFIED |
| A/B UID and project/environment isolation | Real scoped records/receipt reads; cross-tenant owner-policy and browser-role denial checks PASS | NOT VERIFIED |
| Browser direct table/helper writes denied | Actual SET ROLE anon/authenticated/service_role/gateway privilege tests and spoof-GUC denial PASS | NOT VERIFIED |
| Atomic multiple changes and rollback | Failed second CAS leaves first record/version/head unchanged in real SQL | NOT VERIFIED |
| Idempotency / lost ACK / reused ID | Exact receipt replay; fingerprint mismatch rejected; domain rejection/conflict receipts persist | NOT VERIFIED |
| Revision competition | Stale base rejected, plus head/readSet changes rejected independently in SQL | True overlapping connections NOT VERIFIED |
| Tombstone/feed/order | Resurrection denied; one whole group per operation; bigint strings; source/nested array order preserved | NOT VERIFIED |
| Consistent bootstrap | Fixed as-of-H versions survive a commit between pages; keyset paging | NOT VERIFIED |
| Workouts / history | Live completion; generic history edit denied; candidate/source exact-baseline compound correction; invalid nested identity rejected | NOT VERIFIED |
| Domain preservation | Representative schema8 fixtures imported across all implemented kinds;11 top-level arrays and every nested payload roundtrip equal | NOT VERIFIED |
| Settings/plan/journal dependencies | Active-plan clear compound; missing-plan conflict; duplicate journal date rollback | NOT VERIFIED |
| Auth gateway | Fixed-project authoritative user request, wrong issuer/expired/missing token/UID mismatch tests use controlled transport | Real Supabase NOT VERIFIED |
| HTTP | Route/JSON/origin/no-store/size limits;413 before chunked EOF; unsafe DB role refuses startup | Deployed runtime NOT VERIFIED |

Fresh executable runner: SQL integration script PASS + **45 gateway assertions**
backed by actual PostgreSQL/WASM (including service_role BYPASSRLS denial through
missing private grants). Supplementary two Node SQL text/catalog-file
tests are not counted as evidence of real SQL execution.
Full Node suite **522/522**, no failures/skips/cancellations/todos; all475 original
test cases retained. Syntax **91/91** standalone JS files plus inline harness
module checked separately. Baseline80/80 JS also checked from commit340c2fb.

## Contract and limitations

Protocol1 uses `{commandType,operationId,deviceId,dependencies:[],changes}`.
Changes carry kind, recordId, action, baseRevision, payloadSchema8, payload and
workout phase where needed. Client identity/trusted validation fields rejected.
Server derives canonical fingerprint, proposed schema8 projection, read set and
head. SQL rechecks under account lock, allocates head without `nextval()`, then
atomically writes current records + immutable versions + terminal receipt.
[Sequence semantics](https://www.postgresql.org/docs/current/functions-sequence.html).

Six private tables: accounts/devices/records/versions/operations/migration ledger.
Ledger schema is a foundation only; no live import orchestration/ledger mutation
endpoint. Device planning/history candidates stay distinct from shared accepted
workouts. Photo blobs/metadata synchronization is unsupported. Read endpoints
bootstrap/pull/receipt exist; no browser account projection/outbox worker.

The Node loopback server is intentionally read-only and not deployment-ready.
Production credential/pooler/TLS, real role installation, rate limits, independent
sessions, transaction contention/retry/backoff, large datasets and provider restore
remain open gates. Current full-projection validation and read locking are
conservative; large-history performance and no-GC retention need Batch2 review.
Never treat WASM serial execution as proof of native concurrent commit order.
