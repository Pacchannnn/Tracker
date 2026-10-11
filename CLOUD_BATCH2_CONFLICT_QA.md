# Cloud Batch 2 — Final conflict browser QA

11/10/2026 · **LOCAL SYNTHETIC BROWSER PASS; provider/native concurrency NOT VERIFIED.**
Baseline d633f17 clean main/632tests verified. Current regression634/634,syntax112,
SQL45/121. The actual UI on owned disposable8840/8841 exercised these gates:

| Browser case | Verdict | Observed result |
| --- | --- | --- |
| Keep local | PASS | Base QA Base Food/local QA LOCAL1/server QA SERVER1 displayed; explicit local proposal then sync,outbox0 |
| Use server | PASS | Explicit reviewed choice adopted QA SERVER3 and retired candidate chain |
| Unresolved reload | PASS | Conflict1/outbox1 persisted; cache opened explicitly; reauth/open restored all three versions |
| Remote changes during review | PASS | Phone changed SERVER2→SERVER3; old local choice rejected with review-changed alert |
| Edit vs delete | PASS | Server tombstone did not resurrect; copy-required alert retained local edit/review |
| Delete vs edit | PASS | Base DELETE BASE/local null/server SERVER RETAIN shown; user choice adopted server |
| Unsupported mixed chain | PASS | Live notes edit +set+Complete kept3 intents; Keep local returned compound-review-required and retained comparison |
| History correction conflict | PASS for retention | Competing notes corrections retained versions; local proposal was rejected by semantic guard and remained reviewable,then explicit server choice |
| Nested workout JSONB regression | PASS | Laptop A and final390px mobile B each logged two sets through ACK/Complete and crossed devices without false-stale/duplicate set |

Initial and final downloaded session arrays were deep-equal across devices,
including snapshots,slot/set IDs and order. `mobile-set1-ack.json` proves the first
mobile set was in accepted SQL shadow with an empty queue BEFORE the second was
logged in the same editor. Anonymous JSON diagnostics stayed unchanged.
Screenshots and synthetic files are in ignored `.local/batch2-browser-qa/`.
The unsupported cases remain fail-closed limits; this does not certify a generic
merge or create-copy workflow for every domain conflict. Real Supabase and native
independent PostgreSQL connections remain NOT VERIFIED. No8765 action/upload/push.

See current acceptance/evidence in CLOUD_BATCH2_IMPLEMENTATION.md. Older partial
browser conclusions below are historical and superseded for the executed gates.

---

# Historical: Conflict QA (10/10/2026)

10/10/2026 · **Local automated verification PASS; browser verification PARTIAL; real Supabase NOT VERIFIED.**

This report distinguishes executed automated checks from the browser scenarios observed during this session. It does not certify production concurrency, real OTP delivery or an actual iPhone.

## Evidence and scope

- The final full-suite output in `.local/cloud-batch2-tests-final.txt` reports **632/632 PASS**, zero failures/skips/cancellations, after the object-key-order, private UI-memory and deferred caller epoch corrections. Standalone syntax checks: **112/112 PASS**.
- The Batch 2 runner was executed against PostgreSQL compiled to WASM (PGlite) and isolated IndexedDB fixtures: **121 assertions PASS**. The separate Batch 1 SQL/gateway runner retained **45 assertions PASS**.
- Browser contexts at `http://127.0.0.1:8840/` and `http://127.0.0.1:8841/` used the actual Tracker UI, separate browser origins/device IDs, synthetic Auth responses and a real local HTTP gateway backed by PGlite. The contexts represent laptop/phone clients; they are not physical devices or real Supabase sessions.
- No destructive checks ran against user origin `8765`. Synthetic records were used throughout. No personal import or cloud photo transfer was performed.

Reproducible automated commands, from the repository root:

```powershell
npm ci --ignore-scripts
npm --prefix cloud ci --ignore-scripts
npm test
npm --prefix cloud run test:db
npm --prefix cloud run test:sync
```

## Conflict contract exercised

A locally committed edit retains its durable intent and reviewed base. Accepted remote records stay in server shadow. When a base revision or semantic guard no longer matches, the affected intent and its dependent chain become an unresolved conflict.

The stored conflict retains aggregate identities, base/local/remote versions, intent IDs and a review token. Its remote snapshot is refreshed by an explicit review action. The app never chooses a winner by timestamp.

- **Dùng bản server:** after a valid explicit review, retires the reviewed candidate chain and records the resolution plus archived intents. This is a user decision to adopt accepted content.
- **Giữ bản trên máy:** creates a new proposal against the reviewed remote revision when the command can be represented safely. This does not directly mark content accepted or synced.
- A changed remote baseline, changed descendant chain or stale token rejects resolution and requires a new review.
- A tombstone cannot be silently resurrected under its original identity.

## Verification matrix

