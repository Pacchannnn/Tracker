# Tracker — Cloud Batch 2: setup, synthetic QA and rollback

11/10/2026 · Local synthetic acceptance PASS. Provider setup, credentials, deployment and real-data
upload require separate explicit approval.

Final verified results:634/634 tests,112/112 standalone syntax +two generated
fixtures,SQL45/121,48public files/766401bytes. Full browser evidence and remaining
provider/device limits: CLOUD_BATCH2_IMPLEMENTATION.md. Older integration counts
below describe the prior checkpoint;commands and recovery boundaries remain active.

## Repeat the final disposable browser QA

1. Build,then start both existing synthetic scripts in separate terminals. Check
   listeners belong to these exact scripts. Open ONLY8840/8841/8844/8846;verify URL.
2. On8840/8841 with the synthetic marker,use QA Reset synthetic account cache BEFORE
   login when starting a fresh SQL harness. It refuses unknown scopes/missing marker,
   keeps installation metadata and anonymous data/photos. Never use it with personal data.
3. Settings→email a@example.invalid→Gửi mã OTP→confirm transition if asked→123456→
   Xác nhận→Mở dữ liệu tài khoản→Đồng bộ ngay. Fixture OTP does not contact a provider.
4. Gym→Start→save set1→verify accepted shadow/outbox0→save set2→Complete. On the other
   origin login the same account,pull,open History and compare downloaded snapshots/IDs.
5. QA Offline ON→edit/save food on laptop;edit/sync same food on phone→Offline OFF/
   sync laptop→review all3 versions. Exercise local/server choices,reload,stale review,
   edit/delete and delete/edit. For compound review:shared live workout accepted first;
   queue local notes+set+Complete offline;phone edits live;reconnect and Keep local.
6. Offline A edit→confirmed logout→B login/open→check empty B→A login/open→candidate
   retained. Hold next gateway response before A sync;switch B;release and verify isolation.
7. Reload fixture to clear the previous short-session mode. Enable Short session12s,
   login A/open,hold gateway response and sync;wait for actual expired/sealed UI,
   release response and verify retained queue. Reauthentication needs explicit opening.
8.8844/8846 are unmodified packaged anonymous apps. Use synthetic JSON/valid image,
   download both backup files;fresh8846 preview/confirm JSON,then add photo,reload and
   re-export to compare. If8846 already contains data,export/review it first;do not reset blindly.
9. Test actual viewport widths,not only requested overrides. Mobile navigation uses
   different labels;Home is TRACKER header. Compare readonly exports/rows before/after.
   Pause account sync to exclude legitimate foreground network writes during comparison.
10. Capture console/screenshots and actual files. A click/prepared link is not proof
    of download. If an event wait fails,inspect state/files;the documented download API
    can save the visible blob link. Stop automation if URL cannot be established.

Origin8846 is an additional disposable anonymous paired-restore target. It has no
fixture Auth/config overrides. Reset temporary viewport overrides and stop only
owned QA processes after testing. No real provider or personal import is authorized.

## 1. Reproduce local checks

From PowerShell:

```powershell
cd "C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym"
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix cloud ci --ignore-scripts --no-audit --no-fund
npm test
node cloud/tests/run-db.js
node cloud/tests/run-sync-db.js
npm run build
npm run check:artifact
```

Confirmed integration evidence: Batch 1 SQL runner 45 assertions PASS; Batch 2 real
PostgreSQL WASM/two isolated IndexedDB runner 121 assertions PASS, including the
original SQL/RLS script after migrations 001+002. Final regression: 632/632 tests,
112/112 syntax; artifact 48 files / 766,240 bytes. Browser QA remains partial,
as detailed in the release reports. PGlite has a single connection;
native concurrent PostgreSQL/Supabase behavior is not established by these checks.

The Auth adapter remains REST-based; no Supabase Auth SDK was added or upgraded.
Backend `pg`, test PGlite and test fake-indexeddb are development/server tooling,
not public artifact runtime dependencies. Never serve the repository root as the
deployment artifact; build the explicit runtime allowlist into `dist`.

