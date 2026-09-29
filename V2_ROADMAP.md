# Tracker V2 — lộ trình triển khai

_30/09/2026 · Bản này mở rộng ứng dụng hiện tại; giữ giao diện giấy/vẽ tay và dữ liệu local._

## Trạng thái

- **Phase 1 — an toàn dữ liệu: hoàn thành trong mã hiện tại.** Ngày nhật ký ăn theo local date khi ở chế độ Hôm nay; buổi kế tiếp theo A→B→C→D; ghi dữ liệu có Web Lock và tải trạng thái mới nhất; macro bữa cũ giữ snapshot. Có kiểm tra tự động và luồng hai tab trên origin thử.
- **Phase 2 — sao lưu/khôi phục JSON: hoàn thành trong mã hiện tại.** Xuất có thời điểm và schema version; nhận file kiểu cũ; kiểm tra schema, xem trước số lượng, yêu cầu bản sao an toàn và xác nhận trước khi thay thế. Đã thử khôi phục trên origin thử. Sự kiện tải file trong công cụ kiểm tra chưa xác nhận được; người dùng nên kiểm tra file tải thực tế.
- **Phase 3 — Gym nhanh hơn: tiếp theo.** Điền set từ lần trước, chế độ tập trung, ghi chú bài, đồng hồ nghỉ, lịch sử dễ xem; sau đó cardio và log gối có cấu trúc.
- **Phase 4 — Tiến độ:** tổng kết tuần và xu hướng dựa trên dữ liệu thật; trạng thái trống rõ ràng.
- **Phase 5 — Dinh dưỡng:** tìm kiếm, món gần đây, bữa ăn lưu sẵn, sao chép bữa/ngày; sau đó công thức nấu.
- **Phase 6 — Nhật ký & ảnh:** nghiên cứu DailyBean từ nguồn công khai chỉ để học nguyên tắc, thiết kế riêng cho Tracker, nhật ký nhanh, lịch sử; nghiên cứu IndexedDB/compression trước khi lưu ảnh.
- **Phase 7 — sao lưu có ảnh:** thiết kế gói xuất/khôi phục binary riêng; không gọi JSON hiện tại là backup đầy đủ cho ảnh.
- **Phase 8 — tùy chọn:** PWA, đồng bộ, tài khoản, Flask/SQLite hoặc triển khai khi nhu cầu thật xuất hiện.

## Ràng buộc cho các mốc tiếp

1. Mỗi thay đổi dữ liệu lưu phải có schema version, đọc được dữ liệu cũ, xử lý lỗi và bài kiểm tra migration.
2. Không lưu ảnh lớn trong `localStorage`, không upload dữ liệu riêng tư.
3. Không tự sửa kế hoạch tập/dinh dưỡng trong `MASTER_PLAN.md` hoặc đưa ra kết luận y khoa.
4. Giữ tính năng cũ chạy được; kiểm tra desktop, điện thoại hẹp, bàn phím và reload.
5. Không push GitHub nếu bạn chưa yêu cầu.
