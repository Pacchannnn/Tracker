# Tracker — Cloud Batch 1: setup / migration / rollback

08/10/2026 · Local setup ready. No Supabase project or deployment created.

## 1. Local commands (no provider needed)

```powershell
cd "C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym"
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix cloud ci --ignore-scripts --no-audit --no-fund
npm test
npm --prefix cloud run test:db
npm run build
npm run check:artifact
python -m http.server 8830 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:8830/`. Ctrl+C stops the server. Use a disposable origin for
QA; do not restore/reset origin8765. Auth is disabled by default; normal Tracker
works local-only. Output directory remains `dist`,42 explicitly approved files.
`cloud/`, dependencies, SQL, tests, secrets, backups and reports stay excluded.

Optional synthetic Auth browser QA: copy `cloud/tests/auth-browser.html` as
index.html into an ignored disposable directory, plus `js/cloud-auth.js`,
`js/cloud-auth-ui.js`, `css/style.css` and `assets/fonts/PatrickHand-Regular.ttf`
at matching paths; serve it on8831. That fixture uses fake transport and invalid
example emails; never enter real credentials. It is not a deployable Auth demo.

## 2. Approval required before real provider setup

User must approve: Supabase test project creation/ownership, region, preview vs
production scope, Free plan/current limits, synthetic test accounts, OTP template,
email/SMTP configuration, secret handling and any paid service. No personal
records/photos may be uploaded as part of synthetic testing. No automatic GitHub
connection, provider function deployment, Vercel deployment or paid upgrade.
Do not paste service-role/database/SMTP secrets into chat or commit them.

Once approved, an operator creates the test project and prepares two synthetic
confirmed-email accounts. Review disabled signup policy, six-digit OTP and email
template using `{{ .Token }}` instead of the default magic-link URL. Verify actual
delivery, rate limits and token refresh/logout before claiming provider PASS.
[Official email OTP setup](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Public frontend configuration uses ONLY an approved `https://<projectref>.supabase.co`
and `sb_publishable_...` key, with matching preview/production environment.
`js/cloud-config.js` stays disabled/empty in this batch. The packager deliberately
rejects activation until a future explicit configuration review changes that gate.
Never use a service-role/secret key or legacy JWT as frontend config.
[Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

## 3. SQL installation — approved isolated project only

Migration expects existing Supabase `auth.users`; do not run synthetic fixture
bootstrap on Supabase. As migration administrator, review and apply
`cloud/migrations/001_foundation.sql` once inside its transaction. It is not
rerunnable: existing schema collision stops instead of dropping/replacing data.
Record the file checksum and migration version in operator records.

Keep tracker_sync private, never add it to exposed PostgREST schemas. Verify
grants, forced RLS and tests before any gateway connection. Synthetic local
integration file requires admin access to create synthetic auth fixtures;
do not blindly run it against provider-managed auth.users. Native tests should
use a disposable PG database with the same explicit fixture bootstrap as runner.

Provision a **server-only** LOGIN NOBYPASSRLS role with inherited membership in
tracker_gateway and no other roles/grants. Owner remains NOLOGIN. Choose password
in the provider console/secret manager, never in tracked SQL/chat/history. Do not
run the gateway using postgres/admin/service_role/helper-owner credentials.
Startup verifies permitted role flags/membership. Verify Supabase pooler supports
the approved custom runtime role before relying on it; provider compatibility is
NOT VERIFIED. Approved operators register only synthetic UID/devices using the
private helper, never through a public signup/registration endpoint.

## 4. Server configuration and entry point

After approval only, supply these to a protected **server process**:

| Variable | Meaning |
| --- | --- |
| SUPABASE_PROJECT_URL | Fixed approved HTTPS project origin |
| SUPABASE_PUBLISHABLE_KEY | Public key used by authoritative Auth lookup |
| TRACKER_ENVIRONMENT | test, preview or production; must match reviewed scope |
| DATABASE_URL | Secret connection for restricted gateway login; exactly one `sslmode=verify-full` parameter required |

These are never injected into frontend/dist. No env files are added by this task.
Use validated provider CA/TLS configuration; never disable certificate checking.
Server rejects missing/weaker/duplicate sslmode or global TLS bypass. Driver
connection-string TLS settings replace separate ssl options; put the approved
CA reference in the reviewed connection configuration when required.
[node-postgres TLS](https://node-postgres.com/features/ssl).
Then `npm --prefix cloud start` opens loopback8832 with no allowed browser CORS
origin and writes disabled. Missing/unsafe configuration exits1 with redacted
error; this failure path was tested. Real connection startup is NOT VERIFIED.

POST JSON routes: `/bootstrap`, `/pull`, `/receipt`; `/push` always responds
writes_disabled in CLI. Tests inject a writer against disposable synthetic DB
only. There is no CLI switch/env toggle to upload real Tracker data. No server
credential or auth bypass enters the normal app. Vercel server runtime packaging,
deployment, CORS/TLS/rate limits and writes activation require future approval.

## 5. Verification before enabling anything real

- Test actual A/B Auth with delivered OTPs, revoked/expired/wrong-project JWTs.
- Inspect browser artifact/network: only approved Auth requests; no analytics,
  cloud data/photo upload or unapproved remote assets.
- Verify restricted runtime SQL role, denied browser tables/helpers and A/B
  scope isolation against the approved project.
- Use two independent PG connections for simultaneous CAS/head locking, atomic
  rollback, receipt recovery and fixed-H bootstrap under concurrent commits.
- Test Safari/iPhone reload/background expiry/offline/pending warning behavior.
- Confirm anonymous JSON + photo backup before/after; never destructive restore
  on the user's existing origin. Preserve schema8/photoDB1/backup8+1.

## 6. Rollback

Frontend: keep provider disabled; revert this batch's application/packager commit
and regenerate the static artifact. Do not overwrite user browser storage.
Gateway: stop it/revoke its login or connection at the approved operator boundary;
keep tables/versions/receipts and export/verify approved synthetic data first.
Migration is additive cloud-only and has no DROP/purge downgrade. Roll forward
with a reviewed corrective migration or restore a verified provider backup only
under explicit approval. Never reset local schema or use SQL teardown on real
data. Existing local JSON/photo backup remains independent of any cloud database.

## 7. Batch2 boundary

Next requires approval for account-scoped IndexedDB persistence, durable outbox,
explicit import preview/confirmation/ledger, conflicts/retry/pull projection,
safe account transitions and provider verification. Photo cloud migration and
production deployment need their own approved scope. STOP after Batch1.
