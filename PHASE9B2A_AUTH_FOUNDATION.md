# Phase9B-2A — Auth foundation (LOCAL / SYNTHETIC ONLY)

08/10/2026 · **IMPLEMENTED / TESTED LOCAL SYNTHETIC ONLY. STOP9B-2A.**
Real Auth/Supabase NOT VERIFIED.

## Approved scope and design

Baseline727ed2f,453tests,76syntax,39 public files verified. Schema8/photoDB1/
backup8+1 unchanged. Phase9A contracts guide scope; no later-phase authorization.
Human explicitly requests implementation; this plan executes that approved scope
inline, on main, without extra aesthetic/provider decisions or a new worktree.

Choose provider-independent context + deterministic mock + isolated harness.
Alternatives: wiring mock login into normal Tracker risks confusing trust/data;
implementing account IDB/outbox now exceeds scope. All five harness files live
under dev/auth and are excluded from dist. Normal runtime remains byte-identical.
No dependency, token, network, real email/credential or automatic migration.

## Architecture and interfaces

auth-context.js owns state/epoch/transition confirmations and guarded synchronous
workspace access. Adapter beginLogin returns an asynchronous identity; isIdentity
validates provider-issued identity; kind/assurance are explicitly synthetic.
Mock provider uses issued-object provenance, not JWTs or claims of real security.
Only matching environment/project/selected UID can confirm; email isn't identity.
verifiedAccountId always null. Real provider mode is rejected in this phase.

Mock workspaces key environment/project/UID/device; empty account starts empty,
never from anonymous content. Store is memory only, injected separately from the
normal app. Device ID is noncredential metadata supplied for this harness; future
installation ID generation/persistence needs its own account-storage contract.

States: local-only, signed-out, authenticating, authenticated, expired, switching,
error. Login/switch opens no workspace before confirmation. Expire/logout/switch/
refresh bump epoch, abort old leases, revoke registered temporary URLs and seal
old access. Sealing is an application boundary, not encryption. Pending candidates
remain in mock memory; transition warnings need explicit fresh confirmation.
Expiry never marks work uploaded or moves it to another UID. Reload deliberately
starts local-only with fresh memory, not a persisted authenticated session.

## Implementation plan

Use executing-plans inline. Dependencies1→2→3→4. TDD before implementation.

- [x] 1. Create tests/auth-context.test.js. RED missing module; cover transitions,
  issued identity/project/UID rejection, A→B→A, stale/forged leases, pending
  confirmation freshness, abort/URL cleanup, expiry/refresh/errors/rapid transitions,
  environment/device separation, detached snapshots/subscription, no real storage
  or network, no portable backup contamination. Command: node --test tests/auth-context.test.js.
- [x] 2. Implement dev/auth/auth-context.js and mock-provider.js. GREEN tests;
  methods read/login/confirmIdentity/refresh/expire/logout/switchAccount/localOnly/
  subscribe/capture/readWorkspace/writeWorkspace/run/registerURL. No durable writes.
- [x] 3. Add index.html, style.css, harness.js with MOCK labels, only account A/B
  selectors, queued fake responses, draft edit, pending warning confirm/cancel,
  expiry/refresh/logout and controlled delayed operation. Serve only dev/auth at
  disposable8820; no Tracker imports/storage. Verify browser behavior/reload.
- [x] 4. Fresh regression/syntax/build and inventory equality to9B-1; packaged
  Tracker smoke at8821; security matrix/local QA docs, roadmap/report, reviewed
  local checkpoint. STOP9B-2A, no9B-2B/provider operation.

## Future adapter integration boundary

Real Supabase adapter requires separately reviewed SDK/version/project configuration,
provider session validation and verified UID/project, session events/refresh, secure
credential handling and server authorization. Never promote synthetic identities
to verified users. Account persistence must commit data+outbox atomically in a
separate approved phase; this memory store cannot guarantee durable offline data.
UI subscribers can react to the same lifecycle; normal Tracker storage remains a
separate anonymous workspace until an explicit migration contract is implemented.

## Verification

22 new boundary tests GREEN; all453 existing assertions retained, **475/475**
full suite, no skips/failures. **80/80 syntax** including dev/auth, tests, scripts
and runtime. Packaging/inventory/diff checks pass.39files/664470bytes; every hash
matches9B-1. No production auth entry point, dependency or runtime/schema change.

Actual disposable browser8820 exercises synthetic transitions;8821 packaged
Tracker smoke/save/reload/history and downloaded backup equality pass. Complete
results and limits: PHASE9B2A_SECURITY_TEST_MATRIX.md / PHASE9B2A_LOCAL_QA.md.

## Concrete lifecycle contract

| Current state | Allowed operation / result |
| --- | --- |
| local-only / signed-out / error without account | login explicit UID → authenticating |
| authenticating / switching | matching current issued mock identity → authenticated; wrong identity/provider rejection → error; logout/localOnly invalidates late response |
| authenticated | capture/read/write/run; matching issued refresh bumps epoch; expire → expired; switch another UID → switching; logout → signed-out |
| expired / error with account | Workspace sealed; explicit switch or same-UID reauthentication → switching; pending warning applies; logout/localOnly allowed |
| any context | localOnly seals account access; no candidate deletion; no automatic upload/migration |

Invalid login/switch/refresh/capture combinations reject. Confirmations are opaque
object references bound to action/UID/epoch/revision; editing/cancel/new transition
invalidates them. Read/snapshot candidates are detached. Guard leases have local
object provenance, scope and epoch plus AbortSignal; copied/foreign/stale leases
cannot read/write. run marks pending, awaits a controlled operation, then checks
epoch/account and source revision before applying. Newer input is preserved;
stale rejection never retargets another UID. Registered Blob URLs are revoked on
epoch changes; harness clears href as well. Observer errors cannot corrupt state.

Identity confirmation requires adapter-issued object AND exact environment/project/
selected UID/synthetic assurance. These are test boundary guarantees, **not** a
cryptographic identity or server authorization system. Mock adapter is intentionally
controllable in test code. Never accept its output as a verified Supabase identity.

Memory candidates persist through logout/switch/expiry in the same page only.
Reload discards the entire mock fixture state and starts local-only; no durable
session, queue, pending recovery, cross-tab coordination or account DB is promised.
Key includes device to isolate fixture workspaces; future account projection vs
device draft separation belongs to the account-storage design.

## Run harness locally

```powershell
python -m http.server 8820 --bind 127.0.0.1 --directory dev/auth
```

Open http://127.0.0.1:8820/. Use only built-in A/B and synthetic text. Choose account
then resolve a mock response. A candidate becomes pending; Logout/Switch/Local-only
offer Confirm/Cancel. Start operation, change context, then Resolve operation to
observe rejection. Reload resets harness. No credentials/email/OTP input exists.
Serve only this directory; never publish it or serve the repository root for QA.

## Next approval boundary

STOP after9B-2A.9B-2B real adapter requires explicit approval and a reviewed scope
for SDK/dependency, isolated provider/project/environment, accounts/UID validation,
privacy/cost, OTP/SMTP and credentials.9B-2A has not created any of these. Account
IDB migration, durable outbox and cloud APIs remain later separately approved work.
