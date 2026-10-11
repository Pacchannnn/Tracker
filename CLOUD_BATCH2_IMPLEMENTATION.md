# Tracker — Cloud Batch 2 final browser acceptance

11/10/2026 · **LOCAL SYNTHETIC BROWSER ACCEPTANCE PASS. REAL SUPABASE / PHYSICAL DEVICES NOT VERIFIED.**
STOP after Batch 2. No Batch 3, personal migration, cloud photo transfer, provider
provisioning, deployment or GitHub push. The local QA checkpoint is in Git log.

## Verified acceptance baseline

Clean main `d633f17`, 632/632 tests, 112/112 standalone syntax checks, SQL runners
45/121 assertions, 48-file/766240-byte artifact verified before changes. Read all
six Batch2 reports. Server listener ownership was checked against the exact
`serve-sync-qa.js` / `prepare-sync-browser.js` process command lines. Browser API
reported exact URLs before interacting; the existing user tab8765 was not bound,
read, restored, reset or modified.

## Executed browser gates

| Gate | Result and actual evidence |
| --- | --- |
| Laptop workout after JSONB ACK | PASS: Start A,27.5kg×10/RIR3,ACK,30kg×8/RIR2,Complete; phone pulled identical history |
| Final mobile workout,390px | PASS: B set1 11kg×12/RIR4; durable SQL shadow/outbox0 captured before set2 12kg×11/RIR3 in the same editor; Complete and laptop pull |
| Identity/order/snapshots | PASS: actual downloaded workspace files deep-equal completed sessions; two distinct set IDs per session, preserved slot/exercise IDs, array order and snapshots; both queues0 |
| Keep local / Use server | PASS: explicit reviewed actions; accepted local reproposal and server adoption observed |
| Unresolved conflict reload | PASS: pending1/conflict1 retained, explicit cached opening, blocked sync until matching reauthentication; review restored base/local/remote |
| Remote changes while review open | PASS: old decision rejected with review-changed message; new review required |
| Edit vs delete | PASS: tombstone returned copy-required, local candidate retained and no resurrection |
| Delete vs edit | PASS: base food,local deletion and current server edit shown; explicit server choice preserved edited record |
| Unsupported compound | PASS: live-update/set/Complete chain of3 retained; local choice returned compound-review-required and comparison stayed available |
| A→B→A / logout with pending | PASS: A's pending1 retained; B food/history empty; returning A restored its private pending food |
| Delayed response after switch | PASS: hold actual gateway response for A,logout/open B,release; B stayed empty and A queue retained |
| Expiry during held response | PASS:12-second fixture identity expired while refresh/response held; workspace sealed,queue retained,response release did not unlock |
| Six areas + Weekly/Monthly/My Day | PASS:12 views at measured1280/320/360/390 widths,48 cases; no document/body horizontal overflow; Cloud Settings3 additional mobile cases |
| Keyboard/focus | PASS: Tab traversed cache control,week/calories/protein,Save,backup preparation; visible2.4px solid outline; Enter opened Gym |
| Read-only navigation | PASS: JSON/planning and photo metadata/base64 bytes exact before/after48-view navigation; full scoped IDB rows and anonymous JSON exact across8 account views with sync paused |
| Actual paired backup/restore | PASS: downloaded JSON+one photo,preview/confirmation,restore onto fresh disposable8846,reload,re-export; complete data and photo metadata/bytes deep-equal |
| Account export boundary | PASS: labeled projection-only,actual downloaded JSON equals selected projection and excludes outbox/token/photos; not a full sync-workspace backup |
| Console/runtime | PASS in observed four contexts8840/8841/8844/8846: captured error/warn lists empty; fixture counters external0/errors0/anonymousUnchanged:true |

Inputs above are synthetic QA values, not training recommendations. Laptop/phone
are separate browser origins and installation device IDs, not physical devices.
Auth responses are fixtures; HTTP gateways execute real local PostgreSQL WASM.

## Bug fixed and reproducible evidence

