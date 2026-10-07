# Phase 8B-2 — Compatibility matrix

08/10/2026 · **IMPLEMENTED / TESTED trong phạm vi local đã xác minh.**
Không phải chứng nhận tương thích toàn bộ nền tảng. Thiết bị thật: **NOT VERIFIED**.
Baseline main `c3eb5c3`, code `6dea230`, 412 tests / 71 syntax, schema8 khớp.
Final: **439/439 tests**, 74/74 syntax; giữ nguyên toàn bộ 412 tests cũ.

## 1. Phân loại evidence

- **N — Node:** logic, fake-indexeddb, browser capability doubles và isolated app export handlers.
  Fake quota/abort không chứng minh quota hay crash behavior của browser thật.
- **B — Browser:** Codex In-app Browser, disposable localhost8794/8795; native
  localStorage/IndexedDB/Blob/File/Web Locks, rendering và UI automation.
- **D — Real device/product:** chưa có phiên kiểm tra trên browser sản phẩm hoặc
  điện thoại/tablet thật. Không suy D từ N/B, viewport hẹp hoặc user-agent.
- **PENDING / NOT VERIFIED:** chưa chạy, không phải FAIL hay PASS.

Browser inventory chỉ cung cấp IAB và MCP Apps; không có surface Safari/Gecko/
Chrome/Edge độc lập để chạy. IAB báo UA `Windows NT 10.0; Win64; x64`,
`Chrome/155.0.0.0`, `navigator.platform=Win32`. Chromium/Blink được suy từ UA;
build renderer không được xác định độc lập. IAB không đồng nghĩa Windows Chrome.
Secure context và các capability locks/IndexedDB/clipboard/createImageBitmap/
File/Blob/objectURL đều có trong phiên này. Không cài dependency/browser mới.

## 2. Target matrix

| Platform | Browser | Engine/product test | Real device | Manual |
|---|---|---|---|---|
| iOS | Safari | NOT VERIFIED | NOT VERIFIED | Pending |
| iOS | Chrome | NOT VERIFIED | NOT VERIFIED | Pending |
| iPadOS | Safari | NOT VERIFIED | NOT VERIFIED | Pending |
| iPadOS | Chrome | NOT VERIFIED | NOT VERIFIED | Pending |
| Android | Chrome | NOT VERIFIED | NOT VERIFIED | Pending |
| Android | Firefox | NOT VERIFIED | NOT VERIFIED | Pending |
| Windows | Chrome | NOT VERIFIED | NOT VERIFIED | Pending |
| Windows | Edge | NOT VERIFIED | NOT VERIFIED | Pending |
| Windows | Firefox | NOT VERIFIED | NOT VERIFIED | Pending |
| macOS | Safari | NOT VERIFIED | NOT VERIFIED | Pending |
| macOS | Chrome | NOT VERIFIED | NOT VERIFIED | Pending |
| macOS | Firefox | NOT VERIFIED | NOT VERIFIED | Pending |
| Linux | Chromium / Chrome | NOT VERIFIED | NOT VERIFIED | Pending |
| Linux | Firefox | NOT VERIFIED | NOT VERIFIED | Pending |
| Managed IAB, UA Win32/Chrome155 | Codex IAB | B: PASS for named scope below | N/A; no device certification | Broader flows pending |

## 3. Workflow audit

| Area | N: current suite | B: newly exercised | Boundary |
|---|---|---|---|
| Gym | Runtime ownership, queue, stale/quota/identity, structure, snapshots, recovery, history paging | Resume fixture;12.5kg×10/RIR2 saved via Enter; Start/Pause/Resume/Reset/Skip rest90s; add curl, replace press, remove curl with confirmation; reload retained set/statuses; Complete; Start next;73 historical sets20→40→60→73 via Enter | No real gym/touch/timer background suspension test; controlled fixtures, no training advice |
| Nutrition | Search, batch validation/one-write/failure, snapshot isolation, recipes/cookbook | Two-food review and save:1.5+1 portions,500kcal/37.5P/50C/12.5F synthetic totals; recipe search/open; Cooking4portions→200g ingredient/1200kcal preview; return with Enter | Values are test fixtures. Every nutrition edit/delete path not rerun on each engine |
| Journal | Mood/tags, journal/photo CRUD/CAS, retrieval/paging | Save synthetic mood/tags/note; search `tuong thich`+tag with Enter→1result; calendar/timeline; FileChooser JPEG2×2→save;5 images decode2×2 | HEIC unsupported; full OS picker usability pending; no personal photos used |
| Progress / My Day | Weekly/Monthly missing/unknown/zero, source context, selected reads/URL lifecycle | Weekly→2026-10-08 My Day→journal→return; Monthly six text-source types→correct editor/history→return; photo source is inline thumbnail/full/close, not a new route; history paging | Source mutation conflict/error branches mainly N; not an association/causality feature |
| Settings | Strict JSON8/photo1, migrations of supported older imports, stale preview, storage failure, bytes | Corrupt preview rejected; valid counts; disabled JSON restore until acknowledgement; native chooser for downloaded files; JSON then photos on8795; compare/reload/repeated photo import; top-level downloads read from disk | JSON+photos not atomic; native/private/quota crash behavior pending |

