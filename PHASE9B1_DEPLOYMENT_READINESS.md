# Tracker — Phase9B-1 Deployment Readiness

08/10/2026 · **IMPLEMENTED / VERIFIED in the local scope below. STOP AFTER9B-1.**

## Baseline and approved design

Verified clean main541162b,439/439tests,74/74syntax, schema8/photoDB1/backup8+1.
Phase9A proposals remain unimplemented. This task authorizes only static packaging
and disposable-origin verification; no cloud/Auth/deploy/real-data operations.

Chosen design: native Node script with an explicit runtime-file allowlist,
byte-preserving copies into `dist`, dependency-path and privacy checks, inventory
with SHA256. No bundler/transpilation/dependency; no app/UI/data-format edits.
Copying the whole repository risks private-file exposure; a framework/bundler
adds work without helping this static app. Existing35modules, HTML/CSS and
local font/OFL are the public runtime assets. Their existing workout definitions
and default targets are visible source, not private journal/history/photo data.

## Implementation plan

- [x] Task1: tests first in `tests/static-package.test.js`; run targeted RED.
  Exercise actual CLI on temp source trees: allowlist exclusion, deterministic
  output, missing files, secrets, unsafe imports/CSS, symlinks, existing-output
  safety, modified artifact and config. No personal files in fixtures.
- [x] Task2: `scripts/static-package.js` native fs/path/crypto only;
  `npm run build` copies approved files; `npm run check:artifact` verifies hashes,
  inventory and graph. Reject unknown existing output rather than delete it.
  Output fixed to root `dist`; reject symlink traversal; privacy messages show
  filename/rule, never matching secret values. `--inventory` emits safe metadata.
- [x] Task3: minimal `vercel.json` uses build command/output, no framework,
  no install step, conservative cache revalidation. Add dist to ignore; dependencies
  and package-lock unchanged. Targeted GREEN, full suite/syntax/build checks.
- [x] Task4: serve **only dist** at disposable8800/8801. Synthetic files only,
  real UI workflows and backup files, reload, keyboard/mobile320/360/390,
  read-only integrity and network check. Never use8765. Record limitations honestly.
- [x] Task5: artifact inventory, local QA and final report; roadmap/report/README
  usage; reviewed local main checkpoint. STOP after9B-1, no deploy or9B-2.

## Verification status

Baseline439 tests retained;14 packaging tests added: **453/453 pass**, no skips.
**76/76 JS syntax checks** (runtime, tests, packaging); build/check/inventory and
`git diff --check` pass. Node24.19.0 used, no new dependency or package-lock change.
Tests cover exclusions, repeatability, missing/tampered files, secret redaction,
static/dynamic imports, remote CSS, unknown output retention, unsafe config,
junctions/hardlinks and CLI validation. Initial missing-script RED preceded GREEN;
hardlink overwrite reproduction also failed before the link guard fix.

39 public files /664470 bytes; SHA256 equality to source, dependency reachability,
known-secret/remote-resource/source-map scan pass. No user data in the artifact.
Existing public exercise/target definitions remain public; see inventory policy.
The scanner is a reviewed heuristic, not a general AST/security scanner.

## Reproducible commands

Run from the Tracker repository with Node (tested24.19.0) and Python for preview:

```powershell
npm run build
npm run check:artifact
node scripts/static-package.js --inventory
python -m http.server 8800 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8800/ for disposable preview only. No real data import is
needed to review packaging. `dist` is the intended Vercel output directory, ignored
by Git and recreated from the explicit list. The script never recursively deletes
output; review/remove unexpected output manually before retrying. Preflight is not
a filesystem transaction: interrupted copies require another build/check before use.

## Runtime compatibility evidence

| Area | Evidence / limit |
| --- | --- |
| Entry and navigation | index.html loads; six modules plus Weekly/Monthly visited; reload succeeds. In-page navigation uses buttons; no deep-route rewrite needed for current UI. |
| Modules / assets | All39 approved HTTP responses200 with exact hashes; app?v40/CSS?v39 load; dependency graph reaches35modules and local font. Literal dynamic imports checked; computed imports rejected. |
| Fonts / icons | Local Patrick Hand TTF and license included; font visible in screenshot/computed family. Existing inline icons remain; no icon CDN. |
| Cache | Existing version query strings unchanged. Config sets no-cache revalidation for static content; no immutable caching on unhashed files. Python preview does not emulate these Vercel headers. |
| Secure context / locks | Loopback browser saves/restores worked. Existing Web Locks capability gate refuses unsafe writes; no fallback bypass added. HTTPS deployment, unsupported-browser behavior and permission/quota failures are not newly proven by this QA. |
| IndexedDB | Four local synthetic photos exported/imported/reloaded with byte equality. Existing capability/error handlers retained and regression tested. No photo DB upgrade. |
| localStorage / backup | JSON schema8 and photo format1 unchanged. Read-only navigation/reload exports equal; workout persistence and paired fresh-origin restore verified. |
| Requests | Source/dependency audit and DOM resource inspection found no remote assets/APIs/analytics. No complete browser network trace was available; this is not a claim that every browser/background request was instrumented. |

Read-only DOM evaluation cannot inspect navigator capabilities in this tool scope;
that inspection error was not an app runtime error. Console error/warn capture for
the actual app flows was empty. Local HTTP verification was rerun with native
node:http and consumed response bodies after a Node fetch/undici shutdown assertion;
the clean rerun passed. Details in PHASE9B1_LOCAL_QA.md.

## Deployment configuration and separation

`vercel.json`: buildCommand=npm run build; outputDirectory=dist; framework=null;
installCommand=""; sole header Cache-Control:no-cache. No functions, environment,
rewrites, analytics or production credentials. Official documentation supports
these [configuration fields](https://vercel.com/docs/project-configuration/vercel-json)
and [cache controls](https://vercel.com/docs/caching/cache-control-headers).

Future Preview/Production must be reviewed separately: use only synthetic data in
Preview, preserve separate origins/storage, no shared credentials or automatic
real-data restore. A production origin change does not migrate localhost data.
Current no-cache is for public static assets, not a policy for future private Auth
responses; those would need a separately approved no-store/security design.
No environment or Vercel/GitHub connection was created here.

## Acceptance gates

| Gate | Result |
| --- | --- |
| Explicit approved assets only; private files excluded | PASS:39-file inventory; nine excluded HTTP paths404 |
| No personal records / secrets / source maps | PASS in reviewed artifact scope; filename/content guards and source equality |
| Required runtime assets and existing behavior | PASS: module graph, asset hashes, bounded browser workflows and453 regression tests |
| Disposable browser / mobile / keyboard | PASS:8800/8801 only,24 width/view checks, desktop, Enter/Tab/Shift+Tab visible focus |
| Storage/backup integrity | PASS: full JSON and four photos equal across read-only navigation and paired restore; old216sessions preserved |
| No user-origin changes / remote deploy | PASS:8765 untouched; local servers only; no push/provider/account operation |

Local acceptance **PASS**. Production Vercel build, headers/routing/CDN behavior,
HTTPS and physical Safari/Firefox/mobile remain **NOT VERIFIED**. No cold-start
offline guarantee, SW/PWA or new photo-memory/quota guarantee.

## Next approval gate

STOP. Phase9B-2 requires a separate approved scope. The Phase9A roadmap proposes
Auth foundation next; provider/accounts, Preview/Production separation, privacy,
OTP/SMTP/cost and credential handling must be approved before creating services.
Static production deployment itself also needs explicit approval. No9B-2 work
or deployment has begun.
