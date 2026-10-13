# Tracker — Supabase hosted migration runbook (001 → 002 → 003)

Ngày rà soát local:13/10/2026; SELECT preflight thật cập nhật14/10/2026. Target: **preview**, Supabase Free Singapore, project ref `wwcfzotkxpqtelfvvhpd`.

## 1. Kết luận và ranh giới

**CÒN BLOCKER cho cả bộ001→002→003:** bucket private chưa tồn tại và ngoại lệ thay CHECK constraint chưa được duyệt. **Preflight quyền chỉ đọc đã PASS**;001/002 có đủ bằng chứng quyền để trình duyệt cài đặt riêng. DDL chưa được thực thi/xác minh.

Bản sửa và các packet SQL đã được kiểm thử local. Ngày14/10 user duyệt và Codex đã chạy **SELECT catalog/quyền** qua SQL Editor đúng preview project. Chưa chạy migration/DDL, chưa tạo role/bucket/policy thật, chưa deploy hoặc upload. Không đụng dữ liệu Tracker, origin `8765`, schema payload 8 hoặc định dạng backup. Không push GitHub.

Preflight do bạn cung cấp: `current_user=postgres`; chưa có `tracker_sync`, `tracker_sync_owner`, `tracker_gateway`; `auth.uid()` thuộc `supabase_auth_admin`; `storage.objects` thuộc `supabase_storage_admin`; postgres không MEMBER của hai role này. Đây là bằng chứng về owner/membership, **chưa chứng minh các quyền riêng lẻ hoặc quyền policy được provider ủy quyền**.

Cập nhật bằng chứng và gates:

1. **Đã xác minh thật:** PostgreSQL17.11/postgres, `CREATEROLE=true`; CREATE schema/database, USAGE Auth, REFERENCES `auth.users`, EXECUTE `auth.uid()`, USAGE Storage và SELECT buckets đều TRUE. Schema/roles Tracker chưa tồn tại. Default ACL của postgres chỉ có public/storage, không có global recipient bất ngờ.
2. **Đã quan sát cấu hình provider:** `session_preload_libraries=supautils`, GUC đã đăng ký, `supautils.policy_grants` liệt kê postgres→storage.objects. Thiết kế Dashboard policy tương thích cơ chế được provider mô tả. **Chưa chạy CREATE POLICY**: thành công của đủ7 policies, gồm5 restrictive, vẫn là gate DDL sau phê duyệt; không tự tạo policy thử rồi DROP.
3. Phê duyệt riêng trước mọi thao tác ghi bên dưới. **Runbook này không phải phê duyệt.**
4. 003 hiện có sẵn `ALTER TABLE tracker_sync.sync_records DROP CONSTRAINT sync_records_kind_check`, rồi ADD CHECK mở rộng kind cho ảnh trong cùng transaction. Không DROP bảng/schema/dữ liệu, nhưng đây vẫn là DROP CONSTRAINT. Với yêu cầu “không DROP” hiện tại, **chặn chạy 003** đến khi bạn duyệt rõ ngoại lệ thay CHECK constraint hoặc yêu cầu phương án migration khác. Phiên này không thực hiện thao tác đó trên Supabase.
5. SELECT đúng bucket `tracker-preview-photos` trả0 rows: cần duyệt tạo bucket private ở bước B trước003, không tự tạo bằng SQL. Kết quả chi tiết: `SUPABASE_PREFLIGHT_READONLY_REPORT.md`.

## 2. Lỗi có thể gặp và bản sửa tối thiểu

