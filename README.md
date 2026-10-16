# Tracker

**Website: [tracker-ppap7.vercel.app](https://tracker-ppap7.vercel.app/)**

Ứng dụng cá nhân ghi tập luyện, dinh dưỡng, nhật ký, ảnh và tiến độ. HTML, CSS và Vanilla JavaScript; dữ liệu trên thiết bị dùng localStorage/IndexedDB.

## Chạy local

Trong PowerShell:

```powershell
cd "C:\Users\Dell G15\OneDrive\Documents\ChatGPT\Gym"
python -m http.server 8765 --bind 127.0.0.1
```

Mở **[http://127.0.0.1:8765/](http://127.0.0.1:8765/)**. Giữ cửa sổ server mở; nếu server đã chạy thì chỉ mở link. Dùng đúng browser/profile và địa chỉ cũ để thấy dữ liệu đã lưu. Không mở bằng `file://`.

## Các file cần giữ

- `index.html`, `css/`, `js/`: giao diện và chức năng ứng dụng.
- `assets/fonts/`: font và giấy phép đi kèm.
- `cloud/`: gateway, dependency PostgreSQL và SQL migrations định nghĩa database.
- `scripts/`: đóng gói frontend và gateway cho Vercel.
- `package.json`, `package-lock.json`, `vercel.json`: cấu hình và dependency cho build/deploy.

## Build frontend

Dùng Node.js 24.x:

```powershell
npm run build
npm run check:artifact
```

Output: `dist/`. Mặc định local-only; cấu hình cloud public được inject từ environment lúc build, không ghi secret vào frontend.

## Đóng gói frontend và gateway Vercel

```powershell
node scripts/vercel-preview-package.js
node scripts/vercel-preview-package.js --stage
```

Artifact: `.local/vercel-preview-artifact/`; thư mục upload: `.local/vercel-preview-upload/`. Chỉ deploy artifact. Gateway dùng `pg` từ `cloud/package-lock.json`; cài cho server local bằng `npm --prefix cloud ci`.

Project hiện tại: `tracker-preview`, environment preview. Giữ gateway URL và CORS origin đúng `https://tracker-ppap7.vercel.app`. Database URL/CA chỉ cấu hình trên server. Root `vercel.json` dành cho frontend static; cloud dùng bundle kết hợp ở trên. Push GitHub không tự cập nhật domain alias hoặc database. Migrations 001–003 đã được áp dụng trên Supabase preview; không chạy lại khi deploy frontend.

## Dữ liệu và GitHub

- Mỗi origin/browser có kho local riêng. Đăng nhập không tự upload lịch sử local.
- Cloud hiện giới hạn tài khoản synthetic preview; chưa nghiệm thu đầy đủ đồng bộ hai thiết bị trên domain mới.
- Backup local gồm JSON và ảnh; account recovery gồm ba file. JSON projection không thay thế full account recovery.
- Không commit `.env`, secrets, backup, `node_modules`, `dist` hoặc `.local`.
- Tài liệu riêng, bộ test và công cụ QA được lưu ngoài repository tại `%LOCALAPPDATA%\TrackerProjectArchive\`.
- Đẩy source sau khi xem `git status` và `git diff`: `git push origin main`.
