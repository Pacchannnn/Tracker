# Tracker — Trạng thái, cách dùng và phần chưa hoàn tất

_Tổng hợp ngày 16/10/2026 từ trạng thái ghi nhận đến 15/10/2026. Chỉ cô đọng tài liệu, không chạy lại app/test hoặc xác minh dịch vụ bên ngoài trong lần cập nhật này._

## 1. Mở website

**Địa chỉ cố định: [tracker-ppap7.vercel.app](https://tracker-ppap7.vercel.app/).**

- Gõ địa chỉ trong trình duyệt là mở app; không cần terminal, file `.cmd` hoặc đăng nhập Vercel.
- Mặc định dùng dữ liệu trên trình duyệt. Cloud cần đăng nhập trong app; hiện chỉ cấu hình hai tài khoản synthetic A/B, chưa tạo tài khoản cá nhân mới.
- Tiện ích Windows `MO_TRACKER.cmd` cũ đã chuyển sang archive khi dọn repository. Không cần nó để mở website; credential mã hóa ngoài repository vẫn được giữ nguyên.
- Dữ liệu cũ ở **http://127.0.0.1:8765/** vẫn thuộc origin/profile cũ. Domain mới không tự có lịch sử đó; chưa chuyển dữ liệu sức khỏe thật lên cloud.

Nếu cần chạy local, trong thư mục Gym dùng `python -m http.server 8765 --bind 127.0.0.1`, giữ cửa sổ mở và dùng đúng browser/profile cũ. Không chạy thêm server nếu port đã có server.

## 2. Đã có gì?

| Phần | Trạng thái cần nhớ |
| --- | --- |
| App local | Gym, custom builder/plans, nutrition/recipes, nhật ký/ảnh, progress, My Day, Weekly/Monthly, backup và recovery đã triển khai theo các mốc local. |
| Website | Đã deploy Vercel; alias cố định trỏ đến deployment `dpl_69mUp4zVUXCQb6Zd1zp1rFP1itK4`. Vẫn là môi trường preview, không phải nghiệm thu cloud cá nhân. |
| Mở trang công khai | Ghi nhận15/10: browser hiện Tracker; HTTP không cookie trả200, không chuyển sang login Vercel. Chỉ alias cố định được mở, không tắt bảo vệ toàn project. |
| Supabase | Free Singapore, project `wwcfzotkxpqtelfvvhpd`; migrations001→002→003 đã apply,8 bảng private bật/FORCE RLS, private bucket và7Storage policies đã tạo. Không chạy lại packet cài đặt. |
| Gateway | Credential role hạn chế + CA ở server; kết nối native TLS đã thành công. Cloud writes chỉ cho hai UID synthetic A/B. |
| Auth | A/B đã đăng nhập thật; public signup tắt, OTP cấu hình6số. SMTP/email delivery chưa xác minh. |
| Đồng bộ ghi nhận | Một workspace B rỗng trên preview trước tự hiện “Đã đồng bộ”,0pending. Không phải bằng chứng đã chuyển workout/food/journal/ảnh giữa hai thiết bị. |

Thiết bị của domain ổn định mới chưa được xác minh enrollment. Không suy từ cấu hình server hoặc trạng thái workspace rỗng rằng mọi chức năng cloud đã hoàn tất.

## 3. Bằng chứng và giới hạn

- Mốc regression trước các thay đổi hosting cuối: **817/817 Node tests,158 JS syntax, SQL WASM45+121+60**. Đây là kết quả lịch sử, không phải kết quả mới cho toàn bộ code hiện tại.
- User đã yêu cầu **dừng test**. Các sửa CA/domain cuối không được chạy lại regression/syntax/E2E; packaging/build vẫn giữ các kiểm tra allowlist bắt buộc của nó.
- Local/synthetic QA trước đây có workout, snapshot, conflict, tài khoản, ảnh và backup/recovery. Không gọi kết quả synthetic gateway là nghiệm thu Supabase thật.
- Chưa xác minh chuyển bản ghi/ảnh thật giữa hai client trên domain mới, toàn bộ conflict/offline/recovery hosted, thiết bị vật lý/Safari, dữ liệu lớn/quota và offline cold-start.
- Chưa có Service Worker/PWA: queue bền vững không bảo đảm mở app từ trạng thái đóng khi mất mạng.

**Kết luận đúng:** app local và hạ tầng cloud preview đã bàn giao; bản cloud cá nhân hoàn chỉnh, được nghiệm thu hai thiết bị, chưa được chứng minh.

## 4. Ranh giới và quyết định còn mở

1. Hiện không tạo thêm tài khoản theo yêu cầu của user. Nếu muốn cloud cá nhân/multi-device dùng hằng ngày, cần chốt danh tính, onboarding/enrollment và recovery phù hợp; không coi tài khoản test là bàn giao tài khoản cá nhân.
2. Dữ liệu cá nhân, lịch sử local và ảnh không tự import/upload. Chuyển dữ liệu là lựa chọn riêng có review/backup; full legacy/photo mapper còn thiếu.
3. Chỉ nối lại những kiểm thử còn thiếu nếu user thay đổi yêu cầu dừng test. Không tự báo PASS để đóng dự án.
4. Không mở rộng roadmap mặc định: ưu tiên lỗi dùng thật và giảm thao tác. AI trả phí, notifications, advanced sets, shopping list, PWA và analytics nâng cao vẫn là backlog, không phải việc phải làm để mở website.

## 5. Quy tắc tiếp tục cho người hoặc agent khác

- Đọc3file tóm tắt này trước; khi cần chi tiết mới mở báo cáo gốc. Mốc có ngày mới hơn thắng các dòng “current” cũ; proposal không phải implementation.
- Không rebuild app, đổi UI hoặc schema ngoài phạm vi; không reset DB, bypass RLS, publish secrets hoặc tự push GitHub.
- Giữ `MASTER_PLAN.md`, dữ liệu origin8765 và history snapshots. Không thử restore phá hủy trên kho đang dùng.
- Không tiếp tục xin duyệt kỹ thuật nhỏ đã được phép; chỉ cần user khi thực sự thiếu đăng nhập/secret/quyền, phát sinh phí hoặc vượt phạm vi dữ liệu.
- Ba tài liệu này là bản cô đọng; đợt dọn repository16/10 chỉ sắp xếp tài liệu, lưu riêng file phụ và cập nhật hướng dẫn/Git ignore. Không thay runtime, cấu hình cloud hoặc dữ liệu và không mở phase mới.

Nguồn trạng thái hiện tại: file03 này và [README](README.md). Hợp đồng kỹ thuật cần bảo trì ở `docs/`. Các file `TRACKER_EXECUTION_*`, roadmap, audit và báo cáo Cloud cũ đã được lưu vào `%LOCALAPPDATA%\TrackerProjectArchive\Gym-2026-10-16-a6d9c5ee\files\`; chúng là bằng chứng lịch sử, không phải danh sách việc đang còn chờ.

## 6. Repository sau dọn dẹp16/10

- Giữ source frontend/backend, SQL migrations, build scripts, tests/mock harness, font/license,3file tóm tắt và8tài liệu kỹ thuật trong `docs/`.
- `MASTER_PLAN.md` vẫn ở máy local, ignore bởi Git. Các ghi chép riêng, `.env`, báo cáo/ảnh QA, build outputs, dependency caches và helper cũ được lưu riêng ngoài repository; có inventory/hash để tìm lại.
- Dependencies có thể cài lại từ2lockfiles bằng `npm ci` và `npm --prefix cloud ci`. Không commit dependencies, build outputs, credential hoặc backups.
- Kết quả dọn:189file ngoài `.git`, gồm1plan riêng tư được ignore;1.652file phụ đã chuyển vào archive và xác nhận hash khớp.176file source/cấu hình giữ nguyên byte;8hợp đồng kỹ thuật được chuyển vào `docs/` và sửa đường dẫn tài liệu.
- Đóng gói từ bản sao sạch ngoài repository thành công: frontend57file, gateway16file, Vercel gateway18file và bundle kết hợp77file; không chạy lại test chức năng/SQL và không deploy. Không có link Markdown nội bộ bị thiếu. Quét mẫu secret ở source hiện tại và908blob lịch sử Git không phát hiện secret thật;7kết quả URL database đều là fixture giả trong test. Đây không phải cam kết phát hiện mọi loại thông tin nhạy cảm.