The browser search/tag/source selector retries were automation targeting issues:
`option.label` trims the synthetic trailing space whereas `option.value` retains
it; correct value selection works. Photo source intentionally renders inline.
Neither was classified as an app regression or fixed by changing product behavior.

## 4. Responsive and input evidence

60 measured cases: ten screens × six iframe viewport widths, height800px.
Screens: Home, Gym home, Gym history, Nutrition daily, Food Library, Recipes,
Journal, Weekly, Monthly, Settings. Long Vietnamese exercise name and labels used.
Native desktop scrollbar occupies15px; actual CSS layout width is recorded below.

| Requested width | document.clientWidth / scrollWidth | Main form/button clipping | Mobile nav |
|---|---|---|---|
| 320 | 305 / 305 | None measured | Inside width; bottom800; height87.15 |
| 360 | 345 / 345 | None measured | Inside width; bottom800; height72.275 |
| 390 | 375 / 375 | None measured | Inside width; bottom800; height72.275 |
| 768 | 753 / 753 | None measured | Desktop layout; mobile nav hidden |
| 1024 | 1009 / 1009 | None measured | Desktop layout |
| 1440 | 1425 / 1425 | None measured | Desktop layout |

Before/after read-only sweep: rawJSON, photo metadata and original/thumbnail bytes
equal; **0 Storage writes,0 IDB readwrite transactions**, no probe errors/external
requests. Sweep repeated on final code with expanded workflow data.

Keyboard Enter exercised Save Set/Journal, Cooking Return, Journal tag and History
More; focused controls observed. Mouse/locator clicks, number/search/select/date
elements and file chooser API exercised. This is not a complete keyboard audit.
Native date editor UI, touch gestures, virtual keyboard occlusion, rotation,
notched-screen safe area, browser chrome resizing, screen reader: **NOT VERIFIED**.
Six width cases do not prove touch or iOS behavior. No CSS/layout redesign.

## 5. Reproduced fixes and compatibility boundaries

1. Controlled `blocked` write open previously stayed pending; now rejects with
   a tab-conflict message. Deferred upgrade aborts and deferred success closes;
   no delayed write after reported failure. Read open previously leaked a late
   successful connection after blocked rejection; now closes it. DB staysv1.
   Native blocked upgrades were not reproduced (normalv1 opens need no upgrade).
2. JSON export previously revoked the existing download before storage/validation/
   new objectURL creation succeeded. Photo export had the same new-URL failure
   ordering. Both now prepare the replacement URL first. Failed preparation
   retains the prior usable link; successful replacement revokes the old one.
   RED tests failed before fixes; browser synthetic corruptJSON/objectURL failures
   verify old link bytes still readable, then successful replacement cleanup.

Web Locks is a required write gate; there is **no unsafe write fallback**.
Use capability detection, not browser brand. Secure origin is required by this
API; official documentation is capability evidence, not a Tracker PASS:
[MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
Missing locks denies JSON save/restore; missing/denied IndexedDB denies photo work.
Missing/denied clipboard reports download fallback; URL support is needed to
prepare links. No new persistent key, schema, upload or recovery protocol added.

Browser storage can be cleared/evicted; private modes/policies/available disk
change outcomes. See [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
and [blocked event](https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/blocked_event).
No universal storage durability promise. Full-file JSON/base64 backup memory,
pending restore interruption and actual Safari/Gecko behavior remain manual gates.

## 6. Acceptance status

Local regression, bounded fixes, synthetic integrity/restore, measured widths,
honest evidence separation: **PASS in verified scope**. Full target compatibility:
**NOT VERIFIED**, release certification still pending manual matrix.
No user8765 storage accessed/seeded/restored; no push, migration or architecture
change. STOP8B-2. Next is the device checklist, not another experiment.

Related: [backup evidence](PHASE8B2_BACKUP_VERIFICATION.md),
[manual device checklist](PHASE8B2_MANUAL_DEVICE_CHECKLIST.md).