Expiry sealed access correctly but `read()` defaulted an unreadable outbox to0,
so the panel falsely reported an empty queue. It now reports unknown when a row
is unavailable outside local mode and explains that stored data remains. Two
regressions were RED before the fix and GREEN after; browser expiry was repeated
on the corrected artifact. No stored row, migration or backup format changed.
App entry and the two changed workspace modules use v42; other module queries
remain v41, CSSv39. Minimal test-only controls add guarded synthetic cache reset,
held response/release, short session and workspace evidence export. Fresh8846
serves the unmodified artifact for paired restore. These helpers stay out of dist.

Final executed regression: **634/634 tests**, **112/112 standalone syntax** plus
both generated fixture modules, **45/121 SQL assertions**, **48 public files /
766401 bytes**. Build,graph/privacy/exact hashes and all48 packaged HTTP hashes
PASS;9 private/backend/test/fixture paths404. No dependency additions. Git diff
checks run before checkpoint. Schema8/photoDB1/JSON8/photo1/MasterPlan unchanged.

Evidence remains ignored under `.local/batch2-browser-qa/`: workout-laptop/phone,
mobile-set1-ack,mobile-workout-final,account-before/after-navigation,projection,
paired JSON/photo files,responsive/keyboard/console results and screenshots.
Native download events timed out twice during additional evidence collection;
files were verified on disk and later evidence was downloaded through the
documented browser download API. No PASS is inferred from a click or timeout.
Clipboard fallback is NOT VERIFIED (tool clipboard read returned empty).
An invalid synthetic PNG was rejected with a handled decode message; a valid
generated PNG uploaded/compressed successfully for the photo roundtrip.

## Acceptance boundary

**Batch2 local synthetic acceptance: PASS. Real Supabase: NOT VERIFIED.**
No native multiple-connection concurrency, iPhone/Safari,large-data/quota/eviction,
cold-start offline shell, deployed TLS/CORS or production claim is made. Existing
copy-required/compound limits, plaintext cache,projection-only export and retained
receipt/tombstone growth remain as documented. Provider setup and any Batch3
ownership/import/duplicate/rollback/photo contract need separate approval.

---

# Historical: Cloud Batch 2 implementation and verification (10/10/2026)

10/10/2026 · LOCAL AUTOMATED PASS · BROWSER QA PARTIAL · REAL SUPABASE NOT VERIFIED.
STOP after Batch 2. No production activation, personal migration, photos transfer,
deployment or GitHub push.

## 1. Verified baseline

Before edits: clean `main` at `1487cf3`, 522/522 tests, 91/91 standalone JavaScript
syntax checks, 42 public files / 684,170 bytes. Schema 8, photo DB 1, JSON backup 8,
photo backup 1. Existing architecture and Batch 1 contracts were reviewed.
The original program and private MASTER_PLAN were preserved.

## 2. Persistence and local mutations

`js/cloud-store.js` creates separate `tracker-sync` IndexedDB v1. Installation
metadata holds a device UUID. Each workspace key is `[environment, projectId, UID]`.
The scoped row holds projection, accepted shadow, outbox, unresolved/resolved
conflicts, receipts, cursor, staged bootstrap and selected live workout identity.
One guarded readwrite transaction validates and commits projection + intent +
localRevision. No account data/outbox is persisted through separate localStorage
writes. Anonymous `vshape-tracker` and `tracker-photos` remain separate.

`js/cloud-records.js` maps supported schema 8 entities into individual aggregate
records. Completed workouts retain their actual snapshot/slot/set identities;
historical meals keep stored macros. Device planning and correction candidates
remain separate from shared live/completed workouts. Valid legacy records are not
materialized merely to sync; malformed or ambiguous ownership fails closed.

## 3. Outbox and engine

