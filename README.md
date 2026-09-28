# Tracker

Ứng dụng cá nhân dùng HTML, CSS, JavaScript thuần và `localStorage`. Nội dung bài tập lấy từ `MASTER_PLAN.md`; ứng dụng không tự thay bài hoặc kết luận tình trạng gối.

## Chạy

Từ thư mục này:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8765/` trên **cùng máy**. Dùng cùng địa chỉ, cổng và browser profile cho các lần sau vì `localStorage` gắn với origin. Để mở trên điện thoại riêng cần một phương án phục vụ và bảo vệ dữ liệu khác; bản này chưa đồng bộ thiết bị.

Nếu tab đã mở trước khi cập nhật app và vẫn hiện giao diện cũ, hãy **tải lại chính tab đó** bằng nút Reload của trình duyệt. Kiểm tra tiêu đề trang là **Tracker**. Đừng đổi cổng hoặc địa chỉ để tránh nhìn sang một kho `localStorage` khác.

## Dùng nhanh

1. Vào **Cài đặt** chọn tuần chương trình (mặc định tuần 1) và sửa mục tiêu ăn nếu cần.
2. Vào **Tập luyện → Chương trình**, chọn A/B/C/D rồi bắt đầu buổi. Nhập tạ, số lần, RIR và chọn **Lưu hiệp**; bản nháp lưu sau mỗi hiệp.
3. Chọn **Hoàn thành & lưu buổi**. Vào **Tập luyện → Lịch sử** để xem hoặc mở lại sửa.
4. Tạo món từ nhãn thực phẩm ở **Ăn uống**, rồi thêm vào nhật ký theo ngày và số khẩu phần.
5. Ghi cân, eo, ngủ hoặc ghi chú gối ở **Tiến độ**.
6. Vào **Cài đặt → Chuẩn bị file JSON → Tải file JSON** để sao lưu. Nếu browser không tải file, dùng **Sao chép JSON** và lưu văn bản vào một file `.json` riêng tư. Xác nhận file thực sự tồn tại trước khi xóa dữ liệu browser.

## Giới hạn hiện tại

- Dữ liệu chỉ ở browser profile hiện tại. Xóa site data, đổi origin/profile hoặc cài lại trình duyệt có thể làm mất dữ liệu; xuất backup đều đặn.
- Chưa hỗ trợ import, đồng bộ, tài khoản, ảnh, công thức nấu, rest timer hay Flask/SQLite.
- Tuần chương trình được chọn thủ công. Mỗi hiệp chọn tải `kg` hoặc `lb`; cân nặng dùng `kg` và eo dùng `cm`, chưa có chuyển đổi tự động. Ghi tên máy trong ghi chú buổi; DB ghi mỗi tay và barbell tính cả thanh theo plan.
- Mục tiêu carbs không được plan định nghĩa. Fat 60–75 g/ngày là phạm vi tham khảo trong plan; app chỉ tính tổng thực phẩm do bạn nhập, không có cơ sở dữ liệu thực phẩm mặc định.
- Buổi tập có thể hoàn thành sau ít nhất một hiệp; điều này cho phép ghi buổi dở dang, không phải xác nhận đã làm đủ bài.
- Tên hiển thị đã đổi thành Tracker. Khóa `localStorage` cũ vẫn được giữ để không làm mất dữ liệu đã lưu. Font Patrick Hand được đóng gói trong `assets/fonts/` theo giấy phép OFL.

## Kiểm tra tự động

```powershell
npm test
```

Không cần `npm install` vì app và các bài kiểm tra dùng JavaScript/Node có sẵn.
