# Cloud Batch 3 — hướng dẫn preview cho người mới

11/10/2026. Project Supabase Free Singapore được người dùng chọn làm **preview / synthetic-only**. Chuẩn bị code local đã được phép; các bước remote dưới đây là hướng dẫn, chưa thực hiện. Không import dữ liệu/ảnh thật.

## A. Những gì bạn có thể chuẩn bị ngay trên máy

1. Mở đúng Supabase project Singapore. Không cần gửi database password hoặc secret key cho Codex.
2. Nhấn **Connect**, copy **Project URL**. Trong **Settings → API Keys**, copy **publishable key** (`sb_publishable_...`). Tên menu có thể thay đổi theo Dashboard.
3. Trên máy, dùng editor tạo `.env.preview.local` trong thư mục Gym. File này đã được `.gitignore` loại trừ; không commit và không đặt trong dist. Đây chỉ là biến PUBLIC, nội dung sẽ xuất hiện trong artifact/browser.
4. Điền các dòng sau khi đã có gateway URL HTTPS. Chưa có URL thì giữ file ở trạng thái ghi chú; không chạy preview build với placeholder.

```dotenv
TRACKER_PUBLIC_CLOUD_ENABLED=true
TRACKER_PUBLIC_ENVIRONMENT=preview
TRACKER_PUBLIC_SUPABASE_URL=https://PROJECTREF.supabase.co
TRACKER_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_PUBLIC_KEY
TRACKER_PUBLIC_GATEWAY_URL=https://YOUR-GATEWAY-HOST
```

Không thêm slash cuối, path, credentials vào URL. Chỉ preview được cho phép trong batch này. Không dùng anon JWT legacy. Không sửa `js/cloud-config.js` hoặc `dist` bằng tay. Build tạo đúng module config trong artifact; source vẫn disabled.

Trong PowerShell (Node hỗ trợ `--env-file`, đã có trên máy QA):

```powershell
cd "C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym"
node --env-file=.env.preview.local scripts/static-package.js
node --env-file=.env.preview.local scripts/static-package.js --check
node --env-file=.env.preview.local scripts/static-package.js --inventory
```

Build/check phải dùng cùng bộ biến. Bỏ file env và xóa các biến TRACKER_PUBLIC_* nếu đã đặt trong shell, rồi `npm run build` để trở về artifact local-only. Không cần reset storage. Build không kết nối mạng, nhưng mở artifact enabled có thể bắt đầu luồng Auth; chỉ mở trên origin preview được duyệt, không8765.

## B. Cấu hình Auth Dashboard — sau khi duyệt thay đổi Auth

1. **Authentication → Sign In / Providers → Email**: bật Email provider; giữ email confirmation. Tắt public signup nếu chỉ vận hành hai account test; app dùng `create_user:false`.
2. **Authentication → Email Templates → Magic Link**: template có `{{ .Token }}` để gửi mã nhập tay, ví dụ `<p>Mã đăng nhập Tracker: {{ .Token }}</p>`. Không dùng chỉ `ConfirmationURL` vì app chưa xử lý magic-link callback.
3. Nếu Dashboard có OTP length, chọn **6**; kiểm tra email thực nhận6 số, OTP expiry/rate limit. Không gửi OTP lên chat/log.
4. **Authentication → Users → Add user / Create user**: chuẩn bị A và B bằng hai email test bạn kiểm soát; xác nhận email theo quy trình Supabase. Nếu chọn auto-confirm, chỉ dành account synthetic do operator tạo. App đăng nhập OTP, không dùng password này. Ghi UID A/B vào ghi chú riêng.
5. Email mặc định chỉ gửi tới địa chỉ thuộc team project và hiện giới hạn2 thư/giờ. Hai email tùy ý không tự được gửi thư chỉ vì có auth user. Không mời thêm người vào project chỉ để né giới hạn.
6. Nếu cần hai hộp thư ngoài team, vào **Project Settings / Authentication → SMTP Settings**, bật custom SMTP, nhập sender/email/host/port/username/password của nhà cung cấp mail. Secret này chỉ lưu Dashboard. Cần duyệt provider/domain/chi phí và xác minh SPF/DKIM theo provider; chưa chọn hoặc đăng ký SMTP thay bạn.
7. **Authentication → URL Configuration**: đặt Site URL là frontend preview chính xác; allowlist redirect chỉ URL cần thiết. Luồng OTP nhập tay hiện không có callback; không dùng wildcard rộng để xử lý CORS.

