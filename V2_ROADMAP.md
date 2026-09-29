# Tracker V2 — lộ trình triển khai

_30/09/2026 · Bản này mở rộng ứng dụng hiện tại; giữ giao diện giấy/vẽ tay và dữ liệu local._

## Trạng thái

- **Phase 1 — an toàn dữ liệu: hoàn thành trong mã hiện tại.** Ngày nhật ký ăn theo local date khi ở chế độ Hôm nay; buổi kế tiếp theo A→B→C→D; ghi dữ liệu có Web Lock và tải trạng thái mới nhất; macro bữa cũ giữ snapshot. Có kiểm tra tự động và luồng hai tab trên origin thử.
- **Phase 2 — sao lưu/khôi phục JSON: hoàn thành trong mã hiện tại.** Xuất có thời điểm và schema version; nhận file kiểu cũ; kiểm tra schema, xem trước số lượng, yêu cầu bản sao an toàn và xác nhận trước khi thay thế. Đã thử khôi phục trên origin thử. Sự kiện tải file trong công cụ kiểm tra chưa xác nhận được; người dùng nên kiểm tra file tải thực tế.
- **Phase 3 — Gym nhanh hơn: đã triển khai.** Điền set từ buổi trước bằng nút rõ ràng, chế độ tập trung, ghi chú setup bài, đồng hồ nghỉ tùy chọn, cardio và ghi nhận gối có cấu trúc. Kiểm tra thêm UX trên máy/điện thoại thật vẫn hữu ích.
- **Phase 4 — Tiến độ: đã triển khai bản đầu.** Tổng kết tuần, 4 tuần có dữ liệu, cân/eo trung bình, lịch sử theo bài, dinh dưỡng trên ngày đã ghi. Chưa có biểu đồ đồ họa vì danh sách hiện trả lời câu hỏi chính và dễ kiểm tra hơn.
- **Phase 5 — Dinh dưỡng: đã triển khai bản đầu.** Thư viện có tìm kiếm và sắp món gần đây; nhật ký sao chép ngày trước; bữa mẫu độc lập với lịch sử; công thức có nguyên liệu/bước nấu/macro nhập thủ công và có thể ghi vào nhật ký khi đủ macro. Công thức chưa có ảnh hoặc scale theo số phần.
- **Phase 6 — Nhật ký & ảnh:** nghiên cứu DailyBean từ nguồn công khai chỉ để học nguyên tắc, thiết kế riêng cho Tracker, nhật ký nhanh, lịch sử; nghiên cứu IndexedDB/compression trước khi lưu ảnh.
- **Phase 7 — sao lưu có ảnh:** thiết kế gói xuất/khôi phục binary riêng; không gọi JSON hiện tại là backup đầy đủ cho ảnh.
- **Phase 8 — tùy chọn:** PWA, đồng bộ, tài khoản, Flask/SQLite hoặc triển khai khi nhu cầu thật xuất hiện.

## Ràng buộc cho các mốc tiếp

1. Mỗi thay đổi dữ liệu lưu phải có schema version, đọc được dữ liệu cũ, xử lý lỗi và bài kiểm tra migration.
2. Không lưu ảnh lớn trong `localStorage`, không upload dữ liệu riêng tư.
3. Không tự sửa kế hoạch tập/dinh dưỡng trong `MASTER_PLAN.md` hoặc đưa ra kết luận y khoa.
4. Giữ tính năng cũ chạy được; kiểm tra desktop, điện thoại hẹp, bàn phím và reload.
5. Không push GitHub nếu bạn chưa yêu cầu.