| Thao tác | Rủi ro trên hosted | Cách xử lý |
|---|---|---|
| CREATE ROLE trong 001 | postgres không phải superuser; thiếu CREATEROLE hoặc hạn chế provider | Packet kiểm tra CREATEROLE/CREATE trước DDL. Nếu không đạt: dừng, không cấp superuser/admin |
| FK tới `auth.users` | Có Auth schema không đồng nghĩa có REFERENCES | Kiểm tra USAGE + REFERENCES trước 001; không đọc email/record và không đổi owner Auth |
| ALTER FUNCTION OWNER trong 001/002/003 | Cần quyền chuyển sang helper và CREATE trong schema đích | Dùng operator wrapper: membership **chỉ role ứng dụng** `tracker_sync_owner` tạm thời cho postgres, CREATE tạm trong schema ứng dụng, khôi phục membership của đúng grantor. Không cấp helper cho gateway/browser |
| GRANT trên `auth.uid()` | EXECUTE không đồng nghĩa quyền GRANT; owner thuộc managed Auth | 003 bỏ GRANT vào managed Auth. Dùng cầu nối cố định `tracker_photo_policy.request_uid()` đọc duy nhất `auth.uid()` |
| CREATE POLICY trên `storage.objects` | PostgreSQL thường yêu cầu table owner; hosted có thể ủy quyền qua Supautils | Tách đúng 7 policy sang packet SQL Editor riêng. Không đổi owner hoặc thêm managed-admin membership. Nếu context provider không cho phép: blocker, liên hệ Supabase |
| Tạo bucket bằng INSERT metadata | SQL ghi trực tiếp vào Storage metadata không phải luồng được khuyến nghị | 003 chỉ kiểm tra bucket đã private. Tạo bucket bằng **Dashboard Storage**, không INSERT/UPDATE `storage.buckets` |

