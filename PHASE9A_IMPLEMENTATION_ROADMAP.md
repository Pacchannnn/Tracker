# Tracker V4 — Phase 9A: future implementation roadmap

08/10/2026 · **PROPOSAL ONLY. Phase9A dừng ở design/research; mọi phase9B dưới đây NOT STARTED / NOT APPROVED.**

Baseline439/439tests,74syntax, schema8/photoDB1/backup8+1, main93befc1/code2e4dfc7. Không remote operation/deploy. [Architecture decisions](PHASE9A_ARCHITECTURE_DECISION.md), [sync contract](PHASE9A_SYNC_CONTRACT.md), [cloud model](PHASE9A_CLOUD_DATA_MODEL.md), [security/photo/migration](PHASE9A_SECURITY_PRIVACY.md) là prerequisites, không phải implementation evidence.

## 1. Dependency order và approval boundary

```text
9A design (this task)
  → 9B-1 local deployment readiness
  → 9B-2 authentication foundation, isolated test environment
  → 9B-3 cloud schema / RLS / transactional gateway
  → 9B-4 read-only sync prototype
  → 9B-5 write sync + local transactional outbox
  → 9B-6 conflict review / deletes / offline recovery
  → 9B-7 photo sync
  → 9B-8 existing-data migration rehearsal
  → 9B-9 real-device verification
  → 9B-10 explicitly approved production release
```

Không triển khai cả chuỗi chỉ vì người dùng duyệt một phase. Mỗi milestone phải review concrete result, tests thực chạy, docs và STOP. Project creation/secrets/mail/budget/data upload/deploy cần authorization cụ thể trước thao tác. Không GitHub push mặc định.

Hai release gates chưa nằm sẵn trong code: **offline cold-load shell** và **independent backup vượt caps/multiple drafts/outbox**. Có thể cần design phụ được duyệt trước9B-8/9B-9. Không âm thầm thêm PWA/SW/backup format hoặc mở rộng E1/E2.

## 2. Phase9B-1 — Deployment readiness, LOCAL ONLY

**Scope:** audit/prepare static packaging và reproducible asset inventory, asset-cache versioning, HTTPS capability assumptions, settings/config separation, privacy deployment exclusions. Giữ app local behavior/design/data. Không cần auth SDK/backend để làm bước này.

**Dependencies/decisions:** user duyệt riêng9B-1; chỉ readiness trên máy hiện tại. D1 provider là proposal, không phải được cấp account/deploy permissions. Không sửa MASTER_PLAN.

**Risks:** publish repo root lộ files ignored/private; stale assets; đổi URL/path làm module break; hosting origin không chứa local data.

**Tests/gates:** fresh baseline/regression/syntax; artifact chỉ whitelist app assets, zero private/docs/backups/env/node_modules; serve packaged copy trên disposable origin, navigation/refresh/module graph; mobile320/360/390; data formats unchanged; no cloud networking. Documentation hướng dẫn origin/backup rõ. Không claim Vercel behavior khi mới static local test.

**Rollback:** remove unshipped packaging/config changes bằng reviewed patch, giữ code/data checkpoint; không delete repo/private data.

**STOP:** thiếu approval hoặc artifact leak/module failure; dừng sau readiness report. **Không create Vercel project, deploy, connect GitHub, Supabase hoặc upload.**

## 3. Phase9B-2 — Authentication foundation

**Scope:** account-context/epoch/login/logout/pending-warning UI; email OTP flow, session refresh/error, local-only mode luôn usable. Synthetic auth harness trước; isolated test Supabase project chỉ khi được duyệt tạo và có owner/email/SMTP/region.

**Dependencies/decisions:**9B-1; D1/D9; approve SDK source/version/bundle, server signup/login-only, trusted env keys/secret setup, test-project creation và costs riêng. Chưa sync/auto import.

**Risks:** default magiclink/autosignup khác numericOTP; default SMTP giới hạn; account switch leak; expired token gây mất input; preview production key reuse.

**Tests/gates:** OTP valid/invalid/expired/resend/rate-limit; correct UID/project; server signup disabled; login với existing local data0uploads; expiry giữ pending; logout seals/URL cleanup, old async epoch rejected; two-account/test-project isolation; no secret in bundle/log/Git; local mode dùng được khi network disabled. Provider test chưa chạy ghi NOT VERIFIED, không báo Auth PASS.

**Rollback:** disable auth gate/worker, retain anonymous original và pending account cache; no automatic account removal.

