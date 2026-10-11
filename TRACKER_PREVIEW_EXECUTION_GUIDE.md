# Tracker — triển khai preview đang chờ duyệt

11/10/2026 · Tiếp tục workflow R1–R16. Đây là hướng dẫn thao tác; chưa thực hiện bước remote nào.

## Đã chuẩn bị trên máy

- Project URL đã chuẩn hóa về origin, bỏ `/rest/v1/`. Publishable key đã được người dùng xác nhận.
- Hai giá trị public nằm trong `.env.preview.local`, được Git bỏ qua. Không ghi vào source hoặc tài liệu này. Chưa có gateway URL hoặc cờ kích hoạt; preview build còn thiếu cấu hình và phải bị từ chối.
- `npm run build` vẫn tạo bản local-only. Không mở bản cloud enabled trên origin8765.
- Gateway có write gate mặc định tắt, kiểm đúng project preview và allowlist UID trước khi ghi SQL. JWT vẫn phải xác minh với Auth của project cố định.
- `gateway-dist` chỉ chứa12 runtime files; không có migrations, operator, test, reports, `.env`, dữ liệu hoặc ảnh. Đây là backend executable; không phục vụ thư mục này như static website.
- Packet SQL local: `.local/preview-install.sql` và `.local/preview-install-packet.json`. Chỉ chuẩn bị offline; không nhấn Run trước approval và hosted preflight.

## 1. Hosting đề xuất — cần duyệt trước khi tạo/deploy

**Frontend Vercel Hobby + gateway Render Free**, chỉ preview synthetic. Vercel nhận48-file static artifact, không upload repo root. Render chạy Node gateway hiện có với PostgreSQL Supabase; không tạo database Render.

