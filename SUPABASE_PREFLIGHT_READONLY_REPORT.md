# Supabase preview read-only preflight —11/10/2026

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
