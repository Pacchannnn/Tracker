# Tracker — Kiến trúc và các cam kết dữ liệu

_Bản cô đọng ngày 16/10/2026. [Sản phẩm & ý tưởng](01_SAN_PHAM_VA_Y_TUONG.md) · [Trạng thái & bàn giao](03_TRANG_THAI_VA_BAN_GIAO.md)._

## 1. Giữ cấu trúc hiện có

- **Frontend:** HTML, CSS, Vanilla JavaScript; module tách theo trách nhiệm. Không React/Next.js, không cần rewrite.
- **Chế độ trên thiết bị:** JSON trong localStorage, ảnh Blob trong IndexedDB.
- **Chế độ tài khoản:** cache/workspace riêng trong IndexedDB; gateway Node trên Vercel kết nối Supabase Auth, PostgreSQL và private Storage.
- Flask + SQLite là hướng từng cân nhắc, không phải kiến trúc đang triển khai hoặc bước bắt buộc tiếp theo. Không có remote AI hoặc Service Worker/PWA hiện tại.

```text
Trình duyệt
  ├─ Dữ liệu trên thiết bị → localStorage + IndexedDB ảnh
  └─ Workspace tài khoản → IndexedDB + outbox
       ├─ Supabase Auth → xác thực, token trong bộ nhớ
       ├─ Gateway HTTPS → kiểm JWT + quyền → PostgreSQL/RLS
       └─ Private Storage → luồng ảnh có prepare/verify/finalize
```

## 2. Các version khác nhau, không gọi chung là “schema”

| Lớp | Version / hợp đồng hiện có |
| --- | --- |
| JSON portable | `schemaVersion: 8`, localStorage key `vshape-tracker`. |
| Ảnh ẩn danh | IndexedDB `tracker-photos` v1; photo backup format1. |
| Account cache | IndexedDB `tracker-sync` v2; scope theo environment + projectId + UID. |
| Cloud protocol | JSON writes1; photo-aware protocol2. |
| Cloud database | Migrations001 foundation,002 sync counts,003 photos. |
| Account recovery | Envelope1: manifest + workspace JSON + photo carrier1. |

## 3. Model nhỏ nhất cần hiểu

| Nhóm | Dữ liệu và ranh giới |
| --- | --- |
| Program | Built-in exercises/Original Plan; custom exercises và plans/days lưu riêng. |
| Workout | Session, snapshot, slot/exercise identity và từng set có ID ổn định; nháp/sửa lịch sử không ghi đè nguồn khi chưa hoàn tất. |
| Nutrition | Foods, recipes, saved meals và meal entries; entry giữ snapshot macro/khẩu phần tại lúc ghi. |
| Life records | Check-ins, cardio, knee logs, journal theo ngày và photo metadata/owner references. |
| Settings | Mục tiêu và plan được chọn; không sửa `MASTER_PLAN.md`. |
| Derived views | My Day, Weekly/Monthly và progress tính từ nguồn; không lưu thêm bản sao summary dễ lệch. |

Giữ thứ tự bài/hiệp có ý nghĩa. Không lấy tên bài thay stable ID; không gộp máy, tạ hỗ trợ hoặc biến thể chỉ vì cùng tên. Xóa plan/food không được xóa lịch sử liên quan.

## 4. Persistence và sync phải bảo vệ điều gì?

- Parse/validate an toàn; migration additive; không xóa dữ liệu để “sửa” schema.
- Local writes có revision/stale guard; account data + intent/outbox lưu transaction trước khi gửi.
- Mỗi operation có ID, request đã gửi được đóng băng và có receipt để retry không nhân đôi.
- Server dùng aggregate JSONB, revision/CAS, version feed, tombstone và account-scoped ownership. Không dùng last-write-wins toàn bộ JSON để ghi đè âm thầm.
- Conflict giữ **base/local/remote**, cho review rõ ràng; không tự merge hoặc replay phần người dùng chưa chấp nhận.
- Auth token ở bộ nhớ; reload cần đăng nhập lại. Mở cache offline không thay thế xác thực server.
- Đăng nhập không tự nhập dữ liệu ẩn danh, không tự chuyển ảnh. Đổi origin/port/profile cũng không tự chuyển dữ liệu.

## 5. Ảnh và backup

Ảnh/thumbnail giữ dạng JPEG Blob trong IndexedDB, không nhét base64 vào localStorage. Food/recipe photos dùng metadata chủ sở hữu. Cloud upload có intent, đường dẫn riêng, kiểm kích thước/hash và finalize; không công bố ảnh lưu dở. Không tự garbage-collect hoặc thay retention.

| Chế độ | Bộ backup cần giữ |
| --- | --- |
| Trên thiết bị | **2 file:** JSON dữ liệu8 + JSON ảnh1. Hai phần không có transaction chung; không coi link tải là bằng chứng file đã tải. |
| Tài khoản | **3 file recovery:** manifest + workspace + ảnh, giữ cả outbox/conflicts. JSON projection đơn lẻ không phải backup đầy đủ. |

Restore phải validate, xem trước và xác nhận đúng phạm vi. Anonymous photo restore thêm ID chưa có; account recovery tạo kho **detached/offline**, không ghi đè kho active hoặc tự gửi lại operation cũ. Full legacy/photo import vẫn chưa hoàn chỉnh.

## 6. Hosting và quyền riêng tư

- Build chỉ đóng gói runtime theo allowlist; không đưa plan riêng, báo cáo, `.env`, backups, tests hoặc credentials lên website.
- Public Project URL/publishable key được inject lúc build. Database URL/CA thuộc server environment; không đặt postgres/service_role/secret key trong frontend.
- Gateway kiểm JWT, project, UID và exact HTTPS origin; DB role hạn chế, TLS xác minh CA/hostname, không bypass RLS.
- Supabase private schema `tracker_sync`; bucket `tracker-preview-photos` private. Trang web công khai không có nghĩa dữ liệu tài khoản/ảnh công khai.
- Domain ổn định dùng cùng origin cho frontend/gateway; các URL preview khác vẫn có bảo vệ Vercel.

Nguồn sâu trong `docs/`: [Data model](docs/DATA_MODEL.md), [ảnh](docs/PHOTO_STORAGE.md), [sync](docs/CLOUD_BATCH2_SYNC_CONTRACT.md), [photo/recovery](docs/TRACKER_PHOTO_RECOVERY_CONTRACT.md) và [runbook Supabase](docs/SUPABASE_HOSTED_MIGRATION_RUNBOOK.md). Mục “design only/chưa apply” trong tài liệu kỹ thuật lịch sử phải đối chiếu trạng thái mới ở file03.