## 2. Normal local Tracker

The shipped `js/cloud-config.js` stays disabled with empty URLs/key. Normal local
Tracker works without login. Starting the ordinary backend does not enable sync
writes: it retains Batch 1's protected configuration requirements, loopback8832,
no enabled browser CORS origin and `allowWrites:false`.

No paid service, Supabase project, Vercel connection, cloud provisioning, secret
injection or upload is necessary to run the tests above.

## 3. Disposable browser QA

Use separate terminals after `npm run build`:

```powershell
# Terminal 1: fresh in-memory SQL database and loopback HTTP gateways
node cloud/tests/serve-sync-qa.js
```

```powershell
# Terminal 2: isolated copies of runtime assets plus synthetic fixture controls
node cloud/tests/prepare-sync-browser.js
```

| Origin/port | Purpose |
| --- | --- |
| `http://127.0.0.1:8840/` | Synthetic device333…; fixture Auth, actual gateway 8842 |
| `http://127.0.0.1:8841/` | Synthetic device444…; fixture Auth, actual gateway 8843 |
| `http://127.0.0.1:8844/` | Unmodified packaged app with Cloud disabled |
| `http://127.0.0.1:8845/counts` | Synthetic aggregate counters only |

Gateway 8842 allows only browser origin 8840; gateway 8843 allows only8841. Both use
the same disposable PostgreSQL WASM database under `tracker_gateway`, scope
`preview / syntheticqa`. Synthetic identities are UID111… and222…; fixtures
substitute Auth responses and accept only known synthetic bearers. The harness
does not authenticate with a real provider. Its Auth-looking URLs are intercepted
locally; other external requests are refused by the fixture.

Use only fixture emails `a@example.invalid` / `b@example.invalid`, synthetic foods,
workouts and notes. Never enter personal records or provider credentials. The
fixture seeds synthetic anonymous data/photos into these disposable origins;
its read-only diagnostics can show whether anonymous data stayed unchanged.
Refresh, offline and lost-ACK controls are test instrumentation outside `dist`.

**Do not use origin 8765 for these tests.** Do not run restore/reset against an
existing user origin. These fixture scripts are excluded from deployment.

Enter `stop` followed by Enter in the gateway terminal, or use Ctrl+C, to stop the
owned gateway harness. Input in the fixture terminal stops its owned static
servers. Stopping the SQL harness discards its intentionally disposable in-memory
database. Retain the terminals/process session IDs while QA is active; do not kill
unrelated services to reclaim ports. If a required port is occupied, stop and
identify the owned fixture rather than modifying the user's server.

## 4. Mandatory migration order before a future approved provider test

1. Obtain approval for an isolated test project, owner, region, synthetic accounts,
   email delivery, private gateway hosting and credentials handling. This batch
   does not supply approval to perform those external actions.
2. Provider-managed `auth.users` must already exist. Never run the synthetic
   `CREATE SCHEMA auth`/fixture bootstrap on Supabase.
3. Review and apply `cloud/migrations/001_foundation.sql` once as migration admin.
   If it already exists, verify its recorded version/checksum; do not drop it.
4. Apply `cloud/migrations/002_sync_counts.sql`. Batch 2 clients require complete
   group/snapshot count fields; migration 001 alone is insufficient. This forward
   migration replaces two private read helpers, preserving their ownership,
   empty search path, restricted grants and RLS. It does not rewrite records.
5. Verify private schema is absent from PostgREST exposed schemas, all six tables
   FORCE RLS, browser roles lack private DML/helper access, helper owner NOLOGIN/
   NOBYPASSRLS and restricted runtime role rights remain correct.
6. Verify actual native two-connection races, provider JWT/Auth lifecycle and
   gateway TLS/CORS before enabling any real client writer.

### Exact account/device provisioning contract

