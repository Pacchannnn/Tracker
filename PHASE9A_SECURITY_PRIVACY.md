# Tracker V4 — Phase 9A: security, photos and recovery

08/10/2026 · **DESIGN / RESEARCH ONLY. Chưa tạo account/project/keys, deploy hoặc upload dữ liệu.**

[Architecture/decisions/cost](PHASE9A_ARCHITECTURE_DECISION.md) · [Sync](PHASE9A_SYNC_CONTRACT.md) · [Cloud model](PHASE9A_CLOUD_DATA_MODEL.md) · [Roadmap](PHASE9A_IMPLEMENTATION_ROADMAP.md)

## 1. Privacy assessment

Gym history, journal/mood/tags, body/knee measurements và photos là dữ liệu riêng. Recommendation dùng TLS + account ownership/RLS + private bucket; **không có end-to-end encryption** trong thiết kế ban đầu. Supabase/operator có privileged access vẫn có thể đọc nội dung plaintext; Vercel nhận request metadata của static shell, email provider nhận email/OTP. RLS không chống người có project admin access hoặc XSS trên chính origin.

Chưa duyệt gửi dữ liệu nào. Future consent phải nêu domains nào sẽ upload, region, photo policy, backup/retention và chi phí. Có thể chọn local-only/manual transfer nếu không chấp nhận cloud plaintext. E2EE thay đổi recovery/search/gateway validation nên là design riêng, không hứa triển khai ngầm.

Không health coaching, knee diagnosis hay AI integration. Sync không tạo macros, kế hoạch tập, workload increase hoặc suy diễn causal associations.

