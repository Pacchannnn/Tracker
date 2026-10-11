# Cloud Batch2 — approved implementation contract

11/10/2026 · LOCAL SYNTHETIC ACCEPTANCE PASS; real provider/device gates NOT VERIFIED.
Final browser gates and634/112/SQL45+121 evidence: CLOUD_BATCH2_IMPLEMENTATION.md.
The implementation contract below remains active. The unavailable locked/opening
workspace queue count is now null/unknown rather than0;local mode still reports0.
No persistent schema, payload, backup or scope contract changed.
User authorizes complete local implementation; no
provider provisioning, personal migration, photos upload or production deploy.

## Design and alternatives

Retain approved aggregate CAS gateway. Reject whole-JSON LWW and split
localStorage/outbox writes. Use a new tracker-sync IndexedDB v1 with one scoped
workspace row containing projection/shadow/outbox/conflicts/cursor, and installation
metadata. One readwrite transaction atomically replaces the row; whole-row storage
is local transaction organization, not whole-JSON network synchronization.
This avoids premature many-store joins while preserving per-record wire CAS.
Portable payload remains schema8, anonymous localStorage/photoDB1 untouched.

Scope is environment/project/verified UID; device ID is stable per installation,
not an authority. Guarded epoch leases authorize access; seal aborts active
transactions and cancels network callbacks. Email never chooses a workspace.
Independent account rows and monotonic localRevision protect multi-tab writers.

Local mutation validates the latest schema8 projection and stores aggregate
changes with stable operation IDs atomically. Wire request becomes immutable
before first send; unsent successors bind the acknowledged server base only when
ready. Client-local dependencies are never sent as unsupported gateway dependencies.
No operation is redirected to a different account, project or environment.

Pull maintains acknowledged shadow, then overlays unresolved local operations.
Acknowledgements update shadow and remove only their exact outbox intent;
newer local input survives. Fixed-H bootstrap pages accumulate durably and publish
atomically only after all pages; complete feed groups commit together with cursor.
Failed/partial/malformed responses advance nothing. Retry retains exact request/ID.

Conflicts retain base/local/remote plus affected operation. Review accepts remote
or explicitly re-proposes local content on the current remote revision; no timestamp
winner. Compound commands and dependent queued edits remain reviewable together.
Unknown/invalid ownership fails closed, without normalization.

Shared live workouts remain separate from selected device draft; completed
history and device history candidates stay separate. Planning envelope is keyed
by device. Photos unavailable in account mode until Batch3; anonymous photos stay
available in local mode. Anonymous import UI is preview/Cancel only.

## Execution milestones

1. Verify clean1487cf3 /522tests /91syntax /42artifact; review architecture.
2. Account store + record projection + atomic mutation/outbox tests (TDD).
3. Sync engine + durable conflict/retry/bootstrap tests (TDD).
4. Auth-bound workspace manager, actual app read/write integration, minimal status,
   conflict and import-preparation UI; preserve local UI and photo DB.
5. Real local SQL gateway two-device integration; disposable browser/mobile QA.
6. All522 regressions, syntax/artifact/privacy/diff review; six reports, checkpoint.

Interfaces: store.open/read(scope), store.transact(scope,expectedRevision,fn),
store.commit(scope,change,expectedData), store.seal(); sync engine sync/pause/
resume/status; transport.call(route,body,{signal}). Final details updated from
tested implementation. No browser credentials in backups/logs; provider config
and real mutations remain disabled until separately approved.

STOP after Batch2. No native concurrency/Supabase/iPhone proof inferred from
single-connection PostgreSQL WASM or synthetic device contexts.

## Implemented contract refinements and release gate

- IndexedDB database/store version1, portable projection schema8. Local scope
  keys use verified identity originally used to create the row. An existing cache
  may be opened explicitly without current JWT for device access only; needs-login
  blocks gateway calls. This is not authentication or encryption of cached data.
- One row holds data/shadow/outbox/conflicts/receipts/staging/cursor/selectedLiveId.
  Transactions guard latest revision and current epoch. Wire remains aggregate CAS.
- Migration002 requires recordCount on complete feed groups and identical fixed-H
  snapshotRecordCount on every bootstrap page; missing/mismatched counts fail closed.
- JSONB object keys are unordered. Domain equality canonicalizes key order for
  comparison without changing values/array order/revisions/identities. Immutable
  planner requestKey can restore representation only after exact value equality.
- Private transient editors, batch selections, recipe cooking/duplicate/filter,
  workout/builder/planner state and journal filters reset on workspace changes.
  Caller-side epoch checks prevent old await results accepting into the new scope.
  Saved drafts and outbox remain durable in their own rows. Unsaved input fields
  are not a portable backup or guaranteed recovery; transition UI explains closing.
- Shared live records require explicit selection and cannot replace a selected
  draft implicitly. Selection creates no mutation outbox. Read-only projection/
  status/history access does not commit account records.
- Reviewed local conflict resolution creates a new proposal/ID, not acceptance.
  Tombstoned content returns copy_required; mixed semantic commands may return
  compound_review_required. Both versions and archived resolved intents remain.
- Account projection JSON backup excludes outbox, conflict archives, tokens and
  unselected remote/device drafts. Retain tracker-sync during rollback/recovery.
- Current runtime stays disabled. The ordinary gateway is read-only; synthetic
  write-enabled fixtures are test-only and not in dist. Real provider/native
  concurrency and the outstanding final browser retest are not signed off.

Final evidence/counts: CLOUD_BATCH2_IMPLEMENTATION.md and
V4_IMPLEMENTATION_REPORT.md. No next phase is automatically authorized.