An approved operator registers a verified Auth UID and installation device UUID
with this private function signature:

```sql
tracker_sync.register_account_device(
  p_uid uuid,
  p_env text,
  p_project text,
  p_device uuid
) RETURNS jsonb
```

Backend/operator parameterized invocation:

```sql
SELECT tracker_sync.register_account_device(
  $1::uuid, $2::text, $3::text, $4::uuid
);
```

| Bound parameter | Required value |
| --- | --- |
| `$1` | Verified `auth.users.id`; never email or arbitrary frontend UID |
| `$2` | Reviewed `test`, `preview` or `production` scope |
| `$3` | Exact reviewed project ID matching gateway/client config |
| `$4` | Installation device UUID retained in local metadata |

Placeholders are passed through the driver, not pasted as an executable SQL
editor statement without binding. There is no public registration endpoint or
automatic device provisioning in the browser. The helper checks existing Auth
ownership via foreign key and rejects disabled account/device conditions.

Provision a separate server-only LOGIN NOBYPASSRLS runtime role with only approved
`tracker_gateway` membership. Do not use the migration administrator, postgres,
service_role or helper-owner credentials for runtime. Keep credentials in an
approved server secret facility; never chat, tracked files, frontend or backups.
Existing startup requires verified database TLS and rejects privileged roles.
Provider pooler/custom-role compatibility is still unverified.

## 5. Activation remains a separate decision

Future reviewed frontend config needs matching approved HTTPS project origin,
publishable public key, environment and gateway origin. Privileged/database/SMTP
keys never belong in frontend configuration. The current packager deliberately
rejects production Auth activation until its review gate is explicitly changed.
Current ordinary server writer is disabled; synthetic fixture configuration does
not authorize enabling it or deploying the harness.

Decide provider permissions, costs, auth email behavior, retention, gateway
hosting and real cross-device acceptance tests before activation. No personal
anonymous migration or photo upload is approved as part of synthetic testing.

## 6. Recovery and rollback without deleting history

1. Pause sync, preserve the current origin/profile, review pending count/conflicts
   and export the active schema 8 JSON projection when available. Store this file
   privately outside Git. Confirm the file actually exists before relying on it.
2. For rollback, seal the account workspace to abort active transactions and
   cancel callbacks. Disable networking/activation gates. Keep the complete
   `tracker-sync` database, installation metadata, outbox, receipts, conflicts,
   shadow, staged snapshot and cursor intact.
3. Return explicitly to the anonymous local workspace. Never copy an account
   projection into `vshape-tracker`, silently merge accounts, retarget an outbox
   or reuse a queue against another environment/project/UID.
4. Reopen retained cached rows explicitly for device-local recovery/export.
   Cached access is not Supabase Auth or encryption. It reports Needs login;
   sync requires verified matching identity. Logout/expiry must not automatically
   unlock a cached row or start a different account's worker.
5. Re-enable only a compatible reviewed client after the cause is fixed. Retry
   retained operation IDs/requests or use explicit conflict review. Never invent
   successful receipts, reset cursors to hide malformed responses or wipe a queue
   to obtain a Synced label.
6. Server rollback is a reviewed forward fix or operator backup recovery. Do not
   drop `tracker_sync`, erase tombstones/versions/receipts or downgrade payloads.
   Old Batch 1 readers tolerate additive count fields, but Batch 2 must keep002.

Account JSON backup is a projection export, not an outbox/conflict/server-version
backup; it does not include unselected remote live records or other-device
planning/candidates. Preserve IndexedDB for complete pending-work recovery.
Browser eviction can lose unpublished local work; it is not guaranteed durable
storage. Account restore/import is unavailable in this batch. Anonymous import
UI is preview/Cancel only. Account photos remain unavailable; anonymous photo
storage and existing separate photo backups remain untouched.

Do not use Clear site data, delete private files or remove browser storage as a
rollback method. Full encrypted workspace backup, provider incident recovery,
photo cloud support and retention policy require separate approved work.