Region chưa chọn. Provider cho chọn primary region; region là data-location decision, không tự chứng minh tuân thủ pháp lý. [Supabase regions](https://supabase.com/docs/guides/platform/regions). Owner email, signup policy, SMTP và budget là decisions trước provision.

## 2. Email OTP / account lifecycle

Đề xuất numeric email OTP để dùng được trên laptop/iPhone mà không buộc click link cùng tab. Supabase `signInWithOtp` mặc định gửi magic link và có thể tạo user; numeric OTP cần email template token, `verifyOtp` và `shouldCreateUser:false` cho login-only. [Passwordless email docs](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Single-user launch: account owner được tạo có chủ đích, **server signup disabled**, không frontend email allowlist giả làm authorization. Public shell không đồng nghĩa anyone có quyền signup/data. OTP expiration/resend/rate limits theo cấu hình provider, UI phản ánh lỗi và delay, không hard-code một số làm security guarantee. Không log OTP.

Default Supabase SMTP chỉ gửi tới authorized team addresses, giới hạn hiện2messages/giờ và best-effort; không phù hợp coi là production email. Cần custom SMTP/email delivery test và cost/retention review. [SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp). Chưa chọn/mở tài khoản mail provider.

Flow: anonymous local-only → explicit login → verify UID/project → open **account-scoped workspace** → hiện migration preview nếu có local data. Không tự upload sau login. Account chưa có workspace không first-login offline; workspace đã mở/unlocked có thể ghi offline theo D9, chưa sync cho tới reauth.

### Session expiry, logout, account switch

- Auth SDK session chỉ lưu vào auth namespace project/env riêng; không vào schema8/portable backup/outbox. Token rotation/refresh theo SDK, không custom token scheme. [Auth sessions](https://supabase.com/docs/guides/auth/sessions).
- Expiry/401 pause network, giữ queued work; đăng nhập UID khác không nhận queue cũ. App yêu cầu đúng account để tiếp tục.
- Explicit logout bump epoch, stop/abort worker, revoke UI object URLs, seal/hide account workspace; không xóa pending data tự động. Cảnh báo pending và cho export trước logout/remove local.
- Seal là app access boundary, **không encryption at rest**. Người có quyền browser profile vẫn có thể đọc IDB; shared-device risk phải nói rõ.
- Remove local account cache cần confirmation + backup, chỉ scope của account đó, không chạm anonymous key/khác account. Chưa duyệt tự xóa khi logout.
- Logout không bảo đảm access JWT đã phát mất hiệu lực ngay; JWT còn valid tới exp. [Signout limits](https://supabase.com/docs/guides/auth/signout). Device UUID cũng không thể làm remote revoke credential; strong device/session revocation cần contract server registry riêng nếu user yêu cầu.
- Account disabled/deleting được gateway/RLS kiểm tra trước sync/download. Queue từ disabled account không retarget account mới.

## 3. Authorization / environment boundary

Frontend chỉ public project URL + publishable key; user JWT là session credential. Secret/service-role bypass RLS chỉ server và không nằm trong JS/public repo/Vercel static output. [API key roles](https://supabase.com/docs/guides/getting-started/api-keys). Future secrets dùng provider secret store/ignored local env, không read/print keys trong9A. [Edge secrets](https://supabase.com/docs/guides/functions/secrets).

Trusted sync gateway: official JWT verification path, derive UID từ verified context; private DB helpers, EXECUTE-only backend role, transaction-local tenant context, parameterized SQL, record/domain/size validators. Không disable JWT verification để tránh lỗi401. [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth). Client không DML trực tiếp vào sync tables hoặc tự chọn tenant trong privileged RPC. DB RLS/privileges contract ở cloud model; kiểm thử cả unauthorized API paths, không chỉ happy path.

Production và preview dùng **Supabase projects khác nhau**. Không cấp production config/SMTP/real data cho pull-request previews. Local DB scope gồm project+env+UID; cache không được reused chỉ vì cùng email. CORS origin allowlist không thay JWT/RLS. Publishable key không bảo mật dataset nếu policies sai.

Vercel future artifact whitelist `index.html`, CSS/JS/assets cần chạy; không deploy repo root nguyên xi có `.local`, MASTER_PLAN/private summaries, backups, source QA, docs/note cá nhân, env, node_modules. Git ignore không tự là deployment exclusion. Static shell assets cache được, authenticated payload/OTP/signed URLs không public-cache. Kiểm tra actual deployed file inventory chỉ trong approved release phase.

Giữ safe text rendering; defense against XSS cần targeted CSP/asset/SDK audit ở deployment readiness, không tự thêm dependencies ở9A. Không third-party analytics/error service mặc định. Logs chỉ opID/status/latency/redacted error; không journal/knee/body/photo/OTP/JWT/email/full signed URL/raw payload. Browser/server diagnostics cũng cần retention policy.

## 4. Private photos: access and ownership

Private bucket, authenticated downloads mặc định. Storage RLS: UID từ JWT; object path namespace của cùng UID và liên kết manifest hợp lệ; không list/read user khác. Public bucket bị loại. Provider hỗ trợ authenticated read hoặc signed URLs có hạn. [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Signed URLs chỉ khi native display/download cần; short TTL do user-approved policy, không persist trong data/backup, không đặt trong logs. URL đã phát có thể hoạt động tới expiry kể cả logout/key rotation; không hứa revoke tức thì. [Download/signed URL limits](https://supabase.com/docs/guides/storage/serving/downloads). Blob object URLs local phải revoke khi context/view/account đổi.

Ảnh `daily|progress|gym|food|other`, optional food/recipe owner và date/pose/notes/measurements giữ metadata hiện có. Owner không còn vẫn hợp lệ orphan, không tự xóa/reassociate. Nhiều ảnh cùng owner có thể tồn tại qua import; không enforce single-photo uniqueness trên cloud. “Original” là compressed JPEG hiện lưu, bytes chính xác phải giữ, không tự recompress sau upload.

### Upload protocol đề xuất

1. Local atomic account transaction lưu original+thumbnail+metadata candidate+outbox; queue photo không chỉ trỏ tới temporary file input.
2. `preparePhoto` verified UID/base/size/type → server staging manifest với uploadID/assetVersion UUID và hai immutable paths: `<uid>/<assetVersion>/original.jpg`, `<uid>/<assetVersion>/thumbnail.jpg`. Manifest liên kết logical photoID; không đưa raw legacy ID có thể chứa dấu `/` vào path. No overwrite/upsert.
3. Client upload theo manifest; INSERT RLS chỉ đúng prepared paths/account/expiry; UPDATE/DELETE objects từ browser denied. Lost ack/409 không mặc định success: check exact existing content bằng trusted verifier.
4. Trusted backend xác minh cả hai tồn tại, bytes size/MIME và SHA-256 chính xác; client hash tự khai không đủ. Hash trên raw bytes, không base64/JSON. Server stage hashes giữ để idempotent retry. Photo bytes không qua generic push body.
5. `finalizePhoto` là idempotent PG operation: CAS photo revision và reviewed owner dependencies, publish metadata/manifest references + versionfeed + receipt. Chỉ finalize sau cả hai assets verified. Nếu base đổi, conflict; staged bytes chưa trở thành accepted photo.
6. Download on demand kiểm tra hash/size rồi cache; interrupted/mismatch không báo “available offline”. Thumb missing là missing, không tự decode original để che lỗi.

Standard upload phù hợp file nhỏ; Supabase khuyến nghị TUS resumable khi trên6MB. [Standard upload](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [resumable upload](https://supabase.com/docs/guides/storage/uploads/resumable-uploads). Future quyết định có cần TUS SDK sau khi đo actual compressed files; không đổi bytes hoặc cài thư viện ở9A. Verifier phải benchmark256MB/2sCPU limits đã ghi architecture; nếu không đạt, STOP để chọn bounded verification worker/transport, không bỏ hash gate.

### Partial outcomes và deletion

| Tình huống | Recovery đề xuất |
| --- | --- |
|Original upload xong, thumb lỗi|Giữ staged original; retry thumb cùng paths/opIDs; không publish photo |
|Cả hai xong, finalize response mất|Lookup receipt, retry exact finalize; không tạo duplicate photo |
|Cloud metadata ack, local ack commit lỗi|Pull/receipt repair, verify downloaded bytes; không tạo ID mới |
|Photo ID tồn tại bytes khác|Conflict/collision; giữ cả assets staged/local; không overwrite object |
|Meta edit vs delete|CAS/tombstone; giữ candidate, user review |
|Replace owned photo|New photoID/assets + tombstone exact reviewed old IDs trong một PG operation; late unseen owner photo khiến review stale |
|Delete journal/daily photos|Exact reviewed photo set + revisions/predicate guard; không sweep other-device new photos; food photos không liên quan |
|Logical delete accepted, physical delete chưa xong|Hide tombstone; cleanup retry theo retention, không nói bytes đã erased |
|Owner gone|Visible orphan record có thể review, không garbage-collect chỉ vì owner missing |
|Quota exceeded|Pause upload giữ local; báo cần backup/quota action; không clear photos để lấy chỗ |

PostgreSQL và object storage **không atomic với nhau**. Published metadata references phải tới verified assets; staged garbage có thể còn. Cleanup dry-run/retention cần approval: chỉ unreferenced assets không còn active/version/conflict/import references, không dùng tuổi ảnh như permission delete. Không tự cron/GC.

Cleanup/finalize cần manifest state guard riêng: cleanup claim staged row thành closed-for-finalize dưới DB lock trước khi xóa bytes; finalize chỉ nhận verified, unexpired manifest chưa bị cleanup claim. Browser không được overwrite/delete asset; verifier giữ lease khi xác minh. Nếu asset mất hoặc lease hết hạn, re-verify trước publish. Future GC không được race finalize bằng cách chỉ dựa object tuổi cũ.

Dedup ban đầu: same opID+fingerprint và retry immutable path. Có thể reuse bytes hash trong cùng account sau verification nhưng vẫn giữ logical photo IDs/metadata; không dedup theo tên/date và không cross-account hash oracle. Metadata hash/traces cũng là private data.

## 5. Backup độc lập / cloud restore safety

Current VERIFIED: JSON8/photo1 validation; add-missing photos skip trùng ID; local actual synthetic roundtrip/equal bytes ở8B2. Không atomic hai file; browser storage eviction vẫn có thể mất unsynced changes. Không restore hoặc phá dữ liệu thật trong9A.

Future cloud backup cần phân biệt:

- Portable content backup: schema8 của selected device workspace + photo1 đủ bytes **nếu còn trong caps**.
- Complete account content: gồm tất cả accepted records/remote live/drafts/assets ở một headH nhất quán; selective projection hoặc on-demand cache không đủ.
- Sync recovery: cần outbox/conflict variants/receipts/dependencies để resume exactly-once; existing formats không chứa phần này. Không đưa tokens/keys vào recovery package.

Không tự gọi portable pair là “full account backup”. Trước export account content: pin/capture H, enumerate manifest, fetch/verify missing originals+thumbs, check every ID/size/hash và caps. Không có bytes thì báo incomplete/abort, không quietly export cached subset. Quota/storage/memory có thể chặn tải tất cả xuống một iPhone.

Hiện photo1 tối đa200MBbinary/encoded280MB và data file10MB; không phù hợp guaranteed backup5,000ảnh. Future multipart files + integrity inventory + draft/outbox recovery contract cần D8 và design/validation riêng **trước** release hỗ trợ kho lớn. Không thay current formats ở9A. Provider DB backup không chứa Storage objects, nên chỉ có SQL backups vẫn mất ảnh. [Provider backup scope](https://supabase.com/docs/guides/platform/backups).

Cloud-mode restore đề xuất mở **detached recovery workspace**, không tự diff absence thành cloud tombstones. Sau validate, user preview/import/collision review riêng. Local-only restore hiện tại không thay đổi. Restore accountA vào accountB không tự rename UID/retarget pending queue. Photo same ID/different bytes phải review; current skip behavior không làm integrity proof.

## 6. Existing-data migration rehearsal plan

**PROPOSED, chưa migrate.** localStorage thuộc origin; localhost và Vercel không tự chia sẻ dữ liệu. [Origin-bound localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

1. Trên origin nguồn, dừng thao tác mới trong lúc export; kiểm tra pending draft/save errors. Lưu **hai file thật** dataJSON + photoJSON ngoài browser, kiểm tra đọc/parse/checksum. Không chỉ bấm tạo link rồi cho là đã tải. Nếu vượt cap, STOP: thiết kế backup transport mới trước migrate.
2. Rehearse trên fixture origin/account tách riêng. Snapshot JSON và ảnh đọc độc lập; cần manifest/baseline recheck sau export để phát hiện mutation giữa hai phần; không tuyên bố paired export atomic.
3. Preview counts/IDs/array order/session ownership/snapshots/raw drafts/settings/photo owners/hash/bytes; unknown/ambiguous valid records giữ nguyên. Strict invalid records BLOCK và export diagnostics riêng, không wipe.
4. Login target UID, fetch verified cloud state/head. Preview empty/nonempty, collisions, same journal date, device drafts, tombstones và capacity. No automatic overwrite/merge.
5. User lựa chọn local-only, open cloud without import, hoặc explicit import. Import content không gồm auth/outbox cũ. Không retarget account theo cùng email.
6. Create migration ledger/importID; keep original local stores. Import per aggregate/compound operation theo protocol; atomic toàn bộ dataset không được hứa. Each successful chunk có receipt; retry same ID; dependent photos dùng prepare/finalize.
7. Cloud đã có record: full equality và source provenance cần review để skip; mismatch conflict. Cross-kind sameID không sai. Cùng key trùng nhưng khác payload/hash không random rename rồi giả lịch sử intact; remap nếu user duyệt phải exhaustive dependencies, giữ legacy snapshot/source semantics.
8. Sau import pull vào fresh account workspace rồi compare source JSON domains/IDs/order/snapshots, photo metadata/original+thumb **exact bytes**, expected cloud envelopes; second-device preview và roundtrip. Không chỉ so counts.
9. Partial failure: stop upload, retain source/backups/ledger/local candidates/staged assets. Resume accepted receipts, re-evaluate conflicting changed cloud; không replay all bằng IDs mới.
10. Rollback: quay local-only original hoặc detached backup. Cleanup cloud import cần confirmation + CAS **chỉ records tạo bởi import và chưa bị máy khác sửa**, không xóa existing cloud. Nếu không thể xác minh, giữ và review, không destructive automatic rollback. Không xóa origin nguồn sau “migration xong”.

Settings/planning drafts giữ đúng baseline/source. Ambiguous legacy workout không đoán slot ownership để pass sync. Migration có account/storage metadata mới ở envelope, payload portable vẫn8 nếu contract giữ được; mọi persistent migration chỉ triển khai ở phase được duyệt, có tests/rollback.

## 7. Account deletion và operator recovery

Future action riêng: export completeness preview → recent reauth → explicit irreversible confirmation → disable account server first (block new writes/download authorization) → orchestrate Storage assets/DB/Auth deletion với durable progress. Các hệ thống không có distributed transaction; lỗi giữa chừng cần resume/admin recovery. Không nói delete DB row đã xóa file hoặc provider retained backups ngay lập tức.

Local pending workspace có thể vẫn còn theo user's remove-local choice; logout không tự delete. Provider retention/log/backups/SMTP cần review tại thời điểm release, chưa xác minh toàn bộ hợp đồng retention bên ngoài ở9A. Không hứa instant erasure/E2EE/medical privacy certification.

## 8. Real-device security/reliability checklist — NOT VERIFIED

Fixtures only; separate test project/origins, no real-user destructive restore.

- iPhone Safari và laptop: same account/OTP, A→B/B→A, data and all photo bytes; wrong UID/project deny.
- Android Chrome/Firefox, desktop Chrome/Edge/Firefox, macOS Safari: capabilities/Web Locks/IDB/auth refresh/download actual file chooser.
- Airplane mode, reload/cold launch separately; screen lock/tab suspension/restart, pending outbox survive or explicit failure. Không dùng foreground test để pass background.
- Clock skew, token expiry, long-offline floor, multi-tab async account switch/old ack; no data leak/bypass.
- Large100/1,000/5,000photo datasets, DB/IDB usage, upload/download/hash time, quota/eviction/power interruption limits, full backup completeness.1000/5000backup vượt current caps là expected blocked chưa giải quyết.
- Conflict8cases; photo partial upload/finalize/delete; staged GC dry-run; restore detached never writes cloud before confirmation.
- Auth/Storage/RLS negative API tests, CSP/XSS/plain text, no secrets/private files in deploy artifact, no sensitive logs or preview-production access.

Tests local439 không thay thế checklist này. **STOP9A.**
