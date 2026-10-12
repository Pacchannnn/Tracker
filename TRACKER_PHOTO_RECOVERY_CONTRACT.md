# Tracker — photo / full recovery / import contract for review

11/10/2026 · **APPROVED FOR LOCAL IMPLEMENTATION AND TESTS.** User approved this contract in the current thread. R8–R12 remain part of the same workflow. Hosted SQL/Storage apply, uploads, deployment, retention/GC and personal import remain separately gated; no remote migration occurred.

## Invariants

Portable schema8, anonymous `tracker-photos` v1 and photo backup1 stay readable and unchanged. Existing account DB v1 JSON sync is retained. No anonymous photo/upload on login; no new UI redesign/dependency. Whole workout/recipe snapshots and exact legacy IDs/order/macros remain intact. No timestamp winner, medical inference, personal import or physical GC.

## Proposed minimal additions (decisions requiring approval)

| Decision | Recommended contract | Alternative / cost |
|---|---|---|
| Account bytes ownership | Add `photoAssets` and `photoJobs` stores to account `tracker-sync` DB **v2**, keyed by exact scope plus opaque asset ID; write metadata candidate, original+thumb Blobs and durable intent in one transaction with workspace | Separate DB cannot provide the required atomic data+bytes+intent save |
| Cloud photo aggregate | Add SQL003 with immutable upload manifests/assets and `photo` aggregate/version-feed support; negotiate protocol **v2** for photo operations while keeping JSON v1 clients on their existing routes | Separate photo cursor increases consistency complexity; old clients must explicitly stop on unsupported photo commits rather than silently skip them |
| Storage identity | Private `tracker-preview-photos` bucket; UUID asset paths under verified project/environment/UID + manifestID. Preserve logical legacy photo IDs as text in DB metadata; never coerce them into object paths | Public buckets, mutable/upsert paths and cross-account dedup rejected |
| Retention | No automatic pruning/deletion/GC in preview; manifest abandonment is logical only and rejects later finalize | Storage/version growth must be measured; later cleanup/retention requires separately reviewed policy |
| Recovery format | New **tracker-account-recovery v1**, three paired files: manifest, workspace JSON and existing photo-backup1 bytes; bounded pilot described below | Multipart/ZIP/streaming can support larger libraries later, but changes transport/caps and requires measurement/review |
| Restore ownership | Restore into a **detached local recovery workspace**, new installation/device ID, immutable original outbox/request identities retained for inspection. No network resume before explicit same-account reconciliation | Cloning original device ID or sending restored intents as a new device would misrepresent ownership/fingerprints |
| Legacy import | Reviewed durable ledger in account DB v2, exact source hash/scope/device, immutable operation IDs and receipts; explicit per-aggregate mapping/collision decisions | Automatic remap/normalize or dataset replace cannot preserve ambiguous history safely |

The decisions above are approved for local code/tests. Schema8 payload does not imply account IDB/protocol remain v1 after a photo implementation. Additive migration tests are required before integration; actual hosted apply remains unapproved.

## Photo prepare / upload / finalize

1. Local Save compresses using current policy once; original means the **already compressed JPEG stored by Tracker**, not the source camera file. SHA256 and byte counts for original+thumbnail are computed before the synchronous IDB write transaction. Quota/epoch/fault abort leaves old record and editor intact.
2. Gateway verifies fixed-project Auth UID, account/device status, exact scope, base revisions and reviewed owner/photo set; creates immutable manifest paths. Server grants narrowly scoped insert capability, not browser UPDATE/DELETE. All writes start disabled and require reviewed synthetic activation.
3. Browser retries original/thumbnail separately at immutable paths. Already-existing object must be verified against expected bytes, never overwritten. Partial upload is staged, not published.
4. Trusted verifier reads actual object bytes, MIME/JPEG envelope/size and SHA256 for **both** assets. Request digest is not sufficient. Fetch/verification must be bounded; limits/CPU/egress require hosted measurement.
5. Finalize locks manifest and account head, checks manifest lease/verified hashes plus CAS/read predicates, commits photo metadata/version and exact receipt. Retry/lost ACK returns same receipt. Stale owner or changed daily-photo set retains local candidates and requires review.
6. Thumbnail/original download verifies bytes before caching by scope/hash; missing/expired/offline state is explicit. Account switch clears URL handles and seals requests. Logout does not delete persisted bytes.

