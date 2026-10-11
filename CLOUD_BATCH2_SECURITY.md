# Tracker — Cloud Batch 2: final browser security boundaries

11/10/2026 · **LOCAL SYNTHETIC ACCEPTANCE PASS; real provider/production NOT VERIFIED.**
Acceptance baseline d633f17 clean main632/112/SQL45+121/48files verified. Final
634tests/112syntax/45+121SQL assertions;48-file/766401-byte public artifact passes
privacy/graph/hash validation. All48 HTTPasset hashes match;9 private/backend/
test/fixture paths404. No public secrets or added runtime dependencies.

Actual browser isolation checked A→B→A,logout with pending1,reload/cache with sync
disabled until matching reauth,expiry during held gateway response and stale A
response after B opened. B showed no A foods/history; stored A candidate remained.
All four disposable URLs and listener process ownership were verified. User tab
8765 was not bound/accessed. Only synthetic inputs/files were used.

The only runtime repair makes unavailable outbox counts null/unknown instead of0,
preventing a false empty-queue claim after sealing. Two regressions were RED then
GREEN; expiry was rerun through actual UI. Sealing still clears payload access
while retaining its IndexedDB row. Schema8/photoDB1/backup8+1/RLS/Auth unchanged.

Paired backup/restore used unmodified packaged app on8844 and fresh8846. Full
account rows and anonymous JSON stayed exact during8 read-only account views;
anonymous JSON/planning/photo bytes stayed exact through48 responsive view cases.
Account export is explicitly projection-only; tokens/outbox are excluded and it
must not be treated as a full workspace recovery archive. Photos remain local.

Test-only controls reset ONLY marker-bearing caches whose complete scope list is
preview/syntheticqa/known synthetic UIDs. Unknown scope or missing marker aborts
the transaction. Installation metadata and anonymous data/photos are not reset.
Held response/short-session/evidence controls and restore origin8846 are test
instrumentation outside dist,not new production endpoints or Auth bypasses.

Captured browser error/warn lists were empty;fixture external/errors0. Synthetic
Auth and single-connection SQL do not prove real OTP/JWT/TLS/CORS/pooler,provider
RLS deployment,native concurrent connections or iPhone/Safari. No provider,
personal import,cloud photo transfer,Batch3,production deployment or push occurred.
Existing cache encryption/retention/backup limits below remain active. STOP Batch2.

---

# Historical: security and data boundaries (10/10/2026)

10/10/2026 · Local implementation evidence. Real provider/deployment gates remain closed.

## Baseline and verified evidence

Baseline: checkpoint `1487cf3`, 522 tests, 91 JavaScript syntax checks, portable
schema 8, photo DB 1, JSON backup 8 and photo backup 1. No Auth SDK was introduced or
upgraded; the existing REST Auth adapter remains the provider boundary.

| Evidence actually run | Result | What it proves |
| --- | --- | --- |
| `node cloud/tests/run-db.js` | 45 gateway assertions PASS plus original SQL/RLS script | Batch 1 SQL/gateway behavior still works against migration 001 |
| `node cloud/tests/run-sync-db.js` | 121 assertions PASS; original SQL/RLS script also PASS after 001 + 002 | Actual PostgreSQL WASM, restricted gateway role, two independent fake-indexeddb factories, bidirectional sync and recovery |
| Gateway/store/records/engine focused Node tests | 57/57 PASS at the integration checkpoint | Durable mutation, response validation, identity leases and conflict guards |
| Final full regression/syntax/artifact | 632/632 tests, 112/112 syntax, 48 public files / 766,240 bytes PASS | Automated regression and packaging evidence; browser QA remains partial, as detailed in the implementation and QA reports |

PGlite executes PostgreSQL SQL/RLS, rather than mocking policy outcomes. It uses
one connection. These results do **not** verify native concurrent connections,
Supabase Auth/RLS/SMTP, internet TLS/CORS, provider rate limits, Safari or iPhone.
The browser fixture substitutes Auth responses; its gateway does execute real
local PostgreSQL through HTTP. This is not a production penetration test.

## Identity and remote authorization

The normal frontend configuration stays disabled: `enabled:false`, empty project,
public key and gateway URL. The packager retains the activation review gate.
Normal gateway startup still disables writes and enables no browser CORS origin.
Synthetic writers are explicit test-only constructions outside `dist`.

The production-capable identity verifier uses a fixed reviewed HTTPS Supabase
project. Decoded JWT issuer/audience/expiry/subject are early rejection checks,
not signature verification. The fixed project's authoritative `/auth/v1/user`
lookup must then confirm matching UID, authenticated role/audience, confirmed
email and non-anonymous identity. A client cannot submit its own trusted UID,
environment, project, validation head or read set. Lookup failure denies access.
See the retained [Batch 1 authorization review](CLOUD_BATCH1_SECURITY_RLS.md).

Auth tokens remain in memory closures; no token is written to localStorage,
IndexedDB, portable backup, URL or application logs. Account rows are selected by
`environment + projectId + UID`, never by email. Installation device UUIDs
coordinate drafts and retries; they are not credentials or proof of account access.

