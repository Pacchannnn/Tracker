# Supabase preview read-only preflight

## Latest completed SELECT preflight —14/10/2026

User explicitly approved running the SELECT catalog/permission preflight from `cloud/hosted-preflight.sql` on the preview project. This approval does not cover migration/CREATE/GRANT, account/configuration changes, deployment or upload.

- Initial exact project navigation redirected to sign-in. User completed Dashboard login directly and replied “ok rồi”; no password/OTP/credential read or requested in chat. The existing Tracker tab at8765 was not interacted with.
- Verified authenticated Dashboard: project Tracker, `wwcfzotkxpqtelfvvhpd`, main, Healthy, Singapore/ap-southeast-1. Opened SQL Editor through its visible control; execution URL `https://supabase.com/dashboard/project/wwcfzotkxpqtelfvvhpd/sql/73641d76-a17f-4363-8323-98100ac0d631`.
- Ran **SELECT only** through the actual SQL Editor Run button. Used the approved preflight queries, a count projection of its empty Tracker catalog queries, explicit managed-role membership checks, the runbook's default ACL and exact preview bucket metadata queries, and matching `pg_settings` registration/preload evidence. No user health records, Auth user rows, storage objects/bytes or credentials selected.
- SQL editor contents left as unsaved SELECT text; no Save-as-snippet/AI action or configuration change. Screenshot of provider catalog result saved locally at `.local/hosted-preflight-2026-10-14/provider-config.png`; no screenshot/data uploaded.

### Actual hosted results

| Check | Observed result | Interpretation |
|---|---|---|
| current_user / server_version | postgres /17.11 | Actual hosted PostgreSQL session, not a synthetic fixture |
| postgres flags | LOGIN=true, SUPERUSER=false, CREATEROLE=true, CREATEDB=true, REPLICATION=true, BYPASSRLS=true | These are **preexisting provider role flags**, not permissions granted by Tracker; restricted application roles must still be NOLOGIN/NOBYPASSRLS |
| CREATE database/schema, Auth USAGE, Auth users REFERENCES, Auth UID EXECUTE, Storage USAGE, bucket SELECT | All six TRUE | Previously missing object/creation privilege evidence obtained; actual CREATE ROLE/ALTER OWNER still unexecuted |
| auth.users existence | TRUE | Catalog only; no user rows selected |
| tracker_sync schema / helper and gateway roles | Absent | Initial installation precondition; role-flags query returned only postgres |
| tracker_preview_runtime / tracker_photo_policy schema | Absent / absent | No runtime/photo install present |
| Tracker memberships/tables/policies/functions | 0/0/0/0 | Count projection confirms empty private catalog |
| postgres MEMBER auth admin / storage admin | FALSE / FALSE | No managed-admin membership needed or added |
| auth.uid owner / ACL | supabase_auth_admin; `{=X/supabase_auth_admin,supabase_auth_admin=X/supabase_auth_admin,dashboard_user=X/supabase_auth_admin}` | PUBLIC EXECUTE is present; EXECUTE does not imply grant option. UID bridge avoids managed Auth GRANT |
| Auth / Storage schema owners | supabase_admin / supabase_admin | Schema owners differ from function/table owners; original Auth-schema ownership gate would have been unsuitable |
| storage.buckets / storage.objects owners | supabase_storage_admin / supabase_storage_admin | Preserved managed ownership |
| Storage RLS / FORCE flags | Both tables ENABLE=true, FORCE=false | Managed Storage RLS is on; no change requested or made |
| Storage objects policies | 0 rows; Success | Seven Tracker policies not installed |
| tracker-preview-photos bucket | 0 rows; Success | Required private bucket not created;003 DB would reject until approved Dashboard creation |
| supautils.policy_grants | postgres list includes storage.objects and storage.buckets | Explicit existing provider policy delegation; not a new grant or owner change |
| session_preload_libraries | supautils | Supautils is configured to load for this session; absence from shared_preload alone was not a blocker |
| Registered Supautils GUCs | policy_grants / privileged_role present in pg_settings, context=sighup; privileged_role=supabase_privileged_role | Not merely a missing/NULL setting. No SET/reload/ALTER ROLE performed |
| postgres default ACLs | Six rows: S/f/r for public and storage; no global row or Tracker namespace row | Explicit browser grants are limited to those existing schemas. No observed custom global function recipient that would trip the new operator guard; implicit PUBLIC defaults still handled by migration revokes |