`js/cloud-sync.js` freezes operation ID and exact wire request before first send.
Ordered successors depend on earlier local intents and bind the accepted base
when ready. Complete acknowledgements validate scope-bound operation identity,
record identity, revision, payload, phase, position and device ownership before
retiring only that intent. Newer local edits are overlaid on the accepted shadow.
Lost acknowledgements recover via exact retry or a complete matching own feed.

Bootstrap stages a fixed-H snapshot durably, publishing only after all pages and
exact cardinality. Incremental pull commits complete operation groups + cursor
atomically. Migration `002_sync_counts.sql` adds required group/snapshot counts
and bounds pull by captured head. No portable schema/backup migration is involved.
Pause, cancellation, reconnect, foreground focus/online/visibility and periodic
visible-page sync use durable state rather than optimistic success flags.

## 4. Conflicts and offline recovery

CAS conflicts retain base/local/remote and dependent intents across reloads.
Explicit reviewed resolution chooses remote or creates a new local proposal on
the reviewed current base. Stale review/new descendants require another review.
No timestamp winner, silent overwrite or resurrection of tombstoned IDs.

After reload, Auth tokens are absent. A user can explicitly open a known cached
workspace for device-local reading/editing; UI says “Cần đăng nhập lại” and blocks
server sync. Reauthentication must match UID/environment/project and explicitly
open the account again. Pending/dirty transitions require fresh confirmation.
Logout/expiry/switch seals active access, aborts transactions/callbacks and retains
pending rows. Sealing is not encryption. No cold-start offline/PWA guarantee.

## 5. Actual application integration

`js/cloud-workspace.js` is the guarded app boundary. Existing editor/session/
planning/nutrition writes now use the selected workspace. Minimal Settings UI
shows status, queue, conflict comparison, explicit cached access and optional
selection of a shared live workout. Remote changes preserve visible unsaved input;
“Tải lại dữ liệu mới nhất” explicitly reloads the accepted projection.

Auth adapter forwards its private in-memory bearer only to the reviewed HTTPS
gateway origin. No apikey/privileged secret is added to that request. Token and
workspace epochs reject stale responses. BroadcastChannel notices contain only
scope identity, not records; other tabs must reread their scoped cache.

Account photo UI/restore is unavailable. Optional epoch guards on existing photo
writers abort stale anonymous image transactions. Existing DB version/formats
remain unchanged. Old confirmation dialogs are closed on workspace changes.
Import preparation reads explicit anonymous candidates/metadata, shows duplicate
and ownership ambiguity, estimates JSON/photos, prepares a preview-only ledger;
Cancel has no mutation/upload/import effect.

## 6. Bugs found through integration and fixed

- Actual SQL JSONB reordered planner preference keys. Values must exactly match
  immutable requestKey before restoring its representation; no preferences are
  fabricated or changed.
- Actual Complete adds one domain revision and an audit timestamp. Gateway
  correction accepts only that precise transformation, retaining source/candidate
  CAS and rejecting arbitrary content/revision/timestamp changes.
- Browser set logging exposed false-stale JSON.stringify object-order checks.
  Domain comparisons now use canonicalJSON for objects while retaining array
  order, content, identity and revision checks. Tests were RED before this fix.
- Deferred account activation/conflict/sync/cache responses and cached logout
  had lifecycle gaps. New tests prove rejection/sealing and retained queues.
- Anonymous journal/photo/restore paths are guarded against account access;
  stale photo writes/exports abort and preserve previous artifacts/records.
- Deferred editor writes and their callers now recheck the workspace epoch before
  mutating, accepting awaited results or rendering success. Nutrition selections,
  recipe views and private editors reset on a scope transition. Regression tests
  reproduce the old A-result-into-B race and verify the guard.

## 7. Verification evidence

