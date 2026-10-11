# Cloud Batch 2 — Final offline, isolation and backup browser QA

11/10/2026 · **LOCAL SYNTHETIC BROWSER PASS. Real devices/provider NOT VERIFIED.**
Verified clean d633f17 baseline632/112/SQL45+121/48files; final634/112/45+121.

| Browser gate | Verdict | Actual result |
| --- | --- | --- |
| Logout with pending | PASS | Offline A food edit queued1; confirmed logout sealed access and retained row |
| A→B→A | PASS | B food/history empty,queue0; A food/pending1 reappeared only after explicit matching activation |
| Reload/cache/reauth | PASS | Conflict and candidate retained; explicit cache opening disabled sync; matching OTP/open with confirmation restored remote access |
| Stale response after switch | PASS | Held A gateway response released after B opened; B projection unchanged,A queue1 retained |
| Expiry during delayed sync | PASS |12-second identity,refresh delayed beyond deadline; expired/sealed; late response did not unlock; durable A queue1 |
| Locked queue label | PASS after fix | Unavailable queue now unknown,not0; two RED→GREEN regressions and actual repeated expiry walkthrough |
| Anonymous readonly views | PASS |48 responsive view cases followed by actual re-export: exact JSON/planning and photo metadata/bytes |
| Account readonly views | PASS |8 views with sync paused; full scoped IDB rows including history/outbox/conflicts/cursor/receipts and anonymous source exact before/after |
| Paired backup restore | PASS | Source8844 JSON +one valid uploaded/compressed synthetic photo downloaded; target8846 preview/confirmation→JSON→add1photo→reload→download both; exact data/photo metadata/bytes |
| Account projection export | PASS | Actual file matches current selected projection; UI says projection-only,no token/outbox/photos; account restore/photos remain unavailable |
| Responsive/keyboard | PASS |12 views at measured1280/320/360/390,48 cases;3 extra Cloud Settings widths; Tab focus2.4px solid and Enter navigation |
| Console | PASS in observed scope | Captured error/warn arrays empty in all four origins; fixture external/errors0 |

The restore target8846 was freshly created for this task and contained no user
records. The existing8765 tab was never accessed. No personal/cloud photo upload,
provider creation, schema/backup migration or GitHub push occurred. Photo restore
remains separate from JSON; this test does not make two-file restore atomic.
Evidence: ignored `.local/batch2-browser-qa/`; integrity checks compare complete
data and decoded-content-preserving photo base64/metadata arrays, excluding only
the enclosing export timestamp. Account before/after comparison includes full rows.

Two additional download-event waits timed out; actual file existence/content was
checked, and the documented download API completed later account evidence files.
Do not infer downloaded success from the UI status alone. Clipboard fallback was
not verified. Invalid synthetic image rejection was handled; a valid PNG was used
for the successful backup roundtrip. Fixture offline is transport interruption,
not airplane mode/cold-launch/OS power-loss. PGlite is single-connection.

Real Supabase,physical iPhone/Safari,native PostgreSQL concurrency,quota/eviction,
large histories/photos and cold-start offline remain NOT VERIFIED. Existing
plaintext-cache and projection-only backup limits remain. STOP after Batch2.
The historical incomplete gates below were superseded by this executed run.

---

# Historical: Offline and Recovery QA (10/10/2026)

10/10/2026 · **Local automated verification PASS; browser verification PARTIAL; real Supabase and real devices NOT VERIFIED.**

## What was verified

Account workspaces use a separate `tracker-sync` IndexedDB database. The existing anonymous `vshape-tracker` JSON, photo database v1 and portable backup formats remain separate. One account-row transaction commits projection, intent/outbox and ownership/revision metadata together.

The scope contains environment, project and verified account UID; email does not choose a workspace. An explicit device-cache opening is local access to an existing cache, not server authentication. Cached access remains usable without a valid token; remote sync remains disabled until the matching verified account is explicitly activated.

