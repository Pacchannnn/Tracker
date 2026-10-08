# Phase9B-1 — Local packaged-artifact QA

08/10/2026 · **PASS within this local scope. Production / real devices NOT VERIFIED.**

## Isolation and fixtures

- Served only `dist` with Python bound to127.0.0.1 at8800 (source QA) and8801
  (fresh restore QA). Never visited, exported, restored or wrote the user's8765
  Tracker origin. No real records or personal photos used.
- Codex in-app browser; desktop1440×900 and actual emulated widths320/360/390.
  No browser dependency, harness or probe was added to the artifact.
- Reused synthetic Phase8B-2 JSON/photo files:216 completed sessions, planning
  drafts, custom plans, nutrition, journal and measurements; four tiny synthetic
  JPEG photo records, including food/recipe owners and orphan metadata.
- Imports/exports used real UI file selection, preview, confirmation and actual
  downloaded files. No hidden-storage mutation through browser evaluation.

## Browser checks actually performed

| Workflow | Observed result |
| --- | --- |
| Home / Gym / Nutrition / Journal / Progress / Settings | Each opens at desktop and each mobile width; no runtime error observed. |
| Weekly / Monthly review | Both open at all three mobile widths; no overflow. |
| Food Library | DAU HU matches Đậu hũ; keyboard Enter clears search and restores three foods; owned food photo displays. |
| Journal photos | Gallery opens; four records in actual backup. No real photo uploaded. |
| Save / reload / complete | Existing synthetic empty workout draft: save20kg×10/RIR2 with Enter; reload shows exact set; Complete produces history with those values. |
| Keyboard | Enter activates Save Set, clear search and Home. Tab from Hôm nay focuses Gym; Shift+Tab returns Hôm nay; :focus-visible true in both directions. |
| Resources | DOM CSS/module URLs relative, existing query versions39/40; external DOM resource URL list empty. Local Patrick Hand rendered in desktop screenshot. |
| Console | Captured error/warn logs empty on both disposable tabs after workflows. |

24 mobile checks = six primary views plus Weekly/Monthly at three widths.
Measured document clientWidth/scrollWidth:305/305 at320,345/345 at360,
375/375 at390 (scrollbar accounts for15px); desktop1425/1425.
Mobile navigation button bounds remained inside the viewport. Screenshot of the
packaged Home was captured/displayed in the tool conversation. This is a bounded
view check, not all editor/modal states or physical-device touch/screen-reader QA.

## Storage and backup integrity

1. At8800, imported synthetic JSON then photos via UI. Exported real before files.
2. Visited read-only views/search/reviews at mobile widths and reloaded; exported
   after files. Node deep equality: all JSON `data` fields equal, all four photo
   records/metadata/base64 equal. No write counter was injected, so equality of
   persisted state is the proven result, not an instrumented zero-write claim.
3. Logged/completed the synthetic set. Session count216→217; draft→null. All216
   old sessions and all unrelated domains deep-equal before-state; new set exactly
  20/kg/10/RIR2. This was the only expected record change.
4. Exported JSON+photos from8800. Imported both at fresh8801 through confirmation;
   photo summary four added/zero kept. Reloaded then exported again.
5. Source/restored full JSON `data` deep-equal. Four photo records/metadata and
   decoded full/thumbnail bytes deep-equal, **5224 binary bytes** total.

Eight real downloads (four JSON/photo pairs) inspected. Evidence copies and
comparison result reside only under ignored `.local/phase9b1-*`; never packaged
or committed. Photos retain food/recipe owner metadata. JSONv8/photo backupv1,
schema8/photo DBv1 remain unchanged. Paired restore is still two operations, not
an atomic transaction; keeping both files is necessary.

## HTTP, artifact and regression

- Native node:http: all39 approved paths200 and response SHA256 matches inventory;
  app?v40/CSS?v39 return200. All response bodies consumed; command exit0.
- Nine excluded paths return404: MASTER_PLAN.md, .env, .git/config,
  .local/phase9b1-before-data.json, tests/model.test.js, package.json, vercel.json,
  PHASE9A_SECURITY_PRIVACY.md, node_modules/fake-indexeddb/package.json.
- Exact artifact inventory/byte integrity, local import graph, known-secret,
  source-map and remote-resource guards pass. OFL attribution URLs are plain text.
- Full suite453/453, no skipped/cancelled/failed tests. All439 existing tests
  retained;14 packaging tests added. Syntax76/76; build/check/diff checks pass.
- One initial HTTP audit using Node fetch printed successful comparisons then
  hit an undici shutdown assertion. Rerun with native HTTP passed cleanly;
  no app change was made for that transport problem.
- A selector for nonexistent “Trang chủ” failed during keyboard inspection;
  snapshot identified actual labels and the correct Tab/Shift+Tab test passed.
  A readonly capability evaluation of navigator was unavailable in the tool;
  this does not prove unsupported-browser capability behavior.

## Limits / next device checklist

NOT VERIFIED: Vercel production build/headers/HTTPS/CDN, physical Safari/Firefox,
private browsing, quota/eviction, large camera/photo libraries, native downloads
on mobile, every existing CRUD/error flow or cold offline launch. Existing tests
cover their modeled contracts, not all platform behavior. No complete browser
network trace captured: source/DOM inspections found no remote resources/APIs,
but do not establish a zero-request trace for browser background traffic.

For an approved later real-device phase, use synthetic data on disposable origins:
verify locks and IndexedDB capability/error states, reload/save/conflict behavior,
two actual backup downloads, fresh-origin paired restore with full equality,
large-library memory/quota/cancel/retry, Safari file chooser/download UX,
touch/keyboard/screen reader and actual HTTPS/cache behavior. Never perform a
destructive restore on8765. Stop on mismatched bytes, private exposure, unsafe
writes or unrecoverable backup; retain source and both backup files for review.

Owned QA servers/tabs are closed after verification; user tabs/origin remain intact.
No deployment, provider account, cloud project or GitHub push occurred.