## Local workspace and lifecycle

`tracker-sync` IndexedDB v1 contains installation metadata and separate workspace
rows. Each row atomically holds schema 8 projection, acknowledged shadow, outbox,
conflicts, receipts, bootstrap staging and cursor. Schema8 and anonymous
`vshape-tracker` localStorage remain independent; photo DB 1 is not migrated.

- One readwrite transaction validates and persists projection plus outbox.
  Failed validation, a throwing mutation or simulated quota failure preserves
  the previous row. A local Saved result does not imply remote acknowledgement.
- Monotonic `localRevision` detects stale tab writes. Serialized latest-row writes
  retain independent edits. Network callbacks and mutations must pass current
  workspace epoch/lease guards; sealing aborts active transactions and closes
  the connection. A new store instance can reopen retained rows.
- Account switch, logout, expiry or invalid identity cancels applicable work and
  seals account access. Pending/unsaved transitions require explicit review.
  Queue operations are never retargeted to a different scope.
- Existing cached rows may be opened explicitly for offline device access.
  The UI reports Needs login; remote sync requires matching verified Auth again.
  Opening a cached row does not authenticate the user with Supabase.
- IndexedDB and backups are **not encrypted by this application**. Anyone with
  access to the browser profile/device may inspect local cached data. Sealing is
  a lifecycle guard, not encryption or protection against a compromised device.
  Server RLS does not protect plaintext already stored in the browser.

## SQL and gateway protection

Apply migration 001 then mandatory additive migration 002. Migration002 supplies
`recordCount` for every complete pull group and fixed `snapshotRecordCount` on
every bootstrap page. Counts prevent publishing truncated pages/groups as complete.
Pull results are bounded by their captured account head. No schema 8 payload,
backup format, table contents or photo format is migrated by002.

`tracker_sync` remains private and must not be exposed through PostgREST.
Functions retain `SECURITY DEFINER`, empty search path, explicit tenant filters,
NOLOGIN/NOBYPASSRLS helper ownership and least-privilege grants. All six tables
retain enabled and FORCE RLS. The browser receives neither table DML nor private
helper EXECUTE. The backend uses bound SQL values and a restricted server-only
gateway login; startup rejects privileged roles/helper-owner membership and
requires explicit certificate-verified database TLS.

The gateway is trusted to supply verified UID. Its credential compromise remains
a cross-account risk; RLS is not end-to-end encryption against an administrator.
Provider pooler/custom-role compatibility remains unverified.

## Mutation, acknowledgement and history integrity

- Operation UUID and semantic fingerprint identify an immutable request. Retry
  preserves the request/ID; receipt replay cannot repeat accepted writes.
  Local predecessor dependencies never become unsupported wire dependencies.
- Account-head locking, per-record CAS, read set and validation head protect one
  transactional commit of records, versions and receipt. The conservative full
  head guard can conflict on unrelated concurrent changes; no silent rebasing.
- Pull applies complete commit groups with cursor in one local transaction.
  Fixed-H bootstrap stages all pages durably and publishes only exact final
  cardinality. Malformed/partial responses do not advance accepted cursor/state.
- Conflicts preserve base/local/remote and dependent intents. Review requires a
  current token; remote changes or new descendants invalidate stale approval.
  A local reproposal receives a new operation ID and reviewed current revisions.
  Tombstoned keys cannot be resurrected by an old edit.
- Live workouts, completed history and device history candidates are separate.
  Remote live records are not automatically selected into a device's editor.
  Correction consumes candidate and updates source atomically, checking both
  revisions and source baseline. Only exact reviewed content or the existing
  Complete transformation—one structure revision plus valid audit timestamp—is
  allowed. Arbitrary content/revision/timestamp changes are rejected.
- Builder Start and planning draft clear form one supported planning command.
  Planning envelopes remain per device. JSONB object order is repaired only for
  planner preferences whose values exactly match the immutable requestKey;
  values, arrays, IDs and key itself are unchanged. Malformed/mismatched keys fail.
- Food/recipe changes do not recalculate frozen historical meal snapshots.
  Valid ambiguous legacy history stays raw; mapping does not invent ownership.
  Existing edit/command boundaries retain their safety checks.

## Privacy and unimplemented boundaries

Anonymous import remains preview/Cancel only; login does not upload or merge
anonymous records. Account photo actions and photo backup/restore are unavailable
in Batch 2; original anonymous images remain in their existing local store.
No analytics, cloud photo endpoint, service worker, provider project, deployment,
real account data upload or Git push is performed by the local harness.

Account JSON export contains only the current schema 8 projection—not tokens,
outbox, conflict archives, receipts or a complete server version history. It is
not a full sync-workspace backup. Retain IndexedDB while recovering pending work.
Do not clear browser storage to resolve sync errors.

Remaining release gates: approved provider setup, real Auth lifecycle and tenant
tests, native multi-connection races, real-device/browser storage eviction and
quota behavior, retention/budget policy, rate limiting and deployed TLS/CORS.
Versions, receipts and tombstones currently have no automatic garbage collection.
No claim of unlimited offline retention, guaranteed browser durability or
production readiness is made.