The final full-suite run in `.local/cloud-batch2-tests-final.txt` reports **632/632 tests PASS**, zero failures/skips/cancellations, after all semantic object-key-order and deferred workspace epoch corrections. Standalone syntax: **112/112 PASS**. The local PostgreSQL WASM/isolated-IDB runner passed **121 assertions**; the separate Batch 1 runner retained **45 assertions PASS**.

## Executed automated recovery matrix

| Scenario | Evidence and result |
| --- | --- |
| Atomic edit + outbox | Validation failure, thrown mutation and simulated quota error abort the entire IDB transaction. Prior projection and outbox remain together; PASS. |
| Reload/crash-style recovery | Reopening with the same isolated IDB factory retains stable device identity, pending intents, frozen requests, conflicts and cursors; PASS. This simulates a client restart, not an OS crash/power-loss test. |
| Offline edits | Durable queue and projection survive reload, then reconnect in order; PASS. |
| Interrupted bootstrap | Fixed head/cursor and staged pages survive reload; only a complete validated snapshot is published; PASS. |
| Lost push acknowledgement | Exact operation/request is retained; validated receipt or complete pull group retires it once; PASS. |
| Partial/malformed pull or ACK | No partial accepted projection or cursor advancement; candidate remains available; PASS. |
| New local edit during an older ACK | Only the older intent is retired; the newer queued candidate remains; PASS. |
| Pause/resume | Cancelled attempt cannot write; resume waits for that attempt and starts a fresh guarded sync; PASS. |
| Auth expiry/logout | Workspace seals, pending records remain in their account row, stale callbacks cannot write; PASS. Seal is not encryption at rest. |
| A→B→A / project / environment separation | Isolated rows retain each queue; switching does not redirect operations to another scope; PASS. |
| Multi-tab writers | Serialized IDB latest-row commits retain independent edits/intents and reject stale expected revisions; PASS. This does not prove PostgreSQL multi-connection concurrency. |
| Rejected server command | Local intent/candidate remains reviewable instead of being discarded; PASS. |
| Tombstone propagation | Accepted tombstone remains in shadow while its definition disappears from projection; PASS. |
| Delayed anonymous photo work after switching | Synchronous epoch guards inside photo IDB request/cursor callbacks abort stale writes, including already queued deletes/additions; focused rollback tests PASS. |
| Anonymous import preparation | Explicit preview reads source and photo metadata; Cancel performs no import/storage writes; unknown fields and legacy ownership remain review items; PASS. |

Sources: `tests/cloud-store.test.js`, `tests/cloud-sync.test.js`, `tests/cloud-workspace.test.js`, `tests/photo-workspace-guard.test.js`, `tests/nutrition-photo-workspace-guard.test.js`, `tests/cloud-import-preview.test.js`, `tests/cloud-workspace-ui.test.js`, and `cloud/tests/run-sync-db.js`.

## Observed actual-app browser sequence

Disposable origins `8840` and `8841` represented laptop/phone workspaces with separate device identities. The real app called local HTTP gateways on `8842`/`8843`, backed by a disposable in-memory PGlite database. Auth responses and network interruption controls were synthetic. No provider email was sent.

1. Laptop created a food; the phone bootstrapped and received it.
2. Phone switched to the fixture's offline transport, edited its name and saved: outbox **1**.
3. Phone reloaded while offline and explicitly reopened cached account A. The UI required login and disabled Sync.
4. Another offline calorie edit was saved: outbox **2**.
5. Phone reauthenticated as A, explicitly confirmed opening the account and synchronized. Laptop received the changed name and **110 calories**.
6. A journal push deliberately lost its acknowledgement after the server commit. The UI showed offline/pending **1**. Explicit retry reached synced/pending **0**.
7. The import preview showed **11 candidates, 1 duplicate, 3 ambiguities, 1 photo and unknown photo bytes**. Cancel did not change the anonymous JSON source.

The fixture's offline switch blocks sync transport. This establishes interruption, cache and outbox behavior; it is not an airplane-mode, browser process eviction, physical phone or cold-launch test.

At the observed diagnostic checkpoint: anonymous JSON unchanged, external request counter 0, error counter 0; the inspected browser console error list was empty before the final workout fix. No screenshot/full desktop-mobile certification is inferred from these counters.