Render Free ngủ sau15 phút idle, cold start khoảng1 phút; timeout15s của client có thể hết trước lúc service tỉnh. Giữ queue, thử sync lại sau khi gateway tỉnh; cần đo thực tế, không ping keep-alive để né quota.750 free instance-hours/workspace/tháng; vượt quota có thể bị dừng hoặc phát sinh bandwidth/build charges nếu gắn phương thức thanh toán. Gateway không lưu dữ liệu vào filesystem ephemeral. [Render Free](https://render.com/docs/free).

Vercel Hobby dành cho mục đích cá nhân phi thương mại, chịu giới hạn plan. Chưa đăng ký/nâng cấp, chưa thêm payment/domain. [Vercel Hobby](https://vercel.com/docs/plans/hobby).

Render cần nguồn triển khai executable. **Chưa phê duyệt Git connection, artifact repository/image registry hoặc push**. Không dùng repo root/private planning files làm deployment source. Chọn đường chuyển12-file artifact sau khi người dùng duyệt hosting/account; nếu cần repository riêng hoặc registry thì phải duyệt đích và upload cụ thể. Không tự push repo Tracker.

Lệnh chuẩn bị local:

```powershell
cd "C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym"
node scripts/gateway-package.js
node scripts/gateway-package.js --check
node scripts/gateway-package.js --inventory
```

Sau approval hosting, trong root của **gateway artifact**, build command `npm --prefix cloud ci --omit=dev --ignore-scripts --no-audit --no-fund`; start command `node cloud/server.js`. Gateway package có lockfile cho pg đã có; không thêm dependency.

## 2. Auth — thao tác Dashboard sau approval

1. Mở project Singapore đã chọn, xác nhận đúng project reference với `.env.preview.local`.
2. Authentication → Email provider: bật Email; không mở public signup. App dùng `create_user:false`.
3. Email Templates → Magic Link: dùng `<p>Mã Tracker: {{ .Token }}</p>`. Chọn OTP length6 nếu có; nghiệm thu email thực nhận6 số.
4. Chuẩn bị hai Auth users confirmed A/B bằng email test bạn kiểm soát. Chỉ dùng dữ liệu synthetic. Không gửi OTP/password lên chat.
5. SMTP mặc định chỉ gửi địa chỉ thuộc team project và giới hạn2 thư/giờ; hai email ngoài team cần custom SMTP. SMTP/provider/domain/chi phí là quyết định riêng; secrets nhập trực tiếp Dashboard. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
6. URL Configuration: Site URL bằng HTTPS frontend được duyệt; chỉ thêm redirect thực sự cần. OTP nhập tay không cần wildcard callback.

Đọc thêm `CLOUD_BATCH3_SETUP_GUIDE.md` phần B. Bước này cần bạn chọn hai hộp thư và xác nhận chính sách SMTP; hiện chưa có email test/UID thật.

## 3. Database — approval riêng, chưa thực thi

1. SQL Editor → New query → chạy `cloud/hosted-preflight.sql` **chỉ sau khi cho phép remote read-only**. Kết quả không chứa secrets. `tracker_sync` phải chưa tồn tại khi cài001; nếu đã có thì đối chiếu state, không DROP/rerun.
2. Sau approval migrations/roles, review hash001/002 trong packet; chạy đúng `.local/preview-install.sql` trên project preview. Wrapper có một transaction, kiểm quyền, chuyển ownership bằng grant tạm đúng hướng, giữ grantor/INHERIT/SET cũ. Runtime mới vẫn **NOLOGIN**.
3. Kiểm6 tables FORCE RLS, helper ownership, effective/default/PUBLIC grants, browser roles không có table/helper privileges. `operator inspect` chỉ là catalog evidence; cần denial requests thật và TLS thật.
4. Restricted runtime: chỉ `tracker_preview_runtime` thuộc `tracker_gateway`; không postgres/service_role, không helper-owner/admin/BYPASSRLS. Password đặt riêng bằng quy trình operator an toàn (psql interactive `\password` và secret manager); không literal password trong SQL Editor/file/chat/log. LOGIN activation cần approval riêng.
5. Lấy connection host/port từ Dashboard Connect. Custom-role pooler username `tracker_preview_runtime.PROJECTREF`, session port5432. Bắt buộc `sslmode=verify-full`, CA hợp lệ; không tắt certificate check. Startup sẽ từ chối role không an toàn. Kết nối hosted chưa xác minh.

Operator preparation không kết nối:

```powershell
node cloud/operator.js prepare --review .local/preview-operator-review.json
node cloud/operator.js inspect --review .local/preview-operator-review.json
```

`prepare` trả packet SQL, `inspect` mặc định dry-run. Remote `inspect/provision` đòi `--execute`, approval command/project khớp và `TRACKER_OPERATOR_DATABASE_URL` chỉ trong ignored server env. Không tự đặt approval flags.

## 4. Frontend / gateway config sau khi có URL thật

Gateway server secrets/config: `DATABASE_URL` server-only, `SUPABASE_PROJECT_URL`, `SUPABASE_PUBLISHABLE_KEY`, `TRACKER_ENVIRONMENT=preview`, `TRACKER_ALLOWED_ORIGIN=<exact frontend HTTPS origin>`, `PORT` do host cấp.

Giữ `TRACKER_ENABLE_PREVIEW_WRITES=false` ban đầu. Health là liveness; không chứng minh TLS/Auth/database. Exact CORS không thay JWT. Requests được giới hạn120 POST/phút/process; restart reset window, chưa phải distributed production rate limit. Không log request body/Authorization.

Sau khi frontend/gateway HTTPS được duyệt: điền `TRACKER_PUBLIC_GATEWAY_URL` và `TRACKER_PUBLIC_CLOUD_ENABLED=true` trong ignored public env; build/check dùng cùng file:

```powershell
node --env-file=.env.preview.local scripts/static-package.js
node --env-file=.env.preview.local scripts/static-package.js --check
node --env-file=.env.preview.local scripts/static-package.js --inventory
```

Chỉ upload48-file `dist` bằng đường được duyệt. Auth/API secrets, database URL, tokens không được inject vào frontend.

## 5. Đăng ký account/device và controlled writes

1. Đăng nhập account synthetic, Settings → Mở dữ liệu tài khoản → **Thông tin thiết bị cho setup preview**. Copy đúng UID/project/environment/deviceId. Mỗi browser installation có device ID riêng; accounts trong cùng installation có thể dùng chung device ID. Xem ID không sync/upload.
2. Đối chiếu UID với confirmed Auth user và đúng project; thêm registrations vào private review file cùng `confirmedAuthUser:true`, `confirmedDevice:true`, `synthetic:true`. Không bịa device ID.
3. Operator provisioning sau approval chạy parameterized registration transaction; temporary SET membership được phục hồi. Không nhập local anonymous history vào account.
4. Sau approval **bật ghi/upload synthetic riêng**, đặt `TRACKER_ENABLE_PREVIEW_WRITES=true`, `TRACKER_WRITE_PROJECT_REF=<đúng ref>`, `TRACKER_WRITE_USER_IDS=<UID A,UID B>`. Code từ chối environment production/ref lệch/UID ngoài list. Rollback: đặtfalse và restart; queue/data không bị xóa.
5. Run native QA chỉ trên hai account chuyên dụng chứa exclusively `native-qa:` records, không dùng account browser có dữ liệu khác. Runner chỉ direct verified-TLS5432, hai sessions/PIDs và lock-wait evidence. Cần restricted secret và JSON review expiring≤24h; runner không tự provision hoặc cleanup. Chưa chạy native PostgreSQL.

## 6. Acceptance thực và rollback

Hai browser độc lập: A login → Start → set1 → ACK → set2 → Complete → browser2 pull → so exact IDs/order/weights/reps/RIR/snapshots. Thêm food/meal snapshot và journal; test conflicts, A→B→A, logout pending, expiry/reauth, lost ACK, offline edits/reload. Ảnh/recovery/migration có contract riêng cần duyệt trước implementation.

Laptop+iPhone Safari vật lý: test320/360/390, actual downloads, background/airplane/reopen và account isolation. Emulation/local synthetic không thay proof này. Cold-open offline hiện chưa có Service Worker, không tuyên bố shell hoạt động offline.

Rollback preview: disable writes, giữ outbox/source/backups; revert artifact về local-only hoặc bản gateway đã kiểm. Không DROP schema, xóa Auth users, cloud records/photos hoặc GC. Production/personal import/payment luôn approval riêng.

## Approval cần có, không tự suy diễn từ public key

- Hosting/account và delivery path chỉ runtime artifacts; URL HTTPS chính xác; deploy activation.
- Auth template/test users/SMTP và actual Auth requests.
- Remote read-only preflight; sau review mới install001/002, restricted LOGIN/provisioning.
- Controlled writes và upload synthetic, native SQL QA.
- Photo/account-recovery/legacy-import contract nếu đổi ownership/format.

Project/key public đã đủ chuẩn bị cấu hình; chưa phải approval cho các bước trên.
