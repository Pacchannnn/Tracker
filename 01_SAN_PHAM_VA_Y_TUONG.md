# Tracker — Sản phẩm và ý tưởng cốt lõi

_Bản cô đọng ngày 16/10/2026. Đọc tiếp: [Kiến trúc & dữ liệu](02_KIEN_TRUC_VA_DU_LIEU.md) · [Trạng thái & bàn giao](03_TRANG_THAI_VA_BAN_GIAO.md)._

## 1. Tracker là gì?

Một website cá nhân để **lên kế hoạch, ghi lại và xem lại việc tập luyện, ăn uống và cuộc sống hằng ngày**. Bắt đầu từ kế hoạch fitness/V-shape có sẵn, mở rộng sang tự xây chương trình, nhật ký và ảnh.

Trải nghiệm mong muốn: **gõ tên miền → mở Tracker → ghi nhanh → lưu → tìm lại dễ dàng**. Không cần mở terminal hoặc ứng dụng Windows để dùng website. Cloud là lựa chọn riêng; dữ liệu trên thiết bị vẫn dùng được khi chưa đăng nhập.

## 2. Các phần chính đã có trong ứng dụng

| Phần | Giá trị và chức năng chính |
| --- | --- |
| Hôm nay / My Day | Buổi kế tiếp, thông tin đã ghi, shortcut; xem các bản ghi theo ngày và dẫn về editor nguồn. |
| Gym | Original Plan A/B/C/D; log từng hiệp tạ/reps/RIR; nháp, lịch sử, dữ liệu lần trước, timer và ghi chú. |
| Tự thiết kế bài tập | Exercise Library có lọc; workout/plan nhiều ngày; sửa thứ tự và thông số, thay bài, buổi tập riêng không đổi plan chính. |
| Chỉnh buổi đang tập | Thêm, bỏ, đổi thứ tự, thay phần còn lại; giữ hiệp đã ghi và phân biệt thay đổi hôm nay với template. |
| Dinh dưỡng | Food Library, nhật ký theo bữa, tổng macro, recent theo bữa, thêm nhiều món, sao chép có chọn và bữa lưu sẵn. |
| Công thức | Nguyên liệu, khẩu phần, bước nấu, macro do người dùng nhập, ảnh; tìm kiếm, nhân bản, cooking mode và xem lượng nấu. |
| Nhật ký & ảnh | Ghi theo ngày, mood/tag, lịch/tìm kiếm/lọc và lịch sử nhiều trang; ảnh ngày, món ăn, công thức và tiến độ. |
| Tiến độ / Review | Check-in, cardio, ghi nhận đầu gối; My Day, Weekly Life Review và Monthly Memories từ dữ liệu đã lưu. |
| Settings / Backup | Chỉnh mục tiêu, xuất dữ liệu/ảnh, xem trước khôi phục; account workspace và recovery riêng cho cloud. |

**Có chức năng trong app không đồng nghĩa đã nghiệm thu chức năng đó trên Supabase thật.** Phạm vi xác minh ở file 03.

## 3. Những nguyên tắc không được làm mất

- `MASTER_PLAN.md` là nguồn chuẩn cho Original Plan: bài tập, thông số, tiến trình, cardio, dinh dưỡng và lưu ý đầu gối. Custom plan phải tách riêng; luôn quay về plan gốc được.
- Không bịa macro, dữ liệu sức khỏe hoặc mục tiêu chưa định nghĩa. Dùng **DATA NOT DEFINED YET** hoặc cấu hình chỉnh được.
- Sửa template/food không được làm thay đổi workout hoặc macro đã ghi trong lịch sử.
- Người dùng quyết định việc tập. Không tự tăng tải, xác nhận đầu gối an toàn hoặc chẩn đoán từ log.
- Thiếu dữ liệu, chưa rõ dữ liệu và giá trị bằng 0 là các trạng thái khác nhau. Không suy ra quan hệ nhân quả từ biểu đồ.
- Giữ giao diện giấy/vẽ tay đã duyệt, tên **Tracker**, font tiếng Việt local; ưu tiên nhập nhanh trên điện thoại và điều khiển bằng bàn phím.
- Giảm thao tác và giữ dữ liệu quan trọng hơn thêm tính năng theo đối thủ. Không xây lại app đang hoạt động.

## 4. Planner và AI

Planner hiện tại chạy bằng **logic local**, lọc bài theo cơ/dụng cụ, include/exclude, thông số và báo yêu cầu xung đột. Nó chưa phải dịch vụ AI từ xa và không hiểu đầy đủ ghi chú ngôn ngữ tự nhiên.

Luồng: **chọn sở thích → nhận draft → review/chỉnh/thay bài hoặc hủy → tự chọn Start/Save**. Không tự kích hoạt hay ghi đè plan. Manual builder luôn tồn tại. Nếu thêm AI thật, chỉ gửi dữ liệu đã được phép, giữ key ở server và chốt chi phí/retention trước.

## 5. Những ý tưởng còn cân nhắc

| Nhóm | Ý tưởng và điều kiện |
| --- | --- |
| Ghi nhanh | Điền từ hiệp ngay trước trong cùng slot; favorites/pins và lượng ăn thường dùng; phục hồi pending meal batch. Cần nhu cầu thực tế, không tự coi đã duyệt. |
| Dinh dưỡng rõ hơn | Serving/gram mapping do người dùng nhập, cooked weight/yield, chia lại mẻ và shopping checklist. Không tự quy đổi “bát” sang gram. |
| Tập luyện sâu hơn | Equipment profiles, warm-up/working sets, supersets, phân bố nhóm cơ và PR; cần quy ước identity/tạ/đơn vị rõ. |
| Trang chủ | My Day làm Home là một đề xuất; giữ đường Start/Resume Gym và phục hồi nháp. Không coi đây là default đã chốt. |
| Nền tảng | PWA/offline cold-start, thông báo, backup ảnh lớn và export/import plan riêng; chỉ thêm khi có nhu cầu. |
| AI / analytics | AI giải thích sở thích, associations và cloud cá nhân hoàn chỉnh; phải giải quyết riêng quyền riêng tư, quyền truy cập và chi phí. |

Các tài liệu ý tưởng cũ có mục nay đã làm xong, như My Day, tìm nhật ký, cookbook và review tuần/tháng. Không đưa chúng trở lại backlog chỉ vì bảng cũ còn ghi “proposal”.

Nguồn kỹ thuật đang giữ: [Planner/AI](docs/AI_PLANNER.md), [hợp đồng live workout](docs/PHASE4_LIVE_WORKOUT_CONTRACT.md) và [life review](docs/PHASE7_LIFE_REVIEW_CONTRACT.md). Các báo cáo/tổng kết/research cũ đã chuyển sang archive riêng ngoài repository; nội dung quan trọng được giữ trong3file tóm tắt. Nghiên cứu đối thủ là nguồn gợi ý, không thay thế yêu cầu hoặc plan của người dùng.