**STOP:** unauthorized provider setup, email delivery/security fail hoặc account leakage. Chưa cloud schema/data sync.

## 4. Phase9B-3 — Cloud schema/RLS/gateway foundation

**Scope:** reviewed SQL migrations trong test environment, private helper/role, record envelopes/version feed/receipts/account clock; read/write API authorization và domain validation. Synthetic records only, chưa UI writes.

**Dependencies/decisions:**9B-2; D3/D4/D5/D7; restricted DB connection/credentials/pooler strategy duyệt. Snapshot/retention và payload/operation bounds đo trước freeze protocol. NoGC prototype với budget stop.

**Risks:** public definer or admin bypass RLS; commit cursor skips; legacy ID coercion; journal date duplicates; source FKs phá snapshots; receipts/payload growth.

**Tests/gates:** negative HTTP/SQL tests giữa account A/B; JWT thiếu/hết hạn/sai project và account disabled; browser không direct DML/EXECUTE; helper có search_path cố định, SQL parameterized; transaction all-or-nothing; head lock giữ đúng thứ tự commit; retry/collision operation ID; journal date/plan pointer/workout phase/history baseline; schema8 roundtrip đầy đủ arrays/legacy/raw drafts; benchmark provider limits. Migration failure giữ dữ liệu, không truy cập production.

**Rollback:** stoptestgateway; revert unconsumed additive schema in isolated test project via reviewed migration; retain fixtures/evidence. No drop live/real data.

**STOP:** lỗi tenant/ordering/invariant, payload vượt khả năng đã chứng minh, hoặc setup credential cần người dùng. Chưa bật write sync.

## 5. Phase9B-4 — Read-only sync prototype

**Scope:** khởi tạo account workspace adapter, bootstrap tại head H nhất quán và incremental pull; preview tách riêng, không push. Kiểm tra epoch, protocol và dữ liệu.

**Dependencies/decisions:**9B-3; D2; approve new account IDB metadata/version and readbindings refactor preserving local-only behavior. No cloneaccountdata into anonymous localStorage key.

**Risks:** paging trộn versions, cursor advance qua dữ liệu thiếu, remote overwrite form chưa lưu, tải ảnh original ngoài ý muốn, dữ liệu lỗi bị thay bằng empty state.

**Tests/gates:** pagination khi có concurrent writes; nhận đủ commit groups; interrupt/reopen trước và sau local commit; duplicate feed; future version phải pause; reject UID/epoch cũ; schema8 projection đúng fields/order/snapshots; 0 push/anonymous writes; tải ảnh theo yêu cầu; loading/error/empty khác nhau. Prototype phải nói rõ editing chưa được sync.

**Rollback:** disable prototype, retain account preview storage for inspection/export; sourceanonymous unchanged.

**STOP:** snapshot thiếu, payload không được hỗ trợ, preview dữ liệu chưa được cho phép hoặc mutation ngoài phạm vi. Chưa có cloud write UI.

## 6. Phase9B-5 — Write sync / durable local outbox

**Scope:** account state/outbox/shadow trong một local transaction; refactor các read/write bindings liên quan, aggregate intents, server CAS/idempotency/dependencies. Phân biệt lưu local và synced; phát hiện/giữ conflict. **Review UI chưa hoàn chỉnh thì block, không force write.**

**Dependencies/decisions:**9B-4; D2/D3/D4; transport/caps được duyệt; migration persistence mới có approval. Không đổi portable schema8 khi chưa có design/approval riêng.

**Risks:** dữ liệu + queue không atomic, retry tạo duplicate logs, ack xóa input mới, compound Start/Complete/clear draft thành công một phần, response từ account cũ, queue ảnh mất bytes.

**Tests/gates:** fault injection state+outbox atomicity, lease expiry/reopen, lost ack/retry exactly once, offline causal chain, independent creates, compound rollback; stale local guard; history/slot/set/source isolation; receipt/pull repair; quota không false Saved; account/tab epoch; 429/5xx/auth errors. Giữ439tests, thêm tests cần thiết RED→GREEN, code review và browser fixture. Chưa upload ảnh qua generic JSON.

**Rollback:** feature flag dừng network; giữ account state/outbox và recovery export; không downgrade/wipe; local-only original vẫn dùng được.

**STOP:** silent overwrite, queue gap, đổi ownership, mất conflict input hoặc gate thiếu. Chưa release production khi review/offline/photo gates còn pending.