| Case | Executed automated evidence | Observed browser evidence |
| --- | --- | --- |
| Two devices edit the same food | SQL two-device CAS cases; durable base/local/remote tests PASS | Laptop offline name candidate conflicted with the phone's accepted name. Review displayed all three JSON versions. Explicit local choice followed by sync reached outbox 0. |
| Explicit remote choice | Reviewed chain is archived; projection adopts remote; candidate preservation checks PASS | Not separately completed in the browser session. |
| Explicit local choice | New intent uses the reviewed current revision; common create/update descendant chains covered, PASS | Food conflict scenario completed as above. |
| Edit versus remote delete | Tombstone is retained, `copy_required` prevents resurrection, PASS | Not observed in browser. |
| Local delete versus remote edit | Local delete candidate remains available for review, SQL case PASS | Not observed in browser. |
| New edits after a conflict | Affected descendants must be included in a fresh review before abandonment, PASS | Not separately observed in browser. |
| Remote changes while review is open | Old review token/baseline cannot resolve the conflict, PASS | Not observed in browser. |
| Duplicate operation / lost acknowledgement | Frozen request/ID and validated receipt prevent duplicate side effects, PASS | Journal push committed but acknowledgement was dropped: pending 1/offline; retry reached synced/pending 0. |
| Malformed / partial acknowledgements | Cannot retire an intent, publish accepted state or advance cursor; PASS | Not observed in browser. |
| Nested workout ownership and correction | Aggregate slot/set identity, completion and candidate/source correction checked by actual SQL gateway, PASS | Workout start observed; set logging initially failed because JSONB changed object-key order. See correction below. |
| Switch account during pending callbacks | Old writes/ACK/conflict results rejected; A→B→A isolation tests PASS | A→B→A was not completed in browser after the latest changes. |
| Durable unresolved review | Conflict versions survive reopened account storage; explicit token/action tests PASS | The food conflict review UI was exercised. A separate unresolved-conflict reload walkthrough was not completed. |

Automated sources include `tests/cloud-sync.test.js`, `tests/cloud-store.test.js`, `tests/cloud-workspace.test.js`, `tests/cloud-workspace-ui.test.js` and `cloud/tests/run-sync-db.js`. Controlled transports are evidence for client logic; the SQL runner is evidence for the local database/gateway contract. Neither is proof of provider Auth or multi-connection PostgreSQL scheduling.

## Browser-discovered object-key-order bug

The browser could start a workout but could not log the next set after its own acknowledged cloud update. PostgreSQL JSONB changed object-key ordering while the editor retained its pre-acknowledgement baseline. A string-order comparison incorrectly treated equal content as stale.

The correction uses semantic comparison while retaining array order and domain identity/revision guards. Three focused regressions were added. The SQL runner additionally exercises the actual `createSessionStore` boundary with the visible pre-ACK baseline: Start → ACK → first set → ACK → second set → Complete, plus a second planning write after JSONB reordered its envelope. The **121-assertion runner PASS** includes this correction.

**The corrected workout flow was not retested through the browser UI.** Automated repair evidence must not be described as a completed browser walkthrough.

## Safe unresolved cases and remaining limitations

| Result | Current behavior | Limitation |
| --- | --- | --- |
| `copy_required` | Keeps the local candidate/conflict and explains that accepted remote content was deleted. | The sync review UI does not offer a general create-independent-copy workflow for a deleted aggregate. It will not recreate the old key automatically. |
| `compound_review_required` | Keeps the candidate chain and explains that the operation needs joint domain review. | Unsupported mixed semantic command chains cannot be generically merged by this minimal review UI. |
| `review_changed` | Rejects the stale decision and asks the user to review again. | A continuously changing remote record can require repeated review; there is no automatic winner. |
| Invalid/unknown ownership | Rejects or retains the candidate for review. | Legacy data is not guessed or normalized to satisfy cloud rules. Personal migration remains outside Batch 2. |

Common create/update/delete chains have an explicit reviewed local reproposal path. The limitations above are intentional fail-closed behavior, not evidence that every possible compound conflict has a complete UI resolution path. No automatic conflict pruning was introduced; retained versions/receipts consume local and server storage.

## Browser verification boundary

The browser diagnostic at the observed checkpoint reported `anonymousUnchanged: true`, `external: 0`, `errors: 0`; the inspected console error list was empty before the latest correction. `anonymousUnchanged` checks the anonymous JSON string; it is not a full photo-backup hash comparison.

Computer Use could not continue because its URL policy could not verify the Windows environment. No alternative browser-control route was used. Consequently final desktop/mobile screenshots, the repaired set-logging UI, the complete navigation matrix, backup downloads and browser A→B→A verification remain **NOT VERIFIED**.

Real Supabase Auth/RLS/gateway behavior, concurrent native PostgreSQL connections and physical iPhone/Safari behavior also remain **NOT VERIFIED**. Run those checks only in an explicitly approved isolated test project, with synthetic records.

## Follow-up acceptance checklist

1. Retest the corrected workout sequence through the actual browser UI and verify received completed history on the second device.
2. Exercise unresolved-conflict reload, stale review, remote choice, edit/delete and delete/edit through the UI.
3. Repeat account switches during a deliberately delayed response and with queued work; verify no previous-account payload becomes visible.
4. Complete desktop and 320/360/390 px checks, keyboard review actions, narrow-screen JSON comparison and console inspection.
5. Record real-provider and native-concurrency results separately; do not replace this local evidence with a production claim.

See [offline/recovery QA](CLOUD_BATCH2_OFFLINE_RECOVERY_QA.md), [sync contract](CLOUD_BATCH2_SYNC_CONTRACT.md) and [security report](CLOUD_BATCH2_SECURITY.md).
