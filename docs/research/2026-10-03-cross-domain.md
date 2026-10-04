# Cross-domain research — 03/10/2026

## Nguồn đã mở và bài học

| Sản phẩm/nguồn | Capability chính thức / opinion | Suy luận riêng cho Tracker |
| --- | --- | --- |
| [Gyroscope Daily Report](https://gyrosco.pe/features/daily-report/) | Trang chính thức mô tả timeline gộp sleep, food, workouts, mood và các hoạt động; có AI coaches. Không coi lời quảng cáo cải thiện sức khỏe là kết quả đã chứng minh. | My Day có thể join dữ liệu local theo date để đọc, không cần chép records giữa module hoặc gọi AI. |
| [Gyroscope privacy](https://gyrosco.pe/privacy/) | Chính sách nói nhiều xử lý/lưu trữ ở server; tài khoản private mặc định không có nghĩa dữ liệu chỉ nằm trên thiết bị. Trang có điều khoản giữ/xóa lịch sử theo loại account. | Chỉ học cách trình bày ngày. Không nhập kiến trúc cloud hoặc cơ chế retention vào Tracker. Chính sách đã mở nhưng bị giới hạn 6000 ký tự, không phải audit toàn bộ. |
| [Exist manual tracking](https://exist.io/page/help-manual-tracking/) | Custom quantities/duration/scales/times; quantity/duration mặc định 0 khi không ghi, loại khác để thiếu. | Tracker nên giữ unknown riêng với zero. Activity chips chỉ ghi điều đã chọn; không tự suy luận phủ định từ ngày thiếu. |
| [Exist mood](https://exist.io/about/mood/) | Rating 1–9 kèm note tùy chọn, custom tags, xem lại cùng ngày năm trước. | 5 lựa chọn hiện có đủ để thử quick entry. Memories đọc record cũ có giá trị hơn thêm nhiều thang bắt buộc. |
| [Exist FAQ](https://exist.io/page/faqs/) | FAQ nêu ít nhất 3 tuần trước correlations, có export và yêu cầu API cho integrations. Một số ví dụ service trong FAQ đã cũ, không dùng để xác nhận integration đang hoạt động. | Minimum data gate là nguyên tắc tốt; 3 tuần không được sao chép thành ngưỡng có ý nghĩa thống kê cho Tracker. Cần sample counts, nhóm so sánh và ngôn ngữ association. |
| [Người dùng Exist, 28/08/2025](https://missivesfromsamsara.com/2025/08/28/introducing-exist-the-newest-tool.html) | Bài trải nghiệm cá nhân mô tả rating/tags và nhìn lại dữ liệu hữu ích, tác giả vốn thích ghi bảng tính. Đây là một người dùng tự chọn, không đại diện mọi người. | Không thiết kế cho giả định người dùng thích nhập nhiều. Cho phép một mood hoặc note đủ hoàn thành ngày. |

## Ý tưởng riêng và đánh đổi

1. **Ngày của mình:** trang đọc hợp nhất theo ngày, mỗi card dẫn về editor nguồn; không tự tạo entry rỗng khi mở. Tắt/thu gọn card chưa có dữ liệu. 320px một cột; không chuyển tab bắt buộc qua mọi domain.
2. **Tuần có dấu vết:** nêu 4 ngày có food log/7, 3 mood records/7; số liệu và coverage đứng cạnh nhau. Không chấm điểm cả cuộc sống.
3. **Nhớ lại có lựa chọn:** mở ảnh/highlight của ngày/tháng cũ bằng hành động chủ động; tránh tự bật nội dung nhạy cảm hoặc notification gây bất ngờ.
4. **Chưa biết là trạng thái hợp lệ:** food macro null không là 0, không log gym không chứng minh không tập, mood không ghi không là ngày xấu.

Tất cả có bản local; browser notifications/wearable sync/remote summaries là những dependency khác, không tự động đi kèm.

## Phương pháp và giới hạn

4 search calls, tổng 20 result slots yêu cầu. Đã mở 6 URL ở bảng trên; không gọi 20 slots là 20 nguồn đã đọc. Một truy vấn rộng trả quảng cáo/dev promo, mirror GitHub và nguồn không liên quan: loại khỏi evidence. Không sử dụng bài DEV có tỷ lệ khảo sát không truy được nguồn, hoặc trang tổng hợp Reddit thay cho thread gốc. Đây là desk research, không cài và dùng thử các sản phẩm. Không gửi dữ liệu cá nhân của Tracker ra công cụ nghiên cứu.