## 7. Phase9B-6 — Conflict handling / deletes / offline recovery

**Scope:** review base/local/remote, resolution intent mới rõ ràng, giữ hai candidates; tombstones; history correction; explicit resume/copy trên thiết bị; resnapshot sau offline lâu. Không LWW, automatic set merge hoặc coaching.

**Dependencies/decisions:**9B-5; D4/D5/D7/D9; duyệt draft UX, ý nghĩa workout copy/count và retention.

**Risks:** resolution đã stale, source bị hồi sinh, hai journals cùng ngày, tăng workout count ngoài ý muốn, delete cascade phá history, mất queued descendants.

**Tests/gates:** cả8cases trong sync contract; edit thứ ba khi đang review; blocked dependency queue; remote/local/edit/cancel/export; source history đổi/xóa; không đoán ownership legacy; same-workout sets/order/remove/replace/complete races; macro isolation; active plan pointer; cursor dưới floor resnapshot giữ queue; multi-tab/reload/mobile/keyboard. Conflict chưa giải quyết không được báo Synced.

**Rollback:** dừng writes/review UI thử nghiệm; giữ candidates/versions cho export; không blind merge/reset. Accepted cloud records chỉ sửa lại qua reviewed operation nếu an toàn.

**STOP:** cần semantics chưa duyệt hoặc mất phiên bản. Chưa physical photo GC hoặc migration dữ liệu thật.

## 8. Phase9B-7 — Photo sync

**Scope:** Blob/outbox cùng account DB, private metadata/manifest, upload hai assets bất biến, hash verification/finalize CAS, download/cache theo yêu cầu, trạng thái offline rõ, owner/daily-photo guards. Không tự upload ảnh camera hoặc bulk upload nền.

**Dependencies/decisions:**9B-6; D6/D7/D8; bucket policy, backend verifier và resource benchmark. Nếu cần TUS dependency phải có lý do/approval. Physical GC ban đầu tắt.

**Risks:** PG+Storage partial outcomes, sai bytes/hash, quota, signed URL còn hạn, replacement xóa ảnh mới từ máy khác, GC nhầm orphan, re-encode làm đổi compressed bytes.

**Tests/gates:** exact original/thumbnail bytes; lỗi từng asset; lost finalize ack/retry; hash mismatch/ID collision; browser UPDATE/DELETE objects denied; A/B access/signed URL expiry; edit/delete conflicts; ảnh mới sau review phải recheck; journal chỉ daily photos, không food cascade; existing20MB/binary caps và function CPU; quota/offline giữ pending bytes; thiếu thumbnail không fallback original; source DB unchanged. 5,000-photo performance chỉ PASS khi thực chạy.

**Rollback:** dừng upload/download worker; giữ local/staged assets/receipts và published history/photos. GC dry-run khác với approval xóa.

**STOP:** verifier vượt limits, lộ dữ liệu/owner, publish reference thiếu bytes, hoặc backup độc lập chưa đủ. Chưa migrate dữ liệu người dùng.

## 9. Phase9B-8 — Migration rehearsal, then separately authorized import

**Scope:** hai backup files đã lưu thật, inventory/preview, cloud presence/collisions/confirmation, ledger/resume và fresh-workspace verification. Rehearse synthetic trước; import thật cần approval đúng account/dataset/destination.

**Dependencies/decisions:**9B-7; D8; full backup trong existing caps hoặc multipart/recovery contract duyệt riêng; region/budget/retention được chấp nhận. Login không tự authorize import.

**Risks:** localhost/Vercel khác origin; skip ID che bytes khác nhau; paired export không atomic; legacy không supported; rollback xóa edits máy khác; một backup không chứa hết device drafts.

**Tests/gates:** đọc files thật, compare toàn JSON/IDs/order/snapshots/hash/bytes; phát hiện mutation khi export; preview cloud empty/nonempty/tombstones/collisions; Cancel0writes; partial/lost ack resume exactly once; không sửa original store; final pull trên hai máy; rollback CAS chỉ imported records chưa đổi; invalid/future/ambiguous giữ source/export. Cloud restore mở detached workspace, không biến absence thành mass delete.

**Rollback:** original local-only, exported pair hoặc detached recovery; cloud cleanup cần confirmation/CAS. Giữ partial import nếu không chứng minh được xóa an toàn.

**STOP:** backup thiếu/vượt cap, collision chưa review, bytes/snapshot sai, hoặc chưa cho phép upload thật. Rehearsal PASS không authorize actual import.

