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
4. Tạo món từ nhãn thực phẩm ở **Ăn uống → Thực phẩm**, rồi thêm vào **Nhật ký ngày**. Có thể lưu một bữa đã ghi thành **Bữa lưu sẵn**, sao chép ngày trước, hoặc nhập **Công thức**. Macro công thức là dữ liệu bạn tự nhập; công thức thiếu macro không ghi vào nhật ký ăn.
5. Ghi cân, eo, ngủ hoặc ghi chú gối ở **Tiến độ**.
   **Tiến độ → Tổng quan** cho biết các trung bình theo tuần và lịch sử theo bài khi có dữ liệu. **Tập luyện → Cardio & gối** cho phép ghi hoạt động và tình trạng gối riêng.
6. Vào **Cài đặt → Chuẩn bị file JSON → Tải file JSON** để sao lưu. Nếu browser không tải file, dùng **Sao chép JSON** và lưu văn bản vào một file `.json` riêng tư. Xác nhận file thực sự tồn tại trước khi xóa dữ liệu browser.
7. Để khôi phục, chọn file JSON trong **Cài đặt**, xem trước số lượng dữ liệu, tải và giữ bản sao của dữ liệu hiện tại, rồi xác nhận khôi phục. Việc khôi phục thay thế dữ liệu hiện có trong origin này.

## Giới hạn hiện tại

- Dữ liệu chỉ ở browser profile hiện tại. Xóa site data, đổi origin/profile hoặc cài lại trình duyệt có thể làm mất dữ liệu; xuất backup đều đặn.
- Chưa hỗ trợ đồng bộ, tài khoản, ảnh hay Flask/SQLite. Bản JSON chỉ bao gồm dữ liệu cấu trúc; không bao gồm ảnh trong tương lai. Công thức đã có nhưng chưa hỗ trợ ảnh và tự scale nguyên liệu theo số phần.
- Trong buổi tập có thể dùng **Chế độ tập trung**, **Dùng số lần trước**, ghi chú setup riêng và đồng hồ nghỉ tùy chọn. Đồng hồ dùng mức thấp của khoảng nghỉ trong plan làm mặc định; dữ liệu lần trước chỉ để điền nhanh, không phải lời khuyên tăng tải.
- Nếu đã mở Tracker trong nhiều tab trước khi cập nhật phiên bản này, tải lại tất cả tab để chúng dùng cùng cách lưu an toàn mới. Trình duyệt cần hỗ trợ Web Locks; nếu không, ứng dụng từ chối ghi dữ liệu thay vì ghi đè thiếu an toàn.
- Dashboard gợi ý **buổi kế tiếp** theo buổi hoàn thành gần nhất (A→B→C→D), không tự quyết định ngày nào bạn phải tập.
- Tuần chương trình được chọn thủ công. Mỗi hiệp chọn tải `kg` hoặc `lb`; cân nặng dùng `kg` và eo dùng `cm`, chưa có chuyển đổi tự động. Ghi tên máy trong ghi chú buổi; DB ghi mỗi tay và barbell tính cả thanh theo plan.
- Mục tiêu carbs không được plan định nghĩa. Fat 60–75 g/ngày là phạm vi tham khảo trong plan; app chỉ tính tổng thực phẩm do bạn nhập, không có cơ sở dữ liệu thực phẩm mặc định.
- Buổi tập có thể hoàn thành sau ít nhất một hiệp; điều này cho phép ghi buổi dở dang, không phải xác nhận đã làm đủ bài.
- Tên hiển thị đã đổi thành Tracker. Khóa `localStorage` cũ vẫn được giữ để không làm mất dữ liệu đã lưu. Font Patrick Hand được đóng gói trong `assets/fonts/` theo giấy phép OFL.

## Kiểm tra tự động

```powershell
npm test
```

Không cần `npm install` vì app và các bài kiểm tra dùng JavaScript/Node có sẵn.
