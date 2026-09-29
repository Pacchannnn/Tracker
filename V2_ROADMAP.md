# Tracker V2 — lộ trình triển khai

_30/09/2026 · Bản này mở rộng ứng dụng hiện tại; giữ giao diện giấy/vẽ tay và dữ liệu local._

## Trạng thái

- **Phase 1 — an toàn dữ liệu: hoàn thành trong mã hiện tại.** Ngày nhật ký ăn theo local date khi ở chế độ Hôm nay; buổi kế tiếp theo A→B→C→D; ghi dữ liệu có Web Lock và tải trạng thái mới nhất; macro bữa cũ giữ snapshot. Có kiểm tra tự động và luồng hai tab trên origin thử.
- **Phase 2 — sao lưu/khôi phục JSON: hoàn thành trong mã hiện tại.** Xuất có thời điểm và schema version; nhận file kiểu cũ; kiểm tra schema, xem trước số lượng, yêu cầu bản sao an toàn và xác nhận trước khi thay thế. Đã thử khôi phục trên origin thử. Sự kiện tải file trong công cụ kiểm tra chưa xác nhận được; người dùng nên kiểm tra file tải thực tế.
- **Phase 3 — Gym nhanh hơn: đã triển khai.** Điền set từ buổi trước bằng nút rõ ràng, chế độ tập trung, ghi chú setup bài, đồng hồ nghỉ tùy chọn, cardio và ghi nhận gối có cấu trúc. Kiểm tra thêm UX trên máy/điện thoại thật vẫn hữu ích.
- **Phase 4 — Tiến độ: đã triển khai bản đầu.** Tổng kết tuần, 4 tuần có dữ liệu, cân/eo trung bình, lịch sử theo bài, dinh dưỡng trên ngày đã ghi. Chưa có biểu đồ đồ họa vì danh sách hiện trả lời câu hỏi chính và dễ kiểm tra hơn.
- **Phase 5 — Dinh dưỡng: đã triển khai bản đầu.** Thư viện có tìm kiếm và sắp món gần đây; nhật ký sao chép ngày trước; bữa mẫu độc lập với lịch sử; công thức có nguyên liệu/bước nấu/macro nhập thủ công và có thể ghi vào nhật ký khi đủ macro. Công thức chưa có ảnh hoặc scale theo số phần.
- **Phase 6 — Nhật ký & ảnh: đã triển khai bản đầu.** Nhật ký nhanh với dấu mực riêng, thẻ/ghi chú, lịch có dấu ảnh và dòng thời gian; ảnh cục bộ có loại, ngày, ghi chú, góc chụp/số đo tùy chọn, sửa/xóa, thumbnail. Ảnh nén JPEG và lưu Blob trong IndexedDB. Đã thử tạo, tải lại, sửa và xem thư viện trên origin riêng; kiểm tra xóa ảnh còn cần thử trên thiết bị thật.
- **Phase 7 — sao lưu có ảnh: đã triển khai hai file độc lập.** File dữ liệu JSON (schema 5) và file ảnh JSON base64 riêng. Nhập ảnh xem trước rồi chỉ thêm ID còn thiếu trong một transaction IndexedDB; không thay ảnh hiện có. Đã thử nhập một ảnh và xem trước trùng ảnh trên origin riêng. Công cụ trình duyệt không xác nhận được file tải xuống thực tế; cần người dùng kiểm tra thư mục Downloads trước khi xóa dữ liệu trình duyệt. Gói ảnh có giới hạn 200 MB dữ liệu ảnh; chưa có ZIP/streaming.
- **Phase 8 — tùy chọn:** PWA, đồng bộ, tài khoản, Flask/SQLite hoặc triển khai khi nhu cầu thật xuất hiện.

## Ràng buộc cho các mốc tiếp

1. Mỗi thay đổi dữ liệu lưu phải có schema version, đọc được dữ liệu cũ, xử lý lỗi và bài kiểm tra migration.
2. Không lưu ảnh lớn trong `localStorage`, không upload dữ liệu riêng tư.
3. Không tự sửa kế hoạch tập/dinh dưỡng trong `MASTER_PLAN.md` hoặc đưa ra kết luận y khoa.
4. Giữ tính năng cũ chạy được; kiểm tra desktop, điện thoại hẹp, bàn phím và reload.
5. Không push GitHub nếu bạn chưa yêu cầu.

## Tiếp theo / quyết định để sau

- Thử tải cả hai file sao lưu trong browser thường dùng, giữ file ở nơi riêng tư, rồi thử khôi phục trên origin thử. Không thử restore lên dữ liệu thật trước khi xác nhận file tải được.
- Nếu kho ảnh tiến gần 200 MB, đánh giá định dạng ZIP/streaming và luồng khôi phục dung lượng lớn. Trước mắt không thêm thư viện chỉ để có ZIP.
- Chỉ xem xét đồng bộ nhiều thiết bị, đăng nhập, PWA, Flask/SQLite hoặc triển khai khi có nhu cầu sử dụng thật; chưa chọn dịch vụ hay kiến trúc backend.
