# Tracker — approved local photo, recovery and import implementation

12/10/2026. Continues the same R1–R16 workflow from `a546334` on main. The user approved the photo/recovery contract for local implementation. Hosting remains **local preparation only**. This is not hosted or personal release acceptance.

## Implemented

- Account `tracker-sync` IndexedDB upgrade 1→2 adds photoAssets, photoJobs, recoveryWorkspaces and importLedgers. Metadata, original JPEG, thumbnail and intent commit atomically with the account workspace. Anonymous `tracker-photos` v1 stays separate. Opening an account never imports anonymous photos.
- SQL003 adds private manifests/assets and the photo aggregate to the common version feed. Fixed-H bootstrap/pull explicitly negotiate protocol2. JSON commands retain protocol1; old readers fail closed on photo commits. Migration001/002 and portable schema8 stay unchanged.
- Photo prepare→immutable private upload→trusted raw-byte verification→CAS finalize→exact receipt. Both JPEG hashes/MIME/sizes must match before accepted references publish. Partial upload/lost ACK retries keep operation/manifest identities. Upload collision requires downloading and validating existing bytes. No browser upsert or physical deletion/GC.
- Metadata edit, owner replacement, logical deletion and journal+exact daily-photo deletion retain history/candidates/bytes. Daily before/after sets and owner revisions are checked again at finalize. The UI never silently resolves photo conflicts: base/local/remote remain inspectable and recoverable.
- Account-specific gallery and food/recipe photo cards use the existing layout. A second device initially shows missing-byte state; explicit download verifies bytes before caching. Account switches seal facades and revoke view URLs.
- Settings offers full account recovery as **three paired files**: manifest, workspace JSON, photo1 carrier. Includes complete accepted records at captured H, drafts, outbox, conflicts, receipts, photo jobs, import ledgers and cached assets. Trusted completeness comes from all fixed-H server pages/counts and exact shadow equality, not an unchecked boolean. Local revision must remain stable.
- Restore validates scope, versions, hashes, counts, domain records and every asset before one atomic write into a new detached namespace/device identity. Existing active data is not replaced. Detached recovery is read-only/offline and findable after reload; old frozen request IDs remain for comparison and never auto-send.
- Reviewed importer retains exact selected source text/hash, target scope/device, per-record choices, stable batch requests, mappings and receipts in a durable ledger. Default choice is keep-local. Queue needs explicit confirmation; network synchronization is a separate action. Resume does not create duplicate operations. Schema8 exercise-note string→wire `{text}` mapping is explicit and lossless.
- Native Auth transport owns Storage requests; tokens remain memory-only. Gateway photo routes share verified identity, exact CORS, restricted database role and default-off preview writes. Backend runtime artifact includes the required domain modules.
- Offline operator `prepare-photos` generates a hash-bound transaction packet for unchanged SQL003 after inspecting reviewed prerequisites. It has no execute-photos path. Actual hosted Storage ownership/policy authority must be checked before execution.

## Important limits

**R11/R12 remain PARTIAL.** Schema8 supported records can be reviewed/imported; old schemas, ambiguous legacy workout ownership/raw drafts, collisions, photo-linked records, unknown fields and raw photo1 source are explicitly kept local. There is no full legacy workout/photo mapper or whole migration acceptance. Accepted ledger means selected batches received exact ACKs, not that every source item migrated. No personal import is enabled by this milestone.

Recovery caps are 10 MB workspace JSON, 200 MB decoded images, 280 MB carrier and 20 MB per JPEG. These are validation limits, not proof that maximum-sized Safari exports succeed. Source photo1 text retained in an import ledger can exceed workspace cap; export then refuses rather than truncating. Bytes for old/conflicting/tombstoned photos are retained; growth/retention and physical GC require a separate decision.

No Service Worker/PWA: open-page offline data/queue durability does not prove offline cold-load. Real Supabase/Auth/Storage/TLS/native PostgreSQL concurrency, hosting cold start, physical laptop+iPhone Safari and large-data limits remain **NOT VERIFIED**. Browser photo conflict resolution is inspection/recovery only, not keep-local/use-server automation.

## Actual local browser evidence

Owned loopback servers were verified by URL, listening address and Node command/PID before interaction. Only disposable8840/8841 were used;8765 was never read or modified. Auth and Storage URLs were intercepted locally before app import; all QA used synthetic records and a generated blue image.

1. AccountA daily image compressed/saved→local gateway prepare/upload/verify/finalize ACK. Device2 independently pulled metadata, showed missing bytes, then downloaded and rendered the image.
2. Both devices actually downloaded all three full recovery files. Node parsed them, checked scope/file hashes/counts, compared accepted identities and two original/thumbnail assets byte-for-byte. Different device IDs; matching accepted state at H1. Six actual downloaded files, not just link clicks.
3. Empty and image-bearing account recovery files were selected in actual browser file choosers, reviewed and restored into fresh detached namespaces. Active account revision/head stayed unchanged. Saved detached namespaces were listed after reload.
4. Browser importer selected a synthetic schema8 food source; kept the settings collision local, planned/confirmed one batch, manually synchronized, then resumed receipts. Ledger became accepted/1 batch/1 ACK; independent device2 displayed the imported food. Source/anonymous state remained unchanged. This is actual local HTTP/PGlite integration; the separate CLI rehearsal uses simulated receipts and is not provider proof.
5. Browser found food photos falsely conflicting against an unrelated daily photo on the same date. Fixed SQL date predicates, then restarted only the disposable in-memory gateway. Existing accountA cache was preserved and not synchronized against the restarted empty server. Fresh accountB: journal ACK→daily-photo ACK→food ACK→food-photo ACK at H4, two applied photo jobs/four assets/no conflict. Three downloaded B recovery files passed codec checks (one journal, one food, two photos, four assets).
6. Actual B detached restore kept active revision21/H4 intact. Journal deletion confirmed the exact one daily photo, received a compound receipt at H5; journal count became zero, food/card/photo remained present. Original and thumbnail bytes were retained, not physically purged.
7. Actual pause/resume completed without the concurrent-sync TypeError. Cached reload retained account queue/photo conflict while labeling needs-login; no false synced status. AccountB opened empty without A's food/photos, and A's cache was retained.
8. All six main areas loaded on the observed narrow viewport; error/warn logs empty, fixture external requests0/errors0/anonymousUnchanged=true. Requested320/360/390 overrides did **not** produce those measured widths (DOM reported611px); new exact-width responsive gates are **NOT VERIFIED**, not PASS. Earlier checkpoint mobile tests remain historical evidence. No physical-device claim.

