# Tracker — chuẩn bị Supabase thật

> Cập nhật Cloud Batch3: người dùng đã chọn preview Singapore và duyệt build-time public config. Hướng dẫn hiện hành ở `CLOUD_BATCH3_SETUP_GUIDE.md`; phần dưới là review trước triển khai. Gate build trống/CORS loopback đã được mở rộng có kiểm soát, writes vẫn false. Không thao tác hosted.

11/10/2026 · REVIEW / CHECKLIST ONLY · chưa kết nối project thật.

## Trạng thái xác minh

- Baseline Git: main `a9d1a78`, sạch trước khi tạo tài liệu này.
- Có 5 báo cáo CLOUD_BATCH1 và 6 CLOUD_BATCH2; không thấy CLOUD_BATCH3 trong repository.
- Kiểm tra cơ chế config/Auth, packaging, gateway/server, SQL001/002 và các báo cáo QA/security liên quan. Đây là review cấu hình và đường kết nối, không phải chứng nhận kiểm toán từng dòng toàn bộ ứng dụng.
- Kết quả 634 tests,112 syntax,SQL45/121 thuộc checkpoint QA trước; không chạy lại trong tác vụ chỉ viết tài liệu này.
- Singapore/Free do người dùng cung cấp; chưa kiểm tra Dashboard, credentials, migration hay network của project.
- Không thay mã app/config, không đọc/chỉnh browser storage, không chạy migration/deploy/upload/push.

## 1. Lấy hai giá trị public

Trong Dashboard của đúng project, mở **Connect** để lấy Project URL và publishable key; cũng có thể tìm key trong Settings → API Keys.

- URL dạng `https://<projectref>.supabase.co`, không thêm `/auth/v1`, `/rest/v1` hoặc dấu `/` cuối.
- Key dạng `sb_publishable_...`. Adapter hiện không nhận legacy anon JWT.
- Không dùng `sb_secret_...`, service_role, JWT signing secret, database password hoặc DATABASE_URL trong frontend.
- Có thể lưu hai giá trị public vào ghi chú cấu hình riêng; hiện chưa có ô Settings cho provider, runtime JSON loader hoặc build env injection.

Nguồn: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## 2. Đúng vị trí frontend — chưa kích hoạt

Module hiện có là `js/cloud-config.js`; `js/app.js` import `CLOUD_AUTH_CONFIG` từ đó. Khi được duyệt kích hoạt provider, chỉ module cấu hình này hoặc cơ chế tạo module ở build được duyệt mới nhận giá trị public. Không rải cấu hình vào các module khác.

Ví dụ minh họa cấu hình cho giai đoạn sau, **không chép để bật ngay**:

```js
export const CLOUD_AUTH_CONFIG = Object.freeze({
  enabled: false,
  environment: 'preview',
  projectUrl: 'https://<projectref>.supabase.co',
  publishableKey: 'sb_publishable_<PUBLIC_KEY>',
  gatewayUrl: ''
});
```

`enabled:false` giữ Auth tắt, nhưng ngay cả điền hai trường khi false cũng làm `npm run build` từ chối: `scripts/static-package.js` yêu cầu cả ba URL/key trống và disabled. Đó là gate hiện có, không phải lỗi cần xóa tùy tiện.

**Hiện tại chưa có vị trí nhập non-source được ứng dụng đọc.** Tạo `.env` hay nhập biến vào Vercel không tự cấu hình Vanilla JS. Không sửa `dist` bằng tay: build sẽ ghi lại và integrity check phát hiện khác biệt.

Nếu muốn cấu hình không nằm trong source, bước được đề xuất để duyệt riêng là build nhận public environment variables và tạo cùng module config trong artifact, giữ allowlist/scan và test. Tác vụ này chưa triển khai cơ chế đó.

`gatewayUrl` là origin HTTPS của gateway Tracker riêng, không phải Project URL hay Supabase REST endpoint; adapter hiện chỉ nhận origin, không path prefix. Frontend/backend cần cùng projectref và `preview` hoặc `production`.

## 3. Các việc thủ công trong Supabase Dashboard

- [ ] Xác nhận đây là project dành cho synthetic preview hay production cá nhân. Không tự coi project mới là nơi được phép đưa dữ liệu thật.
- [ ] Chuẩn bị hai tài khoản email test A/B đã xác nhận; adapter gửi `create_user:false`, không có signup tự động.
- [ ] Bật Email Auth; template Magic Link chứa `{{ .Token }}` để gửi OTP6 số. Tracker chưa xử lý callback magic link.
- [ ] Kiểm tra delivery, giới hạn gửi và người nhận được phép của email mặc định. Cấu hình SMTP riêng nếu cần; secret chỉ ở Supabase/server, chi phí cần duyệt.
- [ ] Khi có URL frontend được duyệt, cấu hình Site URL/redirect allowlist chính xác. URL này không thay thế CORS gateway.
- [ ] Giữ `tracker_sync` ngoài exposed Data API schemas. Không tạo policy public để browser truy cập trực tiếp.