PG and Storage are not one transaction. Unpublished staged objects may remain; no promise of immediate erasure. Any future cleanup must first claim manifest closed-for-finalize under lock, preserve references from history/outbox/conflicts/import/recovery, and require approval. No cleanup races accepted finalize.

## Independent account recovery pilot

Proposed cap: workspace JSON≤10,000,000 UTF8 bytes, photo1≤200,000,000 decoded bytes/280,000,000 file bytes, each original/thumbnail≤20,000,000 bytes. These are **reused bounds, not measured iPhone guarantees**. Oversize explicitly blocks full export; no truncation/subset labeled complete. Zero photos still produces an explicit empty photo1 file. No multipart support promised in this pilot.

Manifest fields: `format`, `version`, exact scope, export UUID, captured server head H, captured localRevision, file names/byte sizes/SHA256, per-kind accepted record counts, draft/outbox/conflict/receipt counts, photo ID/hash/byte inventory and completeness. Metadata is private too. Files and names do not contain emails/tokens.

Workspace file includes accepted records at H, all device-owned envelopes, local selected-live/editor state that is actually persisted, pending immutable outbox requests/dependencies, all base/local/remote/archived conflict candidates and receipt knowledge. Derived UI summaries are not authoritative records. Auth/API/DB credentials and memory-only session state are excluded; an arbitrary visible unsaved input cannot be claimed backed up until explicitly saved.

Capture one local IDB snapshot; fetch complete accepted state/assets at H using immutable versions; recheck localRevision before sealing manifest. Change during capture means retry/explicit incomplete, not a mixed head. Pin/version retention contract must support this before claiming reliable hosted export. Download gate requires actual files parsed and hashes checked; producing URLs is only preparation.

Restore validates all files/versions/counts/hashes/scope and referenced bytes **before** mutation. Stage into a fresh detached namespace, then atomically activate it in account IDB. Fault/quota/corruption leaves current workspace unchanged. Reject wrong UID/project; do not retarget queues. Opening detached recovery stays offline. To resume old intent identities, explicitly reauthenticate same account and reconcile original device registration/receipt/candidate ownership; sending from a new device needs a reviewed import, not automatic request rewriting.

Portable JSON8/photo1 remain a separate content export/import option. A projection-only JSON remains labeled incomplete for full sync recovery.

## Legacy import ledger

Inputs are user-selected files after explicit consent, not reads from origin8765. Ledger records immutable source hashes and reviewed target scope, source inventory, mapping decisions, import ID, per-batch request fingerprint, dependencies, accepted receipts and unresolved items. Journal date collisions, legacy slot ambiguity, raw planning/history candidates, tombstones and orphan photos block affected scope until reviewed; unknown fields are preserved or rejected explicitly, never normalized silently.

Each supported aggregate is atomic; the whole dataset is not. Import retries same accepted operation IDs; interrupted photo/finalize resumes from ledger. Source stores/files never overwritten. Rollback means original local-only or detached recovery; cloud deletion requires a separate reviewed CAS plan and cannot remove data changed elsewhere.

## Required acceptance gates before real personal use

- v1→v2 IDB additive upgrade with exact v1 data, queues/conflicts/settings retained; interrupted/blocking upgrade and quota rollback.
- Private Storage A→B denial, immutable upload policy, actual hashes/size/MIME; unauthorized/different project/device writes denied.
- Partial original/thumb, lost finalize ACK, collision, expiry, owner removed, replacement/delete/stale daily photo set, account switch URL sealing.
- Backup actual downloads + source/second-device/restore exact records/order/snapshots/bytes, future/corrupt/wrong-scope rejection, quota and interrupted restore.
- Synthetic old schemas/custom plans/food snapshots/orphans/multiple drafts/outbox/conflicts; repeated interrupted import gives no duplicates and unchanged original.
- Native SQL/provider/iPhone evidence explicitly separate from PGlite/fake-IDB/browser viewport evidence. No full release claim until required real gates pass.

## Offline shell decision

No Service Worker today. Existing open-page offline editing and durable queue do not prove cold-open offline. First measure on hosted devices. If cold-open is required, propose a separate minimal SW asset-only cache/version rollback contract; never cache OTP, account payloads, signed URLs or Auth responses in public HTTP caches. PWA/SW remains unapproved.
