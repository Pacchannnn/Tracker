# Tracker

**Website: [tracker-ppap7.vercel.app](https://tracker-ppap7.vercel.app/)**

Ứng dụng cá nhân để ghi tập luyện, dinh dưỡng, nhật ký, ảnh và xem lại tiến độ. HTML, CSS và Vanilla JavaScript; mở website không cần cài phần mềm hoặc đăng nhập Vercel.

## Đọc trước

1. [Sản phẩm & ý tưởng](01_SAN_PHAM_VA_Y_TUONG.md): mục tiêu, chức năng, nguyên tắc và backlog.
2. [Kiến trúc & dữ liệu](02_KIEN_TRUC_VA_DU_LIEU.md): lưu trữ, sync, bảo mật và backup.
3. [Trạng thái & bàn giao](03_TRANG_THAI_VA_BAN_GIAO.md): phần đã triển khai và phần chưa xác minh.

Chế độ trên thiết bị dùng localStorage/IndexedDB, không cần tài khoản. Cloud dùng kho tài khoản riêng, hiện cấu hình môi trường preview với tài khoản synthetic; chưa nghiệm thu chuyển bản ghi/ảnh giữa hai thiết bị trên domain mới. Đăng nhập không tự chuyển lịch sử local lên cloud.

## Chạy local

Trong PowerShell:

```powershell
cd "C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym"
python -m http.server 8765 --bind 127.0.0.1
```

Mở **[http://127.0.0.1:8765/](http://127.0.0.1:8765/)** và giữ cửa sổ server mở. Nếu server đang chạy, chỉ mở link. Dùng đúng địa chỉ và browser/profile cũ để thấy dữ liệu đã lưu; domain mới có kho khác. Không mở trực tiếp `index.html` bằng `file://`.

## Cấu trúc repository

```text
index.html, css/, js/   Frontend và logic ứng dụng
assets/fonts/          Font tiếng Việt và license OFL
cloud/                 Gateway, SQL migrations, operator và công cụ SQL/QA
scripts/               Đóng gói frontend/gateway/Vercel
tests/, dev/auth/      Regression tests, fixtures và mock Auth harness
docs/                  Hợp đồng dữ liệu, ảnh, sync và runbook cần bảo trì
01_*.md, 02_*.md,
03_*.md                Ba tài liệu tóm tắt hiện tại
```

`MASTER_PLAN.md` là nguồn fitness riêng tư, được giữ local và ignore; ứng dụng chạy từ định nghĩa chương trình trong `js/program.js`. Không cần file plan riêng để clone/build/chạy website.

## Phát triển và đóng gói

Dùng Node.js24.x; Python3 chỉ cần cho cách chạy local ở trên. Cài lại dependencies khi cần phát triển:

```powershell
npm ci
npm --prefix cloud ci
```

Frontend static, mặc định local-only:

```powershell
npm run build
npm run check:artifact
```

Output là `dist/`, chỉ chứa runtime trong allowlist. **Chỉ deploy artifact, không publish nguyên repository.**

Đóng gói frontend + gateway cho Vercel preview:

```powershell
node scripts/vercel-preview-package.js
node scripts/vercel-preview-package.js --stage
```

Artifact sạch: `.local/vercel-preview-artifact/`; upload stage: `.local/vercel-preview-upload/`. Dùng project Vercel `tracker-preview` hiện có và environment preview. Public config inject lúc build; database URL/CA chỉ ở server. Giữ gateway URL và exact CORS origin cùng `https://tracker-ppap7.vercel.app`; domain alias trỏ deployment không tự đổi khi push GitHub. Root `vercel.json` là cấu hình frontend static, không thay thế bundle cloud kết hợp.

Các lệnh kiểm thử dành cho lần bảo trì được phép sau này: `npm test`, `npm --prefix cloud run test:db`, `npm --prefix cloud run test:sync`, `node cloud/tests/run-photo-db.js`. Đợt dọn thư mục này không chạy lại các bài test chức năng hoặc thao tác Supabase.

## Dữ liệu và cấu hình riêng tư

- Giữ `package-lock.json` ở root/cloud để cài lại dependencies. `node_modules`, outputs và staging không cần commit.
- Không commit `.env`, credential, backup JSON/ảnh hoặc ghi chép cá nhân; `.gitignore` đã chặn các tên thường dùng.
- Backup local cần2file: dữ liệu và ảnh. Account recovery cần3file; JSON projection không phải full account backup.
- Migrations001–003 đã apply trên preview; không chạy lại để deploy frontend. Xem [runbook](docs/SUPABASE_HOSTED_MIGRATION_RUNBOOK.md).
- Các báo cáo phase/research, file tạm, outputs và helper Windows cũ đã được lưu riêng ngoài repository trong `%LOCALAPPDATA%\TrackerProjectArchive\`. Không mất dữ liệu browser, không có cloud upload hoặc GitHub push trong đợt dọn này.

## Đẩy thay đổi lên GitHub

Làm việc trên `main`. Xem `git status` và `git diff --stat`, chỉ commit nội dung đã review; sau đó tự chạy `git push origin main`. Không cần đưa archive, dependencies cài sẵn hoặc artifacts vào Git. Việc push source không đồng nghĩa deploy lại Vercel hay thay database.
