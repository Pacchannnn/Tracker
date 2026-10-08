# Phase9B-2A — Synthetic security boundary matrix

08/10/2026 · **LOCAL SYNTHETIC PASS. Real provider/Auth/RLS NOT VERIFIED.**

| Gate | Automated evidence | Browser evidence / limit |
| --- | --- | --- |
| Anonymous local-only | Initial state/capture denial; return localOnly; no auto import | Initial/reload local-only, NONE UID; normal Tracker unchanged |
| Confirmed identity boundary | Issued mock object + exact UID/env/project/assurance; unissued/verified claims and real provider kind rejected | Resolve UID sai → error/no workspace; label verified NONE always |
| A/B access isolation | A→B→A candidates; stale/forged leases denied | A text retained on return; B blank after A; sealed editor clears hidden text |
| Email is not identity | Same synthetic email metadata, distinct UIDs; state drops email | No email input/display; real addresses never used |
| Environment/project/device separation | Shared memory repository, same UID, distinct scoped keys | Automated only; no real Preview/Production environments created |
| Login/logout lifecycle | Invalid transitions; logout during login and rapid A/logout/B responses | Old A response cannot authenticate B or reopen A; B response then opens B |
| Expiry / pending operations | Abort/epoch checks; expiry candidate retained; delayed result rejected | Expired editor sealed; Resolve old operation rejected; reauth A restores candidate |
| Pending warning | Draft and in-flight work warnings; Cancel, stale/forged confirmation reject | Confirm/Cancel switch and logout; Local-only warning; no upload state |
| Refresh / errors | Same issued identity refresh; wrong refresh seals; error cannot bypass pending gate; sanitized rejection | Refresh increments epoch; wrong UID/provider failure → error |
| Latest input protection | Async result checks source revision; newer candidate untouched | Automated regression; no production data writer attached |
| Logout preservation | Candidate store remains; same-page relogin reads original | SYNTHETIC FINAL A retained after logout/relogin |
| Temporary resources | Registered mock URLs revoked; aborted lease rejects new URL | Real Blob link created, refresh removes href/link; native revoke called by code |
| Detached observers/read state | Mutated snapshots/read candidates and throwing observer cannot corrupt | UI renders only current mock workspace |
| Reload | Fresh context has no trusted persisted state | Reload clears requests/candidates and returns local-only |
| No native access/upload | Throwing getters for native storage/network APIs: zero accesses; source audit | No harness storage imports or requests; source audit, not full browser network trace |
| Anonymous data preserved | Existing schema8 backup equality; auth metadata absent | Actual8821 downloaded JSON before/after mock flows deep-equal |
| Public artifact isolation | Build/check39files; hashes match9B-1; source excludes dev/auth | HTTP39assets200/hash equal; mock/private paths404 |
| Existing regression |453 existing tests retained +22 boundary tests =475/475 | Six Tracker views; save15kg×8/RIR3→reload→history |

## Test execution and review

Initial targeted run failed because auth-context.js did not exist (RED).18 original
groups passed after core implementation. New pending-operation warning test failed
before run marked pending. Failed-refresh gate and newer-input tests each failed
before fixes. Final22 groups pass, full475/475, no skipped/cancelled/failed tests.
Syntax80/80 and build/inventory/diff checks pass. Existing tests/assertions unchanged.

Self-review: no real auth provider, JWT, email credential, cloud-synced UI, native
storage or account persistence. Pending candidates remain scoped; no deletion on
lifecycle transitions. Mock scopes/device strings are fixtures, not credentials.
Identity provenance and leases are application test mechanisms; a hostile script
with harness module access can control its mock adapter. This is not an auth bypass
in Tracker because no normal runtime imports the harness or trusts mock identities.

No logs contain candidate text, email, tokens, body/journal/photo data. Exceptions
exposed by context are fixed generic strings. UI text uses textContent/value.
Unit test output names describe cases and synthetic identifiers only.

## Not proven here

Real Supabase UID/project/token verification, JWT expiry/rotation, OTP/SMTP/signup,
server authorization/RLS, persistent account isolation, multi-tab account state,
real-device behavior, encrypted cache, durable offline/cloud queue, remote revoke
or full network trace. Scope sealing is not encryption. No Supabase/Vercel operation,
personal upload, schema/backup change or8765 action occurred.