Provider's maintainer documentation describes policy delegation to configured roles and session preload support: [Supautils](https://github.com/supabase/supautils). **Inference:** the configured postgres/storage.objects route matches the hosted policy installation design. This is stronger evidence than role membership alone; it is **not a PASS for CREATE POLICY**, which was not executed. Never SET ROLE to the configured privileged role or alter provider settings to obtain access.

### Verdict / approval gates

**Read-only capability preflight PASS.** Creation/Auth/reference/Storage read and provider-delegation configuration blockers are resolved as observations. The001/002 packet can be put forward for a separately approved install; successful DDL/ownership transfer, native TLS/gateway identity and hosted A/B RLS/Storage testing remain NOT VERIFIED.

**Full001→002→003 remains CÒN BLOCKER / NOT APPLIED:** exact private bucket absent;003's existing DROP CHECK-constraint replacement has not been approved under the user's no-DROP instruction. Execution requires separate approval for001/002 roles/schema, Dashboard bucket creation,003 DB/UID bridge/ACL/constraint exception, and all seven Storage policies. Actual policy DDL is an installation acceptance gate, not permission to probe with temporary CREATE/DROP.

No CREATE/ALTER/GRANT/REVOKE/INSERT/UPDATE/DELETE/DROP, Auth settings/users, bucket creation, migration, deployment, writes/upload or push performed. Local code checkpoint `f2fe49a`; previous771 tests/148syntax/SQL45+121+60 are historical local test evidence, not rerun for this documentation-only follow-up. The14/10/2026 SELECT evidence supersedes “catalog access unavailable” in older reports, while other release restrictions remain.

## Historical attempt —11/10/2026

User approved read-only inspection in this thread; hosting decision remains local preparation only. No migrations, database roles, Auth configuration, login/OTP requests or data upload performed.

## Executed

Using confirmed ignored build public config, exact project origin and publishable key (neither printed here):

| Read-only request | Result | Meaning |
|---|---|---|
|GET `/auth/v1/settings`|200; `external.email=true`; `disable_signup=false`, both fields confirmed present |Email provider enabled; public signup is currently not disabled. This does not prove an email was delivered, OTP length/expiry, SMTP configuration or confirmed test users |
|GET `/rest/v1/` with publishable apikey and no user JWT|401|No public OpenAPI read from this request. This is not evidence of Tracker RLS/table grants or migration installation |
|Dashboard exact project page|Redirected to Supabase sign-in |Codex browser not authenticated; catalog/Auth administrator inspection not executed |

No settings changed. App continues `create_user:false`; disabling public signup/template/SMTP/user changes needs separate approval. Public project/key alone cannot inspect private catalog or Auth users. No request to individual data tables or user-record endpoints was made.

## Pending administrator evidence

Sign in directly on Supabase Dashboard in a browser available to Codex, or run `cloud/hosted-preflight.sql` read-only in SQL Editor and supply sanitized result. Do not send password, service key, database URL, OTP or personal user rows. Needed: current_user/server version/auth.users existence/tracker schema existence, helper/runtime role flags/membership, FORCE RLS and effective/default/PUBLIC grants. Existing schema must be reconciled, not DROP/rerun.

The previous human report `auth.users=true,tracker_sync=false` remains unverified catalog evidence until the above is executed. Read-only authorization is retained; no new approval needed for equivalent read-only inspection once account access is available.
