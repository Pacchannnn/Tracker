# Phase 8B-2 — Manual device checklist

08/10/2026 · **Every checklist below is PENDING / NOT VERIFIED.**
No physical device/product row is completed by Node tests or IAB resizing.

## Safety and setup

- Use only synthetic records and photos, plus a separate disposable origin or
  browser profile. Never restore, clear storage, induce quota or kill a pending
  restore on the user's normal Tracker origin (`127.0.0.1:8765`).
- Keep a known-good paired JSON/photo backup of any valuable state before testing.
  Do not upload files, bodies/photos/history or logs externally.
- Obtain a secure HTTPS origin controlled by the user, or localhost served on
  the same device. Laptop `localhost` is not phone `localhost`; LAN HTTP is not
  automatically a secure context and WebLocks may be missing. Setup/transport
  needing deployment/account/permission is **BLOCKED_SETUP**, not a reason to
  bypass browser warnings. This phase does not deploy or implement PWA/backend.
- Record exact build/commit, origin, OS/device and browser version. Same origin
  across browser profiles/devices does not mean the storage is shared.
- Do not assume any named browser's APIs from brand alone. Record secure context,
  WebLocks/IndexedDB availability and actual errors. Missing WebLocks must deny
  JSON writes without losing existing state; there is no unlocked fallback.
- Keep two distinct test environments: **A for recording/export**, **B for restore**.
  Use original backed-up files; no password/key/authentication is needed in app.

## Common end-to-end run (complete for each browser/device)

| Step | Procedure and expected evidence | Result |
|---|---|---|
|1 Open |Load exact Tracker build in A; no console/runtime error; navigate six sections |PENDING |
|2 Create |Synthetic workout/set12.5kg×10/RIR2; food label macros100/8/12/3;1.5servings; journal title/mood/tags; measurement values; JPEG/PNG/WebP test image |PENDING |
|3 Reload |Reload; exact IDs/counts/weight/unit/reps/RIR, nutrition snapshot and journal/photo remain; Resume workout |PENDING |
|4 Gym |Timer Start/Pause/Resume/Reset/Skip; add/replace/remove with review; reject invalid set; Complete; source plan/history unchanged |PENDING |
|5 Nutrition |Search `COM GA`/`dau hu`,Clear/noresult; recent/multi-add→review→save once; edit food and verify oldmeal snapshot; recipe search/Cooking scaling must not log food |PENDING |
|6 Journal/progress |Mood/tag/note search; timeline/calendar; Weekly→MyDay/source→Back; Monthly six text sources and inlinephoto full/close; history73sets paging20/40/60/73 if fixture available |PENDING |
|7 Prepare/download |Prepare JSON thenphoto; click both; app should say request/prepared, never guarantee saved; inspect actual files in OS file manager |PENDING |
|8 Verify saved |Record filenames/size; open/parse JSON8/photo1; counts/IDs/owners; visually decode photos; compare originals/thumbs or hash if tools allow |PENDING |
|9 Restore preview B |Save B's current backup first; choose actualfiles; inspect counts; corrupt/unsupported copy must reject; no write until explicit action/JSON acknowledgement |PENDING |
|10 Restore B |Confirm JSON, then explicitphoto Add; JSON status excludesphotos; orphan warning if fixture; collisions skip, no overwrite |PENDING |
|11 Compare/reload B |ExactJSONIDs/snapshots/settings/journal/drafts; photoIDs/owners/original+thumbnail bytes; reload remains; repeated import adds0and skips existing |PENDING |
|12 Responsive/keyboard |320/360/390/768/1024/1440 where obtainable; long Vietnamese text; lastbutton reachable; Tab/focus/Enter/Space; mouse/touch; no horizontal overflow |PENDING |
|13 Restrictions |Optional disposable private profile/capability denied/quota test; errors preserve prior data; afterJSONsuccess+photofailure,JSON stays committed |PENDING |
|14 Pending/interrupt |Disposable B only: reload during queued save/restore; reopen/reexport/compare committed state; do not assume pairatomicity; record partial outcome |PENDING |
|15 Record result |Attach build/version,fixture size,steps,actual outcome,error and local evidence; PASS only observed cases; unperformed cases stay NOT VERIFIED |PENDING |