## 10. Phase9B-9 — Real-device verification

**Scope:** iPhone Safari + laptop, tùy chọn máy thứ ba; browser matrix, offline/auth/storage/photo/backup/conflicts và mobile usability. Đo latency/resources/memory/battery riêng với correctness.

**Dependencies/decisions:**9B-8 fixture PASS; có thiết bị thật/test accounts/secure fixture transport. Cold-load offline cần duyệt shell cache/SW design+implementation riêng trước; không tự gọi app PWA. Large backup contract là gate cho large datasets.

**Risks:** iOS suspension, eviction/IDB quota, keyboard/safe area, refresh khi push, token rotation races và file save workflow khác nhau.

**Tests/gates:** A→B/B→A trên máy thật, cả hai offline;8conflicts; reauth/account switch; background/screen lock/restart; airplane mode khi app đang mở **và cold launch/reload riêng**; offline dưới floor;2–3devices/tabs; fixtures100/1,000/5,000ảnh; retries/quota; actual download→file chooser restore trên disposable origin→exact bytes. Desktop Chrome/Edge/Firefox, macOS Safari, Android Chrome/Firefox, iOS Safari. Target không có ghi NOT VERIFIED; không suy PASS từ UA/viewport. Screen reader/keyboard theo thiết bị có sẵn.

**Rollback:** test workspace/feature gates; giữ failure evidence/backups/candidates. Không destructive test trên origin/account thật.

**STOP:** thiếu iPhone/laptop, cold offline/bytes/backup/isolation fail, privacy/budget chưa duyệt. Không production release trước minimum required matrix PASS hoặc user duyệt scope khác.

## 11. Phase9B-10 — Production release

**Scope:** sau review kết quả cụ thể và explicit deployment approval: production projects/config/region/SMTP/RLS/private bucket, static artifact/HTTPS, opt-in migration, independent backup/runbook và rollout có giới hạn.

**Dependencies/decisions:**9B-1…9B-9 gates; D1–D10 cho release scope; pricing/plaintext cloud/retention được chấp nhận; credential ownership; production approval riêng. Duyệt9A không authorize bước này.

**Risks:** deploy private files/secrets, preview lộ production, cost/pause/quota, public release, backup thiếu Storage bytes, client cũ ghi incompatible data.

**Tests/gates:** production smoke không nhạy cảm/authorization denial; artifact privacy; incompatible version pause; alerts/budget; consent/no auto import; independent backup fixture recovery; SQL backup + Storage byte coverage; rollback drill; account deletion partial-failure handling. Không destructive restore dữ liệu thật. Vercel hosting không cấp quyền cloud data.

**Rollback:** reviewed static release rollback/disable sync; giữ local account cache/outbox/cloud records; server backward compatibility hoặc pause writes; giữ backups/ledger. Không project delete/DB wipe/Git force push.

**STOP:** regression/budget/exposure hoặc chưa được duyệt deploy. Local mode là fallback; báo residual risks/pending browsers đúng evidence.

## 12. Decision checklist trước next phase

Ngay bây giờ chỉ cần duyệt có làm **9B-1 local Deployment Readiness** hay không. Chưa cần xin keys, owneremail hay đẩy dữ liệu để chuẩn bị artifact.

Trước9B-2/3: chọn providers/region/budget/SMTP/account policy/plaintext consent; transactional account DB/gateway role; draft selection/conflict review. Trước9B-7/8: offline photo cache/retention/backup completeness/caps. Trước9B-9/10: offline cold shell, release browsers/devices và production approvals.

## 13. Phase9A completion record

**Done:** baseline verified; source/model/storage/snapshot/backup audit; official research;5design docs; roadmap/report DESIGN ONLY; proposals và approval gates.

**Not done:** cloud implementation/sync tests, backend/auth/SDK/SQL/keys, Vercel deploy, Supabase project, data upload/migration, PWA/SW, E1/E2, remote AI, photo/backup format changes. Local439tests/74syntax là baseline thực chạy, không phải cloud proof.

Git acceptance cho9A: chỉ5new Markdown +2existing Markdown updates, `git diff --check`, app/tests/schema/dependencies/master unchanged; main only; no fetch/push. Git state chính xác trong final handoff sau kiểm tra.

**Exact next phase requiring approval: Phase9B-1 — Deployment readiness (LOCAL ONLY, no deploy/cloud). STOP AFTER9A.**
