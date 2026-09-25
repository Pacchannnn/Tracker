# V-Shape Tracker

Ứng dụng cá nhân dùng HTML, CSS, JavaScript thuần và `localStorage`. Nội dung bài tập lấy từ `MASTER_PLAN.md`; ứng dụng không tự thay bài hoặc kết luận tình trạng gối.

## Chạy

Từ thư mục này:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8765/` trên **cùng máy**. Dùng cùng địa chỉ, cổng và browser profile cho các lần sau vì `localStorage` gắn với origin. Để mở trên điện thoại riêng cần một phương án phục vụ và bảo vệ dữ liệu khác; bản này chưa đồng bộ thiết bị.

## Dùng nhanh

1. Vào **Cài đặt** chọn tuần chương trình (mặc định tuần 1) và sửa mục tiêu ăn nếu cần.
2. Vào **Buổi tập**, chọn A/B/C/D, nhập tạ, số lần, RIR rồi chọn **Lưu hiệp**. Bản nháp lưu sau mỗi hiệp.
3. Chọn **Hoàn thành & lưu buổi**. Vào **Lịch sử** để xem hoặc mở lại sửa.
4. Tạo món từ nhãn thực phẩm ở **Dinh dưỡng**, rồi thêm vào nhật ký theo ngày và số khẩu phần.
5. Ghi cân, eo, ngủ hoặc ghi chú gối ở **Check-in**.
6. Vào **Cài đặt → Chuẩn bị file JSON → Tải file JSON** để sao lưu. Nếu browser không tải file, dùng **Sao chép JSON** và lưu văn bản vào một file `.json` riêng tư. Xác nhận file thực sự tồn tại trước khi xóa dữ liệu browser.

## Giới hạn hiện tại

- Dữ liệu chỉ ở browser profile hiện tại. Xóa site data, đổi origin/profile hoặc cài lại trình duyệt có thể làm mất dữ liệu; xuất backup đều đặn.
- Chưa hỗ trợ import, đồng bộ, tài khoản, ảnh, công thức nấu, rest timer hay Flask/SQLite.
- Tuần chương trình được chọn thủ công. Mỗi hiệp chọn tải `kg` hoặc `lb`; cân nặng dùng `kg` và eo dùng `cm`, chưa có chuyển đổi tự động. Ghi tên máy trong ghi chú buổi; DB ghi mỗi tay và barbell tính cả thanh theo plan.
- Mục tiêu carbs không được plan định nghĩa. Fat 60–75 g/ngày là phạm vi tham khảo trong plan; app chỉ tính tổng thực phẩm do bạn nhập, không có cơ sở dữ liệu thực phẩm mặc định.
- Buổi tập có thể hoàn thành sau ít nhất một hiệp; điều này cho phép ghi buổi dở dang, không phải xác nhận đã làm đủ bài.

## Kiểm tra tự động

```powershell
npm test
```

Không cần `npm install` vì app và các bài kiểm tra dùng JavaScript/Node có sẵn.
