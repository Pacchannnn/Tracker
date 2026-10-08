# Tracker — Cloud Batch 1: security / RLS

08/10/2026 · LOCAL PASS; real Supabase deployment NOT VERIFIED.

## Trust boundary

The public artifact contains disabled Auth configuration and a public-key-only
adapter. Tokens live in private memory closures; no localStorage/sessionStorage,
IndexedDB, portable backup, URL or log persistence. Login never changes the
anonymous workspace. Account editing is disabled. Auth success is not sync.

The gateway uses one operator-configured HTTPS Supabase project. It decodes JWT
issuer/audience/expiry/subject only to reject requests early; decoding is **not
signature verification**. It then asks the fixed project's Auth `/user` endpoint
to authorize the bearer and requires matching UID, authenticated role/audience,
confirmed email and non-anonymous user. Request bodies cannot supply UID,
environment/project, trusted validation head/read set, or server success.
An unavailable Auth server denies access. [Supabase authoritative user lookup](https://supabase.com/docs/reference/javascript/auth-getuser).

UID + environment + project is passed as bound SQL values on every operation.
There is no public registration endpoint, frontend table writer, browser outbox
or cloud photo endpoint. CLI gateway binds loopback, enables no CORS origin and
disables writes unconditionally. Test code explicitly injects synthetic identities
and `allowWrites:true`; that is never wired to the normal frontend.

## SQL permissions

Migration `cloud/migrations/001_foundation.sql` creates private `tracker_sync`.
It must stay absent from PostgREST exposed schemas.

| Role | Rights |
| --- | --- |
| PUBLIC / anon / authenticated / service_role | No private schema/table/function grants |
| tracker_gateway | NOLOGIN, NOBYPASSRLS; schema usage + approved entry helper EXECUTE only |
| tracker_sync_owner | NOLOGIN, NOBYPASSRLS; minimum scoped table SELECT/INSERT/UPDATE; no DELETE; immutable versions/receipts SELECT/INSERT only |
| Migration administrator | Trusted installation/operations boundary; never a runtime credential |

All six tables enable and FORCE RLS. Policies apply only to the helper owner and
match transaction-local UID/environment/project. Every query also filters scope.
Privileged functions use `SECURITY DEFINER SET search_path = ''`, fully qualified
objects and explicit grants. Scope resets inside every helper; no reused-pool
request inherits previous account authority. SQL inputs are bound parameters.
Direct caller-controlled GUCs confer no browser table/helper privileges.
[PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html),
[SECURITY DEFINER guidance](https://www.postgresql.org/docs/current/sql-createfunction.html),
[node-postgres parameters](https://node-postgres.com/features/queries).

The trusted gateway role can invoke helpers for a verified UID; RLS does not
independently authenticate a server-supplied UID. Compromise of the gateway or
its credential is therefore a cross-account risk. Never give this role to a
browser. Runtime startup rejects superuser/BYPASSRLS/create-role/create-database/
replication roles, unknown gateway membership, or helper-owner membership.
Provider role/login/pooler provisioning remains a separately approved operation.

## Validation and transactions

- Protocol1, bounded JSON (2MiB /100 changes), UUID operation/device IDs, exact
  request/change keys, supported kinds/actions, schema8 only, decimal bigint
  strings; duplicate changes, credentials, prototype keys and embedded photos
  rejected. No unsupported dependency chains or photo commands.
- Existing schema8 validators validate the proposed whole projection plus
  numeric entry/food/check-in/cardio/knee boundaries. Nested snapshots, IDs and
  array order remain intact; historical food snapshots survive source deletion.
- Account head is locked; CAS, captured full read set and captured head rechecked
  within SQL. Head advances with accepted records, versions and receipt in one
  transaction. Conservative head guard may conflict on unrelated concurrent
  account changes; do not auto-rebase in this batch.
- Canonical semantic SHA256 retains array order. Receipt lookup precedes current
  domain validation on retries, but SQL still checks fingerprint/device before
  returning the receipt. Valid-envelope domain rejection/conflict is persisted;
  malformed protocol/auth requests receive sanitized errors without a receipt.
- Workout phase transitions require their command. `historyEditBase` is forbidden
  on shared live/completed workouts. Correction requires one source update and
  one same-device candidate tombstone, exact source baseline and corrected
  candidate content. Unknown/changed baseline conflicts instead of overwriting.
- Journal date uniqueness; deleting active plan requires explicit same-operation
  settings update to null. Tombstones retain keys/revisions; resurrection denied.
- Read responses and HTTP errors use `Cache-Control:no-store`. Errors contain no
  provider response bodies, SQL diagnostics, record payloads or credentials.
- Oversized chunked HTTP bodies receive413 immediately, without waiting for EOF.
- Backend requires explicit sslmode=verify-full (no duplicate parameter or global
  TLS bypass); actual provider certificate/connection still needs verification.

## Findings addressed and remaining risks

Concrete review reproductions fixed with RED→GREEN tests: oversized bodies held
sockets until EOF; live workouts accepted draft-only history baselines. Review
also corrected empty planning envelopes triggering needless pending warnings.
No critical unresolved finding in the tested local foundation.

This is not a production penetration test. No complete network trace, native
multi-connection isolation test, Supabase project/RLS/OTP verification, rate
limiting, deployed TLS/proxy configuration, secret manager integration, retention
budget, cloud account persistence or incident recovery test is claimed.
The local server is not internet-ready; provider/deployment gates remain closed.
Retained versions/tombstone payloads grow without GC. Backups and source plan stay
private. SQL rollback never wipes user data; see setup guide.
