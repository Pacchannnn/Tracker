# Phase9B-2A — Local QA

08/10/2026 · **PASS in local/synthetic scope; STOP9B-2A.**

## Baseline

Clean main727ed2f; fresh453/453 baseline tests,76/76syntax; schema8/photoDB1/
backup8+1; artifact39files/664470bytes validated before changes. Five9A contracts,
9B-1 reports, data model/roadmap/report and app/storage/photo/backup sources reviewed.
No material mismatch. No dependency or normal runtime/UI/storage edit required.

## Origins and actions actually run

Python served **only dev/auth** at127.0.0.1:8820 and **only dist** at8821. Codex
in-app browser used separate temporary tabs; original ChatGPT tab retained.
No8765 read/write/restore/export, real data, real account, provider or deploy used.

| Scenario | Observed |
| --- | --- |
| Start | local-only, UID/verified NONE, editor sealed |
| Login A | authenticating with pending request; correct response → synthetic A |
| Pending draft | SYNTHETIC A CANDIDATE; switch B prompts warning; Cancel retains A |
| Delayed A operation / B | Confirm switch then B response; B blank; resolving old A operation rejected |
| B→A | Original A candidate/pending flag restored |
| Expire A | Operation pending; expired seals editor; old result rejected; explicit reauth A restores candidate |
| Rapid lifecycle | A login→Logout→B login; A late response blocked, B response accepted |
| Refresh URL | Create real local Blob link; refresh bumps epoch and clears link/href |
| Wrong identity / failure | Wrong UID response→error/no workspace; Reject response→error with generic notice |
| Logout preservation | Pending warning Confirm; A relogin shows SYNTHETIC FINAL A |
| Reload | Returns local-only epoch0, no requests/candidate; intentional memory-only harness |
| Local-only transition | B candidate prompts warning; Confirm seals account and returns local-only |
| Keyboard | Tab A→B, focus-visible true; Enter activates B login |

Harness checked at actual320/360/390 widths: client/scroll305/305,345/345,375/375.
First viewport attempt applied to app tab while harness remained1265px; those
measurements were not treated as mobile harness evidence. Closed app tab, repeated
on harness and obtained actual widths above. Viewport reset after tests.
Packaged Settings also passed three widths305/345/375 with no horizontal overflow.
These checks do not replace physical-device or screen-reader verification.

## Normal Tracker and backup integrity

At fresh8821, opened Home/Gym/Nutrition/Journal/Progress/Settings. Started Original
Plan A, saved15kg×8/RIR3 with Enter, reloaded, reopened live draft with exact set,
completed and saw history. No auth/login entry appeared in Tracker.

Exported actual JSON download before further mock transitions and again after.
Node deep-equality of **entire data object** passes; schema8 retained; expected
session/set values confirmed; no mock context/verifiedAccountId/access/refresh
token metadata. Files copied only to ignored .local/phase9b2a-tracker-before/after.
Tests independently ensure anonymous emptyData/portable backup unchanged and
zero native storage/network access during synthetic lifecycle. No photo writes
were made; photo runtime/DB/backup formats byte-unchanged and regression covered.
No new photo paired-roundtrip is claimed in this phase (9B-1 evidence retained).

## Artifact and regression

Fresh full475/475tests;22 new auth groups, all453 existing tests/assertions kept.
80/80 JS syntax checks including harness. Build/check pass:39files/664470bytes;
all39path/size/SHA256 entries equal9B-1 inventory. No mock files or fixtures enter
allowlist. HTTP39runtime assets200+matching hashes; excluded paths dev/auth/index,
mock-provider/auth-context, root auth-context, auth test, MASTER_PLAN.md and .env
return404. Dependency/config/package/MASTER_PLAN/schema source unchanged.
Captured error/warn console logs empty for both QA tabs. No complete browser
network capture: source/import audit finds no remote calls or credential handling.
Fake provider requests are in-memory promises, not HTTP requests.

## Limits and cleanup

No real Auth verification, persistent account cache, durable queue, cross-tab
coordination, real Preview/Production, OTP/SMTP or Supabase SDK. Device ID is an
injected synthetic contract. Mock session/candidates disappear on reload; existing
Tracker local data remains persistent. Epoch guards stop boundary commits, not
arbitrary external side effects a future callback might perform before returning;
future work must apply all writes through guarded transactional boundaries.

Owned QA tabs/servers closed after verification; viewport reset; no user-origin
storage deletion or remote operation. Local acceptance PASS; real Supabase and
real-device/browser compatibility remain NOT VERIFIED.9B-2B needs separate scope
and approval for provider/SDK/credentials/privacy/cost/OTP/SMTP. STOP here.
