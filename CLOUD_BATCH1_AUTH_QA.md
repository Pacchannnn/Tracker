# Tracker — Cloud Batch 1: Auth QA

08/10/2026 · LOCAL / SYNTHETIC PASS; REAL SUPABASE NOT VERIFIED.

## Implementation

`js/cloud-auth.js` implements Supabase REST Email OTP, authoritative `/user`
lookup, refresh, expiry, logout and account switch using native fetch. No SDK or
frontend dependency. `js/cloud-auth-ui.js` is integrated into actual Settings
with the existing paper style. `js/cloud-config.js` defaults disabled/empty.

Email OTP flow: `/otp` with `create_user:false`, `/verify` with `type:'email'`,
then `/user`; refresh uses `/token?grant_type=refresh_token` and re-verifies UID;
logout uses local session scope. Provider responses are sanitized. Epoch,
AbortController, timer identity guards and opaque pending confirmations prevent
older requests/timers from changing a newer session or approving changed input.
Memory-only credentials intentionally disappear on reload.

Numeric email codes need a reviewed Supabase email template containing
`{{ .Token }}`; the normal template uses a magic link. UI expects six digits.
`create_user:false` avoids adapter-driven automatic registration; it is not a
substitute for disabling unwanted signups in the approved project.
[Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[Auth REST contract](https://github.com/supabase/auth/blob/master/openapi.yaml).

## Automated evidence

28 new adapter/lifecycle/UI tests PASS in the full suite. Tests use controlled
transport responses and clocks, **not** a real Auth provider. They cover fixed
project/config restrictions, authoritative user versus response UID, OTP body,
invalid email/code, refresh/expiry, account A/B switching, failed logout,
stale requests and queued timers, pending warning freshness/cancellation,
error redaction, preserved form inputs, disabled account editing, no storage
access and byte-identical anonymous backup. Existing synthetic context tests
remain unchanged under `dev/auth` and excluded from dist.

## Actual browser evidence

Two disposable loopback origins; no action on8765:

| Origin | Observed result |
| --- | --- |
|8830 packaged Tracker | Actual Settings shows local-only, disabled account editing, no upload/merge promise. Six main areas open. Synthetic2450 kcal setting and17kg×9/RIR3 workout survive reload and appear in history. Downloaded JSON before/after read-only navigation has exact data equality; schema8. Photo backup downloaded/parsed with0 photos; nonempty photo restore was not repeated here. |
|8831 test-only harness | Uses real adapter/lifecycle/UI with injected local fake transport. Signed-out→pending Cancel/Confirm→OTP→account A→account B→expiry→sanitized request error→local-only→reload signed-out observed. Unrelated1777 input preserved. Endpoint paths only printed; no token/OTP/email response logging. No Supabase request is sent by fixture transport. |

Console warning/error captures empty for both tabs. Keyboard Tab moves email to
OTP-request button in harness, and calories to protein in packaged Settings.
Actual packaged viewport widths320/360/390 verified via `innerWidth`, with
Settings/Gym/Nutrition content width equal client width (305/345/375 due scrollbar).
No horizontal overflow in those nine checks. A first viewport attempt targeted
the other active tab and was discarded; only measured actual widths count.
Screenshot: `.local/cloud-batch1-mobile.jpg` (390px, synthetic data, ignored).

Harness is `cloud/tests/auth-browser.html`; excluded from42-file public artifact.
Temporary tabs/servers are closed at completion; synthetic downloaded files are
local and never staged. No complete browser network trace or real-device result
is claimed.

## Provider gates still NOT VERIFIED

Project ownership/region, account preparation, email template, real email delivery,
six-digit verification, throttling, SMTP/cost limits, real logout/refresh token
rotation, wrong-project provider rejection, Safari/iPhone lifecycle and production
TLS/CORS. Setup guide lists approval/configuration prerequisites. No test result
here implies REAL SUPABASE PASS, synchronization or successful data migration.