Ignored synthetic evidence: `.local/photo-browser-byte-evidence.json`, `.local/photo-b-browser-evidence.json`, `.local/cloud-photo-browser-proof.jpg`, browser-downloaded files. These are not public assets or tracked backups. The screenshot contains only synthetic UI/diagnostics.

## Bugs corrected with regression evidence

- Whole-date/owner dependency binding and first request freezing; exact JSON owner receipts, not later same-payload revisions.
- ACK validation of IDs/order/payload/revision/commit/hash, and predecessor moving out of a daily set.
- Recovery rejects malformed accepted/tombstoned domain payloads even when rehashed; photo identity must match its envelope.
- Delayed file reads/previews/actions cannot replace newer selections; Prepare blocks while selected file bytes are still reading; restore confirmation binds the exact reviewed bundle.
- Pending photos cannot announce synced; manual pause survives token refresh; coalesced resume/sync always returns a status. Retained conflict details cannot hide pause/needs-login or remove resume.
- Food photo dates no longer bind unrelated daily sets; daily→food changes still guard the old daily set; conflict base is scoped without discarding the initial snapshot.

Independent bounded reviews are recorded in ignored `.local/final-photo-review.md`; all reported actionable findings in reviewed scope were closed. This is not exhaustive provider security certification.

## Reproduce locally

```powershell
npm test
node cloud/tests/run-db.js
node cloud/tests/run-sync-db.js
node cloud/tests/run-photo-db.js
npm run build
npm run check:artifact
node scripts/static-package.js --inventory
node scripts/gateway-package.js
node scripts/gateway-package.js --check
node scripts/gateway-package.js --inventory
node cloud/tests/serve-sync-qa.js
node cloud/tests/prepare-sync-browser.js
```

Build remains local-only when public variables are unset. Explicit allowlists: frontend57 files, backend16. Both refuse unexpected/private/linked inputs and check imports/hashes; neither publishes reports/plans/migrations/operator/tests/env/data/node_modules. No new dependency. Gateway package is server code, never a public static folder.

Offline SQL003 packet only: `node cloud/operator.js prepare-photos --review <private-reviewed-preview.json>`. Use the existing operator review contract; never substitute fixture Auth/Storage schemas on hosted Supabase. Wrapper temporarily grants the owner role TO postgres, restores grantor-specific flags, keeps runtime NOLOGIN and refuses rerun/unowned Storage. Actual permission reconciliation is mandatory.

## Remaining human actions and approval boundaries

1. Existing read-only approval is sufficient: sign in yourself to Supabase Dashboard so catalog checks can run, or run the supplied read-only preflight SQL and provide sanitized results. Public settings read proved email enabled and public signup not disabled; it did not prove SMTP/OTP/RLS. Never send passwords/OTP/database URLs/secret keys in chat.
2. Separately approve Auth changes: signup policy, six-digit Token template, two confirmed synthetic users and SMTP/provider choice. Real OTP/refresh/logout requests still require approval.
3. Separately approve reviewed SQL001/002/003, restricted LOGIN/server-secret placement with verified TLS, account/device registration and private Storage policies. Hosted ownership may require an adapted operator packet; do not force grants or DROP existing schema.
4. Hosting remains declined for now. Approve hosting/account/delivery/HTTPS URLs before deployment, then separately approve synthetic writes/photo uploads. Public config uses ignored build env; no hardcoding or secret frontend injection. Default writes stay off.
5. After provider acceptance and a complete legacy mapper/rehearsal, approve personal import by exact reviewed manifest. Current partial importer is not permission to migrate personal data.
6. Physical laptop+iPhone gates: actual OTP; independent Gym/Nutrition/Journal/photo sync; airplane/background/expiry/reauth; conflicts; three actual downloaded files and fresh detached restore; B isolation. Record OS/Safari/date/IDs/counts/hashes/error evidence. Cold-open needs a separately approved minimal offline-shell proposal if required.

Rollback: disable preview writes/restart, preserve sources/queues/candidates/bytes and downloaded recoveries; return frontend to local-only artifact. Account DB2 cannot be downgraded by opening DB1 code; preserve data and fix forward or use reviewed detached recovery. Never DROP/wipe/automatic GC to rollback. Production/cost/retention/GitHub push are separately gated.

**Verdict: approved local capabilities implemented and tested; full personal/cloud release remains PARTIAL / NOT VERIFIED.**