| Check | Result / evidence |
| --- | --- |
| Full Node regression | 632/632 PASS, no failures/skips/cancellations; all original 522 assertions retained |
| Standalone JavaScript | 112/112 syntax checks PASS |
| Existing SQL runner | 45 gateway assertions + SQL/RLS integration PASS |
| Batch 2 SQL runner | 121 assertions + original RLS script after001+002 PASS |
| Real store boundary | createSessionStore logs twice and Completes after JSONB ACK; createDraftStore saves twice after ACK |
| Public packaging | 48 files / 766,240 bytes; graph/privacy/exact SHA checks PASS |
| Packaged HTTP | 48 asset bytes/hashes match; 8 private/backend/test paths404 |
| Browser | Actual two disposable origins8840/8841: two-way food sync, offline/reload/cache/reauth, conflict KeepLocal, lostACK retry, import preview/Cancel observed |
| Anonymous browser fixture | `anonymousUnchanged:true`, external fetch0, runtime error counter0 during observed scenarios |
| Final browser workout | Start observed; false-stale set failure fixed and proven in actual SQL/store tests; browser retest NOT VERIFIED |

The final full-suite output is `.local/cloud-batch2-tests-final.txt`, also recorded
in V4_IMPLEMENTATION_REPORT. Single-connection PGlite is actual PostgreSQL WASM, not a stub SQL
store, but does not prove native multi-connection concurrency. Auth responses in
browser fixtures are synthetic; this does not prove real Supabase OTP/JWT delivery.

## 8. Browser restriction and remaining limitations

After continuation, Browser Use was unavailable and Windows Computer Use stopped
because it could not establish the browser URL confidently. No further UI input
was sent. Final UI retest, all six areas on the final artifact, native backup
downloads, full read-only navigation equality, final320/360/390 screenshots and
browser A→B→A remain NOT VERIFIED. Do not present this as a fully signed-off
browser release. The observed390px fixture is a desktop browser viewport, not iOS.

Automated account switching/read-only projection/backup handlers remain covered;
these are separate evidence from the missing final browser checks.
Other limitations: conservative account-head conflicts, complete scoped-row
serialization/storage growth, no receipt/tombstone garbage collection, no retry
background daemon, browser eviction/quota risk, no cloud photos/import/restore,
no real Auth/TLS/CORS/pooler/provider/native concurrency/device evidence.
Retaining local content against a remote tombstone returns `copy_required`;
compound workflows may require manual review. Copy-history+candidate deletion
and replacing an existing selected live workout in one mutation fail closed;
local-only workflows are preserved. Unsupported changes cannot partly commit.
Account JSON is a projection export, not a complete outbox/conflict archive.

## 9. Files and reproducible checks

New: six CLOUD_BATCH2 documents; six cloud runtime modules; twelve focused test
files; additive SQL migration; actualSQL runner; two synthetic browser scripts.
Modified: app/Auth boundary, domain equality, photo guards, packaging tests and
allowlist, cloud test script, README, roadmap, report and data model appendix.
Runtime module queries moved to `v=41` to avoid stale cached modules; CSS stays39.
No dependency additions. Private documents, fixtures, SQL/server/test dependencies
and `.local` remain excluded from the public artifact.

```powershell
npm test
node cloud/tests/run-db.js
node cloud/tests/run-sync-db.js
npm run build
npm run check:artifact
node scripts/static-package.js --inventory
git diff --check
```

See CLOUD_BATCH2_SETUP_AND_ROLLBACK for guarded provider preparation and recovery.
No tests or restore ran against user origin8765; no real-data upload, project,
deployment, personal import or GitHub push occurred.

## 10. Acceptance and next gate

**LOCAL automated sync/data-safety gates: PASS. Browser release gate: INCOMPLETE.**
Existing regression, atomicity, isolation, offline reload, idempotency, two-device
exchange, retained conflicts and stale account-write denial have direct test/SQL
evidence. Artifact privacy is verified. Real Supabase remains NOT VERIFIED.

Next: finish the outstanding synthetic browser acceptance checks, then obtain
explicit provider approval for isolated project/region/credentials/email/cost/
gateway/native-concurrency verification. Batch 3 requires a separately approved
import/ledger/ownership/duplicate/rollback/photo-transfer contract. No Batch 3 or
provider activation is begun by this checkpoint.