Nguồn: [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 4. SQL001/002 và RLS — cần duyệt trước khi chạy

- `cloud/migrations/001_foundation.sql`: transaction, chạy một lần; cần `auth.users` Supabase có sẵn, tạo private schema và 6 bảng account/device/operation/record/version/ledger. Không rerun trên schema đã tồn tại, không DROP để vượt lỗi.
- Tạo helper owner `tracker_sync_owner` NOLOGIN/NOBYPASSRLS và nhóm `tracker_gateway`; browser roles/PUBLIC không có quyền private schema/table/helper. Các bảng bật ENABLE + FORCE RLS, scope theo UID/environment/project. Helpers SECURITY DEFINER với search_path rỗng.
- Gateway là trust boundary: policy dùng scope do helper đặt, không phải browser trực tiếp `auth.uid()`. Credential gateway bị lộ có rủi ro xuyên tài khoản; tuyệt đối không cấp cho client.
- `002_sync_counts.sql`: chạy sau001; thay pull/bootstrap để thêm recordCount/snapshotRecordCount, giữ ownership/grants. Không migrate local schema8 hay ảnh.
- Hosted Supabase admin có đủ quyền CREATE ROLE/ALTER OWNER/GRANT cần thiết hay không chưa xác minh. Phải kiểm tra quyền trước; không hạ RLS hoặc dùng admin runtime để né lỗi.
- Không chạy `cloud/tests/run-db.js`, `run-sync-db.js` hay fixture bootstrap trực tiếp trên project thật: chúng tạo môi trường auth giả.
- Ghi checksum001/002, kiểm tra transaction thành công và catalog/RLS/grants sau chạy. Nếu lỗi, dừng và review; không purge/reset.

## 5. Gateway và database connection

`cloud/server.js` đọc **process environment**:

| Biến | Nơi cấu hình | Ý nghĩa |
| --- | --- | --- |
| SUPABASE_PROJECT_URL | Backend environment | Cùng Project URL frontend |
| SUPABASE_PUBLISHABLE_KEY | Backend environment | Public key cho authoritative Auth `/user` lookup |
| TRACKER_ENVIRONMENT | Backend environment | Khuyến nghị preview cho synthetic QA, phải khớp frontend |
| DATABASE_URL | Backend secret manager/environment | Login riêng thuộc tracker_gateway, không phải postgres/admin |

Không có dotenv loader. `.env` được gitignore nhưng server không tự đọc file. Một bootstrap/env-file mechanism phải được chọn rõ trước khi chạy. Không dán password vào terminal history/chat/source/dist.

Runtime DB login phải NOBYPASSRLS, không superuser/create-role/create-db/replication hoặc member helper owner. Startup kiểm tra quyền. URL cần đúng một `sslmode=verify-full`, CA hợp lệ; không tắt xác minh TLS. Dùng connection string từ Dashboard Connect phù hợp IPv4/IPv6, direct/session/transaction pooler và role riêng; custom-role/pooler tương thích còn NOT VERIFIED.

**Server hiện chưa sẵn sàng browser sync thật:**

- Bind `127.0.0.1:8832` qua HTTP, còn client yêu cầu gateway HTTPS.
- `createHttpServer(gateway)` không cấu hình allowedOrigin; browser cross-origin bị403.
- `allowWrites:false` cố định; `/push` bị writes_disabled, không có env switch bật upload.
- Không phải Vercel function, không tự deploy lên Supabase. Cần quyết định gateway hosting/TLS/CORS/rate limits/secret handling và duyệt patch riêng.
- Account/device phải đăng ký bằng operator helper `register_account_device` với UID/project/environment/deviceID đúng. Auth user tự có chưa đủ để bootstrap; chưa có public provisioning endpoint.

Nguồn: [Database connections/TLS](https://supabase.com/docs/guides/database/connecting-to-postgres), [Postgres roles](https://supabase.com/docs/guides/database/postgres/roles).

## 6. Thứ tự kiểm thử thật sau khi được duyệt

1. Sao lưu JSON + ảnh local bằng UI; không reset/restore origin8765.
2. Duyệt project preview + hai account synthetic + email setup.
3. Duyệt và áp dụng001 rồi002, kiểm tra RLS/private grants, tạo restricted login và xác minh TLS/custom-role connection.
4. Đăng ký đúng synthetic account/device; kiểm thử read-only gateway/OTP/JWT expiry/wrong-project/A-B denial.
5. Duyệt provider packaging config, HTTPS gateway/CORS chính xác; dùng frontend disposable origin.
6. Duyệt bật writes **synthetic-only**, kiểm thử workout ACK/cross-device/conflict/offline/late callback; native PostgreSQL hai connection thực.
7. Kiểm tra Safari/thiết bị thật, tải backup/restore disposable, không lẫn anonymous/account, không gửi ảnh hoặc dữ liệu cá nhân.
8. Báo cáo thực tế PASS/FAIL/NOT VERIFIED. Triển khai production và import dữ liệu cá nhân là các phê duyệt riêng sau này.

## 7. Cần người dùng duyệt gì?

Chưa cần cung cấp secret. Cần quyết định: project này dùng preview hay production; cho phép synthetic Auth/email tests; cho phép001/002 + restricted-role provisioning; gateway hosting/TLS/CORS/cost; cơ chế public config injection; bật synthetic writes. Deploy, personal import và photo migration vẫn chưa được phép.

Rollback ban đầu: giữ config tắt, dừng gateway/revoke runtime login nếu cần, giữ dữ liệu cloud/local. Không drop schema hay reset browser storage để rollback.