Supabase mô tả postgres là role không có đầy đủ quyền superuser: [roles and superuser](https://supabase.com/docs/guides/database/postgres/roles-superuser). Điều kiện chuẩn khi [ALTER FUNCTION OWNER](https://www.postgresql.org/docs/current/sql-alterfunction.html), [GRANT](https://www.postgresql.org/docs/current/sql-grant.html) và [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) vẫn phải được xem xét cùng quyền provider.

Supautils có cơ chế ủy quyền quản lý policy trên bảng không sở hữu: [tài liệu maintainer — policy grants](https://github.com/supabase/supautils). Preflight14/10 đã thấy cấu hình ủy quyền đúng postgres/storage.objects và session preload; đây là bằng chứng phù hợp thiết kế, **chưa phải kết quả chạy policy DDL**. Không tự SET cấu hình Supautils hay cấp `supabase_storage_admin`/`supabase_auth_admin`.

### Cầu nối UID — ngoại lệ owner được ghi rõ

`request_uid()` là SQL SECURITY DEFINER, **owner postgres**, không tham số, `search_path=''`, thân hàm chỉ `SELECT auth.uid()`. Chỉ helper `tracker_sync_owner` được EXECUTE ngoài quyền vốn có của owner; ACL mặc định bất ngờ trên hàm mới cũng bị gỡ. Hàm không nhận UID từ frontend, không truy vấn bảng và không cung cấp SQL động.

`allowed(text,boolean)` và các helper đồng bộ vẫn thuộc `tracker_sync_owner` NOLOGIN/NOBYPASSRLS. Các bảng private giữ ENABLE + FORCE RLS. Browser không được gọi cầu nối; authenticated chỉ được gọi predicate `allowed`. JWT/request UID vẫn do Supabase Auth cung cấp. Không expose `tracker_sync` hoặc `tracker_photo_policy` qua Data API.

Packet 001/002 rollback nếu ACL hàm private còn grantee ngoài owner/gateway sau cleanup runtime. 003 dựng lại ACL hàm trong hai schema ứng dụng từ caller allowlist, kể cả quyền mặc định qua role trung gian; không chỉnh global default ACL hoặc hàm của Auth/Storage. Nếu packet chặn default ACL lạ, giữ nguyên database và review quyền tối thiểu trước khi thử lại.

## 3. Dashboard preflight — chỉ đọc

**Đã thực hiện14/10 sau approval riêng:** các quyền cần thiết TRUE, managed owners/membership/RLS xác minh, Tracker catalog trống, Supautils preload/delegation xác minh, bucket chưa có. Bước đọc dưới đây dành cho lần đối chiếu trước khi áp dụng hoặc nếu project có thay đổi; không cần chạy lại chỉ để lặp bằng chứng hiện tại. Không suy ra thành công DDL từ PASS chỉ đọc.

Mở đúng project Singapore trong Supabase Dashboard. Kiểm tra project ref `wwcfzotkxpqtelfvvhpd` trong URL/project settings. Vào **SQL Editor → New query**, chọn execution role postgres nếu giao diện có lựa chọn. Không paste file migration ở bước này.

Mở `cloud/hosted-preflight.sql`, copy toàn bộ SQL vào editor và Run. File chỉ đọc catalog/quyền/cấu hình, không đọc bản ghi sức khỏe hay credential. Lưu kết quả ngoài Git trong `.local`. Các quyền cần TRUE; giá trị NULL/missing không được coi là PASS. Role helper/gateway chưa tồn tại ở lần đầu là expected.

Nếu truy vấn setting provider bị từ chối quyền, lưu lỗi riêng và chạy các SELECT quyền/catalog còn lại; không nâng quyền để đọc setting. Kiểm tra thêm default ACLs bằng query chỉ đọc:

```sql
SELECT pg_get_userbyid(defaclrole) AS role,
       CASE WHEN defaclnamespace=0 THEN '(global)'
            ELSE defaclnamespace::regnamespace::text END AS schema,
       defaclobjtype, defaclacl
FROM pg_default_acl
WHERE defaclrole=(SELECT oid FROM pg_roles WHERE rolname=current_user);
```

Với Storage policy authority: `provider_policy_grants` có thể NULL/không áp dụng; membership FALSE cũng không kết luận quyền bị từ chối. Cần thông tin provider về execution context SQL Editor hoặc kết quả policy DDL **sau phê duyệt**. Không chạy thử CREATE POLICY rồi DROP để dò quyền ở bước chỉ đọc này. Không chỉnh managed role/grants/settings.

Nếu thiếu REFERENCES/EXECUTE/SELECT hoặc CREATE: báo tên quyền thiếu; yêu cầu provider xác nhận cách cấp **quyền đối tượng tối thiểu** được hỗ trợ. Không đưa SQL cấp admin rộng vào quy trình.

## 4. Tạo packet local — được phép, không kết nối Supabase

Mở PowerShell tại repository. Chạy nguyên khối sau; chỉ tạo file trong `.local`, không dùng password, key, database URL hoặc `--execute`:

```powershell
Set-Location 'C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym'
New-Item -ItemType Directory -Path '.local' -Force | Out-Null
$utf8 = [System.Text.UTF8Encoding]::new($false)
$review = '{"environment":"preview","projectUrl":"https://wwcfzotkxpqtelfvvhpd.supabase.co","registrations":[]}'
[System.IO.File]::WriteAllText((Join-Path $PWD '.local/hosted-migration-review.json'), $review, $utf8)

$foundationJson = node cloud/operator.js prepare --review .local/hosted-migration-review.json
if ($LASTEXITCODE -ne 0) { throw 'Foundation packet generation failed' }
$photosJson = node cloud/operator.js prepare-hosted-photos --review .local/hosted-migration-review.json
if ($LASTEXITCODE -ne 0) { throw 'Hosted photo packet generation failed' }
$foundation = ($foundationJson -join "`n") | ConvertFrom-Json
$photos = ($photosJson -join "`n") | ConvertFrom-Json
[System.IO.File]::WriteAllText((Join-Path $PWD '.local/001-002-hosted.sql'), $foundation.sql, $utf8)
[System.IO.File]::WriteAllText((Join-Path $PWD '.local/003-private-hosted.sql'), $photos.sql, $utf8)
[System.IO.File]::WriteAllText((Join-Path $PWD '.local/003-storage-policies.sql'), $photos.storagePolicySql, $utf8)
[System.IO.File]::WriteAllText((Join-Path $PWD '.local/001-002-packet.json'), ($foundationJson -join "`n"), $utf8)
[System.IO.File]::WriteAllText((Join-Path $PWD '.local/003-hosted-packet.json'), ($photosJson -join "`n"), $utf8)
$foundation.migrations
$photos.migrations
```

Hai JSON packet ghi source SHA-256 để review. Chỉ paste **file `.sql`** vào SQL Editor, không paste JSON. Regenerate nếu source đã đổi; không tái sử dụng packet cũ không có bản sửa hosted này. Không chạy raw 001/002/003 độc lập: wrapper cần quản lý quyền chuyển owner, còn raw 003 gộp Storage policies vào cùng transaction.

## 5. Trình tự áp dụng — CHƯA ĐƯỢC PHÉP CHẠY

### A. 001 → 002 trong một transaction

**Cần duyệt:** đúng preview project + source hashes + việc tạo role/schema/private tables/functions/membership ứng dụng tạm thời.

Sau khi preflight đạt và được duyệt riêng: SQL Editor/New query/postgres, paste `.local/001-002-hosted.sql`, Run **toàn bộ**. Packet chứa nguyên thân 001 rồi 002, chỉ một BEGIN/COMMIT. Không chạy từng selection/dòng. Nếu lỗi: ghi lỗi; ROLLBACK nếu session báo transaction aborted; không DROP/reset/chạy lại raw migration.

Kết quả expected: tracker_sync tồn tại; helper/gateway/runtime đều NOLOGIN/NOBYPASSRLS; runtime chỉ member tracker_gateway, không ADMIN hoặc SET trên membership ở PostgreSQL ≥16. Function owner helper; table/schema owner migration postgres. Membership helper tạm và CREATE helper được thu hồi về trạng thái trước đó. Packet từ chối nếu đã có tracker_sync; đây không phải tool cập nhật cài đặt cũ.

### B. Tạo private bucket bằng Dashboard

**Cần duyệt riêng:** tạo bucket preview rỗng. Không upload.

Dashboard → **Storage → New bucket**. Tên/ID chính xác **`tracker-preview-photos`**; **Public OFF/private**. Hạn chế MIME `image/jpeg`; chọn giới hạn file 20 MB nếu UI hỗ trợ. App/gateway vẫn tự chặn payload ngoài giới hạn hiện có. Ghi lại cấu hình thực tế; không tự tăng quota/gói trả phí. Save/Create.

Nếu bucket đã tồn tại: chỉ kiểm tra. Nếu đang public hoặc có dữ liệu chưa rõ nguồn: **dừng**, không tự toggle/reset/xóa. Tạo bucket là thao tác riêng qua dịch vụ Storage, không nằm trong transaction migration.

[Hướng dẫn tạo bucket](https://supabase.com/docs/guides/storage/buckets/creating-buckets). Supabase yêu cầu thao tác Storage qua API và coi metadata SQL là chỉ đọc: [Storage schema design](https://supabase.com/docs/guides/storage/schema/design).

### C. 003 — private database + predicate

**Cần duyệt riêng:** 003 DB packet, private photo tables/functions, dựng lại private function ACL, cầu nối UID với owner postgres đã mô tả **và ngoại lệ thay CHECK constraint ở mục 1**. Chưa bao gồm uploads/writes/activation. Nếu chưa duyệt ngoại lệ “không DROP”, không chạy bước C/D.

SQL Editor/postgres: paste `.local/003-private-hosted.sql`, Run toàn bộ. Packet kiểm tra dependencies, bucket private, quyền đọc UID và membership helper; chặn helper kế thừa role khác. Nó không tạo bucket, không đổi managed Auth grant/owner và **không tạo Storage policies**. Kết quả này riêng lẻ **chưa làm hệ thống ảnh sẵn sàng**.

### D. 003 — đúng 7 Storage policies

**Cần duyệt riêng:** bộ 7 policy và execution context được provider hỗ trợ. Không sửa owner `storage.objects`, không SET ROLE managed admin, không thay RLS.

SQL Editor/postgres trên cùng project: paste `.local/003-storage-policies.sql`, Run toàn bộ trong một transaction. Nếu báo `must be owner`, `permission denied`, thiếu helper hoặc bucket: dừng, giữ lại DB private đã cài ở C, liên hệ Supabase về quyền policy trong Dashboard. Không cho rằng đổi sang Storage UI tự giải quyết lỗi; UI phải giữ được đúng cả `AS RESTRICTIVE`. Không đổi restrictive thành permissive, không chạy bỏ bớt statements và không dùng service_role để né RLS.

| Policy | Loại | Lệnh / role | Mục đích |
|---|---|---|---|
| tracker_photo_read | PERMISSIVE | SELECT / authenticated | Đọc path được predicate cho phép |
| tracker_photo_insert | PERMISSIVE | INSERT / authenticated | Upload theo manifest prepared |
| tracker_photo_read_guard | RESTRICTIVE | SELECT / authenticated | Chặn policy permissive khác nới quyền trên bucket Tracker |
| tracker_photo_insert_guard | RESTRICTIVE | INSERT / authenticated | Chặn đường upload không có manifest |
| tracker_photo_update_guard | RESTRICTIVE | UPDATE / authenticated | Cấm sửa/upsert object trong bucket Tracker |
| tracker_photo_delete_guard | RESTRICTIVE | DELETE / authenticated | Cấm browser xóa object trực tiếp |
| tracker_photo_anon_guard | RESTRICTIVE | ALL / anon | Chặn anonymous trên bucket Tracker |

Các guards dùng điều kiện bucket để không thay ý nghĩa truy cập các bucket khác. Cơ chế ảnh bất biến không hỗ trợ browser upsert; không thêm UPDATE/DELETE permissive cho tiện. [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

### E. Postcheck chỉ đọc — trước mọi activation

Chạy lại `cloud/hosted-preflight.sql`. Sau đó chạy các truy vấn catalog sau trong SQL Editor; không SELECT nội dung ảnh/nhật ký:

```sql
SELECT id,name,public,file_size_limit,allowed_mime_types
FROM storage.buckets WHERE id='tracker-preview-photos';

SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls
FROM pg_roles WHERE rolname IN ('tracker_sync_owner','tracker_gateway','tracker_preview_runtime');

SELECT parent.rolname AS granted_role,child.rolname AS member,
       pg_get_userbyid(m.grantor) AS grantor,m.admin_option,
       to_jsonb(m)->>'inherit_option' AS inherit_option,
       to_jsonb(m)->>'set_option' AS set_option
FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid
JOIN pg_roles child ON child.oid=m.member
WHERE parent.rolname LIKE 'tracker_%' OR child.rolname LIKE 'tracker_%';

SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='tracker_sync' AND c.relkind='r';

SELECT n.nspname,p.oid::regprocedure AS signature,
       pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('tracker_sync','tracker_photo_policy');

SELECT policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;

SELECT has_function_privilege('authenticated','tracker_photo_policy.request_uid()','EXECUTE') AS browser_bridge,
       has_function_privilege('anon','tracker_photo_policy.request_uid()','EXECUTE') AS anon_bridge,
       has_function_privilege('tracker_preview_runtime','tracker_photo_policy.request_uid()','EXECUTE') AS runtime_bridge,
       has_function_privilege('tracker_sync_owner','tracker_photo_policy.request_uid()','EXECUTE') AS helper_bridge;
```

Expected: bucket private; Storage objects RLS vẫn ON; private tables ENABLE + FORCE RLS. Bridge owner postgres/search_path rỗng; các helper khác owner tracker_sync_owner. Bridge privileges FALSE/FALSE/FALSE/TRUE; helper không member role nào khác; runtime chỉ gateway, quyền member không ADMIN/SET. So sánh đủ **2 permissive + 5 restrictive** và biểu thức với packet, đồng thời review policies khác đã tồn tại. Không coi chỉ đếm đủ 7 là bảo mật đạt.

Dashboard Data API/exposed schemas: không thêm tracker_sync/tracker_photo_policy. Gateway tiếp tục default writes OFF; runtime chưa LOGIN. Không tạo Auth test users, đăng ký UID/device, bật LOGIN, SMTP, gateway hay upload ở runbook này. Các hành động đó phải được duyệt và thử bằng synthetic A/B ở bước tiếp theo; actual hosted RLS/Auth/Storage isolation chưa được test ở phiên này.

## 6. Lỗi, rerun và kết nối

- 001/002 hoặc 003 DB lỗi: transaction tự rollback; kiểm tra catalog trước mọi retry. Không DROP để làm sạch. 003 policy lỗi: rollback riêng policy transaction, không xóa DB/bucket đã tạo ở bước trước.
- Nếu DB 003 đã commit và policy chưa cài: trạng thái **PARTIAL, writes OFF**. Chỉ xem xét retry file policies chưa commit sau khi có quyền/approval; không rerun 003 DB. Nếu một phần cài trước bằng tay hoặc source hash khác: dừng để reconcile, không tự replace/drop.
- Không có downgrade phá hủy. Khi phát hiện sai sau commit: tắt writes, giữ dữ liệu, kiểm kê rồi chuẩn bị forward correction được duyệt.
- Cơ chế `prepare*` là offline-only. Không dùng `--execute`, ambient DATABASE_URL hay script tự apply. Supabase SQL Editor không cần gửi DB password vào chat/frontend.
- Kết nối DB operator/gateway qua Node trong tương lai vẫn cần TLS `verify-full` và CA phù hợp, project host chính xác, role runtime hạn chế, password chỉ ở secret backend. Không dùng `sslmode=require` thay xác minh chứng chỉ hoặc `rejectUnauthorized:false`. Native hosted TLS chưa được kiểm thử; không phải bằng chứng từ PGlite.

## 7. Bằng chứng local và các bước cần bạn duyệt

Kiểm thử quyền dùng PostgreSQL WASM/PGlite: non-superuser postgres, managed Auth/Storage owners, không managed-admin membership, không Auth grant option; chạy thực tế 001→002→003 DB; Storage policy packet bị từ chối theo quyền PostgreSQL chuẩn. Fixture full policy suite kiểm tra RLS riêng; không mô phỏng extension Supautils hoặc provider Dashboard.

Các tests mới kiểm tra: packet không kết nối; đúng 7 policies; thiếu/public bucket rollback; bridge và photo helpers không lọt EXECUTE qua global default ACL; 001/002 rollback khi ACL hàm private còn grantee bất ngờ; helper có role kế thừa bất ngờ bị chặn. Existing SQL assertions và regression được chạy lại; số kết quả cuối cùng ghi trong `TRACKER_EXECUTION_VERIFICATION.md`.

**Đã làm:** xem đúng project và chạy read-only preflight sau duyệt; không cần gửi lại quyền đã xác minh. Local generation ở mục4 không ghi lên Supabase. Chỉ đối chiếu lại preflight nếu project thay đổi hoặc trước actual install sau approval.

**Thao tác còn cần phê duyệt rõ ràng:** A cài 001/002/roles; B tạo bucket private; C cài 003 DB/UID bridge/ACL và ngoại lệ thay CHECK constraint; D cài 7 policies; rồi một approval khác cho LOGIN/provision/synthetic Auth+RLS+Storage tests. Deploy, writes, dữ liệu cá nhân và GitHub push vẫn chưa được phép.

**001/002: đủ điều kiện preflight để trình duyệt chạy riêng. Toàn bộ001→002→003: CÒN BLOCKER** cho tới khi có bucket private và duyệt ngoại lệ CHECK constraint, cùng approval ghi tương ứng. Đường policy được cấu hình đúng nhưng DDL/hosted RLS acceptance chưa chạy. Không coi Free/Singapore hay PASS SELECT là deployment/release PASS.