Nguồn: [OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP và giới hạn email mặc định](https://supabase.com/docs/guides/auth/auth-smtp).

## C. SQL migrations — KHÔNG nhấn Run trước khi duyệt

1. Kiểm tra đúng project preview. Mở **SQL Editor → New query**. Sau khi cho phép read-only inspection, dùng `cloud/hosted-preflight.sql`; lưu kết quả không có password/token.
2. Schema `tracker_sync` phải chưa tồn tại khi cài001. Có schema rồi thì dừng để xác định migration state; không DROP hoặc rerun001.
3. Operator kiểm tra CREATE ROLE, membership/SET ROLE và quyền ALTER FUNCTION OWNER. Supabase postgres không phải superuser không giới hạn. Migration001/002 có chuyển owner sang `tracker_sync_owner`; có thể cần grant role này **TO postgres** ở bước operator được duyệt. Role mới chỉ tồn tại bên trong transaction001: nếu cần chuẩn bị membership trước, operator phải review việc tạo trước đúng hai nhóm NOLOGIN/NOBYPASSRLS và grant đúng hướng, hoặc wrapper transaction được duyệt, rồi001 sẽ kiểm tra role có sẵn. Không grant postgres/admin **TO tracker_sync_owner hoặc runtime**. Không tự chèn quyền rộng vào migration để vượt lỗi.
4. Khi migration được duyệt, copy nguyên `001_foundation.sql` vào query riêng và chạy một lần; xác nhận transaction thành công. Sau đó chạy nguyên `002_sync_counts.sql`. Ghi SHA256 và thời gian bằng `Get-FileHash` trên máy. Không chạy các SQL fixture/test runner của repo trên hosted.
5. Trong **Data API / API Settings → Exposed schemas**, không thêm `tracker_sync`. Không dùng Table Editor tạo policy public.
6. Chạy lại read-only preflight:6 bảng ENABLE/FORCE RLS, helper owner đúng, SECURITY DEFINER/search_path rỗng, scope UID/environment/project, grants browser bị loại. Operator còn phải kiểm tra effective/default/PUBLIC grants và thử denied roles trên synthetic project; catalog output không tự chứng minh mọi quyền.
7. Tạo **runtime LOGIN riêng** thuộc tracker_gateway sau approval riêng, không BYPASSRLS/superuser/admin/helper-owner membership. Password trong secret manager, không query history/chat/committed SQL. Runtime không dùng password postgres lúc tạo project.
8. Đăng ký account/device bằng operator helper `register_account_device(UID,'preview',PROJECTREF,DEVICE_UUID)`. UID từ Auth Users, device UUID từ workspace installation của từng origin test. Lấy device IDs và đăng ký là operator bước riêng, chưa có self-service endpoint; không bịa IDs. A/B cần đúng scope và device trước bootstrap/push.

Các file001/002 không sửa trong batch này; chỉ có chứng cứ SQL local, chưa có hosted execution. Nếu ownership/membership, default privileges hoặc custom-role pooler khác dự kiến, dừng và review patch riêng.

## D. Kết nối database và gateway — sau khi duyệt role/hosting

Trong **Connect → Connection string**, copy host/port từ Dashboard, không tự suy host từ Singapore.

- Node server lâu dài: ưu tiên **Session pooler5432** nếu host chỉ IPv4. Direct thường cầnIPv6; Transaction6543 chỉ chọn sau kiểm thử protocol/concurrency.
- Custom role qua shared pooler dùng username `ROLE.PROJECTREF`; direct dùng `ROLE`. URL-encode password.
- Thêm đúng một `sslmode=verify-full`; lấy root CA từ Database settings, cấu hình `sslrootcert` tới file certificate đã kiểm tra nếu cần. Không `rejectUnauthorized:false`/TLS bypass. Máy/container phải có file CA và DNS đúng.
- Kiểm tra role flags, effective grants và server startup read-only trước. Có connection string không chứng minh custom-role/TLS PASS.

Gateway nhận server environment sau; file `.env.gateway.local` nếu dùng local được gitignore. Node không tự load dotenv; dùng `node --env-file=.env.gateway.local cloud/server.js` từ repo root hoặc Dashboard hosting environment. DATABASE_URL chỉ ở đây.

| Biến backend | Giá trị |
| --- | --- |
| SUPABASE_PROJECT_URL | Cùng URL public |
| SUPABASE_PUBLISHABLE_KEY | Cùng publishable key |
| TRACKER_ENVIRONMENT | preview |
| DATABASE_URL | Restricted runtime connection + verify-full |
| TRACKER_ALLOWED_ORIGIN | Một origin HTTPS frontend chính xác, không slash/path/wildcard |
| PORT | Hosting cung cấp; local mặc định8832 |

Chưa có allowedOrigin thì bind loopback và deny CORS. Có allowedOrigin thì bind0.0.0.0:PORT phía proxy; TLS termination do hosting cung cấp. Không tự chứng minh X-Forwarded-Proto là an toàn; origin/backend phải không public plaintext bypass proxy. **Writes luôn false, không có env toggle bật.** GET `/health` trả liveness, không kiểm tra data/Auth lại; startup đã kiểm tra DB role. Giữ POST routes/bearer verification, no-store,2MiB limit. CORS không thay JWT authorization và không chặn non-browser client; production cần rate limit/edge protection được duyệt.

Nguồn: [Connections/TLS/custom pooler username](https://supabase.com/docs/guides/database/connecting-to-postgres), [roles](https://supabase.com/docs/guides/database/postgres/roles), [ownership issues](https://supabase.com/docs/guides/deployment/managing-environments#permission-denied-on-db-push).

## E. Hosting đề xuất — chưa chọn/deploy thay bạn

| Phương án | Phù hợp / giới hạn / chi phí tiềm năng |
| --- | --- |
| **Render Free Web Service — đề xuất preview** | Tái sử dụng Node/pg hiện có, HTTPS managed, PORT, không cần disk. Sleep sau15phút,750 instance-hours/workspace/tháng, restart/ephemeral disk. Cold start có thể quá timeout15s; chờ health rồi retry thủ công, không dùng keep-alive để né giới hạn. Có giới hạn bandwidth/build/outbound traffic; có thể suspend hoặc cần paid upgrade. Không tạo Render DB; dữ liệu ở Supabase. |
| Vercel Hobby gateway function | Có thể hợp personal use nhưng server hiện chưa phải function. Cần adapter và connection lifecycle review, quotas/compute/egress/runtime limits; chưa triển khai. Không gộp gateway vào static artifact hiện có. |
| Supabase Edge Function | Cùng provider, Free limits; cần port Node HTTP/domain imports/pg/TLS sang runtime phù hợp và rà soát JWT routing. Đây là thay đổi lớn hơn Render, chưa triển khai. Quota nâng cấp/invocation/egress có thể phát sinh chi phí. |

Render sau khi duyệt: repo root giữ `cloud` và `js` vì gateway import validators từ js; build `npm --prefix cloud ci --omit=dev --ignore-scripts --no-audit --no-fund`; start `node cloud/server.js`; health `/health`; instance Free, region gần Singapore nếu Dashboard cho phép; chỉ nhập biến backend vào service. Không publish toàn bộ repo như static directory. Không auto-connect GitHub/deploy ở tác vụ này. Paid always-on/SMTP/Supabase nâng cấp cần duyệt ngân sách; xem giá Dashboard hiện tại thay vì giả định luôn miễn phí.

Nguồn kiểm tra11/10/2026: [Render Free](https://render.com/docs/free), [Web services/HTTPS](https://render.com/docs/web-services), [Pricing](https://render.com/pricing), [Vercel limits](https://vercel.com/docs/functions/limitations), [Edge limits](https://supabase.com/docs/guides/functions/limits).

## F. Danh sách approval và acceptance remote

**Đã duyệt:** preview Singapore synthetic-only, code + local tests, public build mechanism. **Chưa duyệt/thực hiện:** Auth/SMTP changes và account creation, remote read-only preflight,001/002/runtime role, account/device registration, hosting/deploy/frontend activation, real Auth/DB requests, synthetic upload/writes, production/personal import/photos/GitHub push.

Sau approval remote: test OTP delivery6digits,wrong/expiredJWT,A/Bisolation,TLS and denied SQL roles; kiểm tra HTTPS/CORS/health/write-disabled; so anonymousbackup trước/sau trên disposable origins. Chỉ sau approval bật writes bằng patch mới chạy synthetic workout ACK/cross-device/conflict/offline/concurrency. Không dùng origin8765 cho QA.

Rollback: build không có biến public để tắt Auth, dừng gateway hoặc revoke runtime login có kiểm soát; giữ local/cloud records. Không DROP schema/reset browser để rollback. Pending account outbox và photos vẫn cần backup riêng theo Batch2; JSON account projection không phải toàn bộ sync-workspace backup.