Numbers in step2 are synthetic fixture inputs, not nutrition/health advice.
If limited resources, start small; grow in recorded batches such as32→100photos
and256→1000sessions. Keep file sizes/peak behavior; stop when resource pressure,
tab crash or partial result appears. Never create oversized tests on live data.
8.9MB binary Node test is not a safe phone capacity limit. Near200MB total image
JSON and10MB data JSON are separate manual boundary checks, not mandatory stress
on every low-memory device.

## Platform-specific additions

| Device/browser | Additional checks | Status |
|---|---|---|
| iPhone Safari |Native Files download location vs preview/share sheet; reopen actualtwofiles; JPEG/photo picker; HEIC should reject with useful message; numeric keyboard12.5/localdecimal; datepicker; softkeyboardlastSave; notch safearea; portrait/landscape; tabbackground/reload |NOT VERIFIED |
| iPhone Chrome |Repeat common run independently; check save/share/FileProvider flows and returning to app; do not infer capability from desktopChrome or Safari result |NOT VERIFIED |
| iPad Safari/Chrome |Tablet splitscreen,768/1024 layouts, keyboard and touch,portrait/landscape,Files selection/downloads, multitasking reload |NOT VERIFIED |
| Android Chrome |Downloads/FileManager actualfiles; gallerycamera fixture pick; keyboarddecimal/date; back/navigation; background timer; rotation and viewportbar changes |NOT VERIFIED |
| Android Firefox |Repeat independently; WebLocks/storage policy,download/filepicker and mobilefocus; no inheritedChromePASS |NOT VERIFIED |
| Windows Chrome/Edge/Firefox |Normal/private profiles; Downloads/SaveAs; actualFiles; Tab/ShiftTab/Enter/Space,number/date inputlocale; two-tab stale save/restore refusal; sixwidths; Firefox checked separately |NOT VERIFIED |
| macOS Safari |Downloads/SaveAs/Files; Bloblinks/clipboardpermissions; newnormal/privateprofile; numeric/datecontrols; keyboardvisiblefocus; exactrestorebytes |NOT VERIFIED |
| macOS Chrome/Firefox |Independentcommonrun pluslocalfiles,permissions,two-tabconflicts; do notinheritWindowsresult |NOT VERIFIED |
| Linux Chromium/Chrome/Firefox |Independentcommonrun; browser/fileportal/downloadpaths,keyboard,date/decimal and quota/restrictions; verifyexactsavedfiles |NOT VERIFIED |

No real phone keyboard/touch/notch/rotation or native browser private mode was
tested by Codex. Appstorage may be cleared/evicted by browser/OS/user even after
successful reload. Keep offline copies of both backup files under user control.

## Result form (copy per run)

```text
Run date / tester:
Code checkpoint / browser asset version:
Device / OS version:
Browser product / exact version:
Normal or private profile / secure origin A and B:
WebLocks / IndexedDB / File / Blob / clipboard capabilities:
Fixture counts / JSON bytes / photo binary and file bytes:
Widths / orientation / touch / keyboard covered:
Saved JSON actual path/size/hash:
Saved photos actual path/size/hash:
Restore counts / IDs / snapshot equality:
Original and thumbnail byte/visual comparisons:
Failure injection / partial outcome / recovery:
Console errors / screenshots kept locally:
Observed PASS cases:
Observed FAIL cases (steps + expected + actual):
NOT VERIFIED cases:
Decision: verified subset / blocked setup / needs fix / manual pending
```

## Stop conditions

Stop the test immediately if valuable data, wrong origin, external upload,
unapproved permission or irreversible action is involved. Preserve evidence and
files. Stop implementation if a reliable fix needs schema/format/restoresemantic/
persistentstate/architecture changes; propose a separate contract.
Complete this manual matrix before broad compatibility claims. **STOP8B-2;
no8B-3/E1/E2/PWA/AI/cloud work automatically approved.**