## Browser bug and uncompleted retest

The UI workout Start action succeeded, but subsequent set logging exposed a false-stale comparison after JSONB reordered object keys. Semantic comparison was corrected, with three focused regressions and the real SessionStore/SQL sequence included in the **121 PASS** runner. The repaired sequence has **not been rerun through the browser UI**.

Computer Use stopped when its URL policy could not verify the Windows environment. No further UI actions or alternate automation route were used. Final responsive/keyboard checks, full read-only navigation, A→B→A browser switching, backup download/restore walkthroughs, screenshots and the final console check remain **NOT VERIFIED**.

## Meaning of status and recovery actions

- **Chỉ trên thiết bị:** anonymous local-only workspace.
- **Chờ đồng bộ:** durable work remains pending. Local save is not server acceptance.
- **Đã đồng bộ:** queue is empty and the engine's accepted-state conditions are satisfied. Missing/unknown queue count cannot produce this label.
- **Mất kết nối / Cần đăng nhập lại / Đồng bộ thất bại:** keep work in its existing account scope; retry or reauthenticate rather than reset.
- **Có xung đột:** keep both versions until explicit review. Copy-required and unsupported compound cases remain retained, not silently merged.
- **Tải lại dữ liệu mới nhất:** a separate explicit action, with a fresh confirmation when needed. Ordinary sync notification preserves an editor's visible input; it does not silently replace it.

After expiry or reload, explicitly open the existing cache for offline local access. After matching reauthentication, explicitly activate the account before sync. Never copy account data into the anonymous key as a recovery shortcut. Keep the original browser profile and its IndexedDB if work is still pending.

## Reproduction commands

From the repository root:

```powershell
npm ci --ignore-scripts
npm --prefix cloud ci --ignore-scripts
npm test
npm --prefix cloud run test:db
npm --prefix cloud run test:sync
npm run build
npm run check:artifact
```

For approved local synthetic browser QA only, use separate terminals:

```powershell
node cloud/tests/serve-sync-qa.js
node cloud/tests/prepare-sync-browser.js
```

These helper servers use disposable synthetic data and isolated ports. Their overridden Auth/configuration and `qa.js` files stay outside the public runtime artifact. Do not serve the repository root, use user origin `8765`, add real credentials to these fixtures or treat synthetic Auth as authorization for a real provider.

## Remaining limits and real-device checklist

No Service Worker/PWA was added. Cached account data can be read when the loaded app is available, but guaranteed cold-start offline shell availability is **not promised**. Browser eviction, private mode, storage quota and OS termination can still affect local persistence. Device-local sealing is not encryption, and this batch is not end-to-end encryption.

The following checks require a fresh approved session with synthetic data:

1. Retest final app on desktop and 320/360/390 px; include keyboard, focus, labels and no horizontal overflow.
2. On actual iPhone/Safari and laptop browsers: airplane-mode reload versus cold launch; tab suspension, screen lock, browser restart and pending outbox recovery.
3. Logout with pending work; A→B→A; expire/revoke a token during delayed push/pull; verify correct scope before/after retry.
4. Complete read-only navigation and compare account/anonymous storage before and after; no unintended mutations from views.
5. Download both synthetic JSON/photo backups, verify actual saved files and integrity; restore only on a disposable origin with explicit confirmation. Account import and cloud photo transfer remain outside Batch 2.
6. Exercise large synthetic record sets and quota failures; measure performance and retention growth without using personal data.
7. Run actual native PostgreSQL connections and, only after explicit project/region/credentials/OTP/cost approval, real Supabase Auth/RLS/gateway checks. Record those outcomes separately.

**STOP after Batch 2.** This report does not approve Batch 3 personal-data migration, cloud photo transfer, production deployment or a GitHub push.

See [conflict QA](CLOUD_BATCH2_CONFLICT_QA.md), [setup and rollback](CLOUD_BATCH2_SETUP_AND_ROLLBACK.md) and [security report](CLOUD_BATCH2_SECURITY.md).
