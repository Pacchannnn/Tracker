# Tracker

**Hiện tại: schema8 · V4 Phase4B-3 · 180 tests.** Tải lại mọi tab để nhận asset/module `v=26`. Đã có Add/Remove/Reorder trong buổi đang tập hợp lệ; mọi thay đổi chỉ áp dụng hôm nay. Lịch sử vẫn có guard/CAS và không có structural controls. Live Replace chưa triển khai. Xem [báo cáo](V4_IMPLEMENTATION_REPORT.md).

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
2. Vào **Gym → Gym hôm nay** để bắt đầu buổi kế tiếp. **Original Plan** giữ nguyên A/B/C/D. Hoặc vào **Kế hoạch** để tạo/nhân bản/chỉnh các buổi riêng và chọn kế hoạch active. **Thư viện bài** có tìm/lọc và bài custom. Nhập tạ, số lần, RIR rồi chọn **Lưu hiệp**; bản nháp đang tập lưu sau mỗi hiệp.
3. Chọn **Hoàn thành & lưu buổi**. Vào **Gym → Lịch sử** để xem hoặc mở lại sửa.
4. Tạo món ở **Dinh dưỡng → Thực phẩm**, rồi thêm vào **Nhật ký ngày**. Có thể lưu một bữa đã ghi thành **Bữa lưu sẵn**, sao chép ngày trước, hoặc nhập **Công thức**. Macro công thức là dữ liệu bạn tự nhập; công thức thiếu macro không ghi vào nhật ký ăn.
5. Ghi cân, eo, ngủ hoặc ghi chú gối ở **Tiến độ**.
   **Tiến độ → Tổng quan** cho biết các trung bình theo tuần và lịch sử theo bài khi có dữ liệu. **Gym → Cardio & gối** cho phép ghi hoạt động và tình trạng gối riêng.
6. Vào **Nhật ký & Ảnh** để đánh dấu trạng thái ngày, thẻ và ghi chú. Ảnh lưu cục bộ trong trình duyệt; ảnh tiến độ có ngày, góc chụp, cân/eo tùy chọn. Ảnh được nén, file gốc trên thiết bị không bị sửa.
7. Vào **Cài đặt & sao lưu** để chuẩn bị và tải **hai file**: dữ liệu JSON và ảnh JSON. Giữ cả hai file riêng tư. Nếu trình duyệt không tải file dữ liệu, dùng **Sao chép JSON**. Xác nhận cả hai file thực sự tồn tại trước khi xóa dữ liệu trình duyệt.
8. Để khôi phục, chọn file dữ liệu JSON, xem trước, giữ bản sao an toàn rồi xác nhận thay thế. Sau đó chọn file ảnh, xem trước và thêm ảnh còn thiếu. Nhập ảnh không xóa hoặc ghi đè ảnh hiện có.

## Chỉnh bài trong buổi hôm nay

- **Thêm bài:** dùng Shared Picker tìm/lọc/chọn nhiều bài, duyệt/chỉnh hiệp/reps/RIR/nghỉ rồi Confirm. Mặc định2 hiệp,8–12,RIR2,90s là cấu hình chỉnh được; không lấy từ MASTER_PLAN và không chọn tạ tự động. Lựa chọn/review chưa Confirm sẽ mất khi hủy/rời trang. Bài đang active bị chặn trùng; tối đa100 mục kể cả bài đã dừng.
- **Bỏ bài:** xác nhận giữ mọi hiệp đã ghi. Bài vẫn hiện **Dừng bài**, không ghi thêm vào đó; có thể sửa đúng hiệp cũ. Thêm lại cùng bài tạo mục mới, không mở lại mục cũ.
- **Di chuyển lên/xuống:** đổi vị trí với bài active kế bên; vị trí bài inactive giữ nguyên. Hiệp đã ghi thuộc cùng mục. Timer đang chạy giữ label/nghỉ đã chọn; không hứa khôi phục timer sau reload.
- Có hiệp chưa lưu: **Quay lại**, **Lưu hiệp** (chỉ khi hợp lệ) hoặc **Bỏ phần nhập chưa lưu**. Lưu qua dialog chỉ lưu hiệp; phải duyệt/chọn thao tác cấu trúc lại. Ngày/ghi chú/setup đang sửa phải lưu/hủy theo flow hiện có trước.
- Không còn bài active: Add vẫn có; Complete chỉ thành công khi có ít nhất1 hiệp. Không tự xóa hoặc hoàn thành draft. Không có các nút cấu trúc khi sửa lịch sử.

## Lưu buổi và xử lý xung đột

- Ngày/ghi chú buổi có nút **Lưu ngày & ghi chú** riêng. Lưu hiệp trước khi đổi chế độ, timer hoặc màn hình; phần đang nhập chưa lưu sẽ chặn thao tác có thể làm mất nó. Hủy sửa hoặc bỏ draft là thao tác rõ ràng.
- Nếu lần tập trước có cùng bài ở nhiều mục, chọn **lần xuất hiện trước** trước khi dùng số cũ; mục chưa ghi hiệp không có số để điền. Không gộp các mục dù tên/bài giống nhau.
- Khi tab khác đổi dữ liệu, app giữ input và chặn lệnh stale. Giữ phần cần dùng, đưa ô về giá trị ban đầu rồi mở lại **Buổi đang tập** để review bản mới; tự nhập/lưu lại. App không tự replay hoặc merge.
- Mở lịch sử tạo candidate riêng; nguồn chỉ thay sau Complete nếu còn giống baseline. Nguồn đổi/xóa: giữ/export candidate, xem/mở lại nguồn mới nhất hoặc xác nhận **Lưu bản sao lịch sử riêng**. Bản sao là một buổi mới và được tính thêm vào thống kê.
- **Xuất bản nháp riêng / Sao chép bản nháp JSON** chỉ giữ candidate để review; không phải backup toàn bộ app để khôi phục ở Settings. Dùng Settings để xuất backup đầy đủ.
- Legacy mơ hồ chỉ sửa hiệp có ID duy nhất hoặc ngày/ghi chú; không đoán ownership để ghi hiệp mới. Structured hỏng hoặc schema tương lai bị từ chối.

## Giới hạn hiện tại

- Dữ liệu chỉ ở browser profile hiện tại. Xóa site data, đổi origin/profile hoặc cài lại trình duyệt có thể làm mất dữ liệu; xuất backup đều đặn.
- Chưa hỗ trợ đồng bộ, tài khoản hay Flask/SQLite. Ảnh nằm trong IndexedDB riêng; file dữ liệu JSON không chứa ảnh. Bản sao ảnh riêng dùng JSON/base64, giới hạn 200 MB ảnh và có thể tốn bộ nhớ với thư viện ảnh lớn. Công thức có xem trước lượng định nấu; chưa hỗ trợ chia lại cùng mẻ thành khẩu phần mới hoặc quy đổi khối lượng sau nấu.
- Trong buổi tập có thể dùng **Chế độ tập trung**, **Dùng số lần trước**, ghi chú setup riêng và đồng hồ nghỉ tùy chọn. Đồng hồ dùng mức thấp của khoảng nghỉ trong plan làm mặc định; dữ liệu lần trước chỉ để điền nhanh, không phải lời khuyên tăng tải.
- Nếu đã mở Tracker trong nhiều tab trước khi cập nhật phiên bản này, tải lại tất cả tab để chúng dùng cùng cách lưu an toàn mới. Trình duyệt cần hỗ trợ Web Locks; nếu không, ứng dụng từ chối ghi dữ liệu thay vì ghi đè thiếu an toàn.
- Dashboard gợi ý **buổi kế tiếp** trong plan active theo buổi hoàn thành gần nhất; Original Plan theo A→B→C→D. Buổi riêng không làm tiến thứ tự plan custom. Tuần 1–2 không tự giảm hiệp của plan custom.
- Tuần chương trình được chọn thủ công. Mỗi hiệp chọn tải `kg` hoặc `lb`; cân nặng dùng `kg` và eo dùng `cm`, chưa có chuyển đổi tự động. Ghi tên máy trong ghi chú buổi; DB ghi mỗi tay và barbell tính cả thanh theo plan.
- Mục tiêu carbs không được plan định nghĩa. Fat 60–75 g/ngày là phạm vi tham khảo trong plan; app chỉ tính tổng thực phẩm do bạn nhập, không có cơ sở dữ liệu thực phẩm mặc định.
- Buổi tập có thể hoàn thành sau ít nhất một hiệp; điều này cho phép ghi buổi dở dang, không phải xác nhận đã làm đủ bài.
- Tên hiển thị đã đổi thành Tracker. Khóa `localStorage` cũ vẫn được giữ để không làm mất dữ liệu đã lưu. Font Patrick Hand được đóng gói trong `assets/fonts/` theo giấy phép OFL.

## Kiểm tra tự động

```powershell
npm ci
npm test
```

Web chạy trực tiếp bằng Python, không cần npm để mở app. Bộ kiểm tra dùng Node và một dev dependency `fake-indexeddb` để kiểm tra giao dịch ảnh trong bộ nhớ; dependency này không được nạp vào web.

## Tính năng V3

- **Kế hoạch:** tạo, đổi tên, nhân bản, chọn active, chỉnh/thêm/xóa/sắp buổi. Original Plan luôn còn; bản sao lấy thông số của tuần đang chọn, khoảng nghỉ gốc được ghi trong notes và timer dùng mức thấp của khoảng đó.
- **Builder:** thêm/thay/bỏ bài, nút lên/xuống, hiệp, reps min/max, RIR hoặc khoảng, giây nghỉ, ghi chú. Bài mới có mặc định chỉnh được (2 hiệp, 8–12, RIR 2, nghỉ 90s), không phải lời khuyên cá nhân.
- **Buổi riêng:** vào **Tạo buổi**, duyệt rồi bắt đầu hoặc lưu thành kế hoạch mới. Trước Start/Save, tên buổi/bài/thông số/thứ tự/notes được tự lưu thành bản nháp riêng. Reload → chọn Tiếp tục hoặc Bỏ; kể cả giá trị đang nhập dở được giữ. Autosave chưa sửa kế hoạch hoặc lịch sử. Sau khi bắt đầu, bản nháp và history đã có snapshot riêng.
- **Trợ lý lên buổi:** gợi ý LOCAL theo nhóm cơ, dụng cụ, bài yêu cầu/loại trừ và tham số. Luôn là draft; duyệt vào builder để chỉnh/thay bài rồi mới bắt đầu/lưu. Không có remote AI, API key hoặc upload dữ liệu. Các ghi chú ngôn ngữ tự nhiên được giữ để tự duyệt, chưa được thuật toán diễn giải. Xem [AI_PLANNER.md](AI_PLANNER.md).
- **Ảnh món/công thức:** tạo nội dung trước, dùng **Thêm / thay ảnh** trên card món hoặc trong chi tiết công thức. Thay/gỡ ảnh có xác nhận. Xóa món/công thức giữ macro của nhật ký cũ và giữ ảnh trong Nhật ký & Ảnh để tự quản lý.
- **Dữ liệu:** schema 7; V5→6 thêm custom planning, V6→7 thêm planningDraft rỗng, giữ dữ liệu cũ. Sửa/xóa template/plan không sửa completed sessions. Bài custom có tham chiếu được archive thay vì xóa định nghĩa.
- Chỉ thử phục hồi trên origin thử sau khi kiểm tra đã có đủ hai file backup. Không đăng dữ liệu/ảnh hoặc tài liệu cá nhân lên repo public.

Trạng thái triển khai và giới hạn kiểm tra: [V3_ROADMAP.md](V3_ROADMAP.md). Hướng dẫn toàn dự án: [FULL_STEP_BY_STEP_GUIDE.txt](FULL_STEP_BY_STEP_GUIDE.txt).

## Cải tiến V4 — 04/10/2026

- **Nhật ký ngày:** tìm tên món không dấu ngay form ghi ăn; chọn món gần đây, nhập lượng và lưu. Không có kết quả sẽ khóa nút ghi để tránh lưu nhầm.
- **Công thức:** mở chi tiết → đổi **Số phần định nấu** để xem lượng nguyên liệu và tổng macro tương ứng. Mỗi phần giữ kích thước và macro gốc; lượng ăn ghi trong form bên dưới là thao tác riêng. **Về lượng gốc** khôi phục preview. Không sửa công thức, lời hướng dẫn hay lịch sử.
- **Nhật ký & Ảnh:** thẻ gần đây có thể chọn/bỏ, đồng bộ với ô nhập và vẫn cần bấm Lưu. Bố cục trạng thái ngày thích ứng theo chiều rộng màn hình.
- Mốc lịch sử: Phase1 schema6, Phase2–3 schema7. Hiện Phase4B-2 giữ schema8; không thêm dịch vụ/thư viện runtime. Tải lại mọi tab Tracker để nhận asset/module `v=23`.

Nghiên cứu 35 sản phẩm: [GLOBAL_APP_RESEARCH.md](GLOBAL_APP_RESEARCH.md). Ý tưởng chưa triển khai: [TRACKER_FEATURE_BACKLOG.md](TRACKER_FEATURE_BACKLOG.md), [TRACKER_PRODUCT_IDEAS.md](TRACKER_PRODUCT_IDEAS.md). Trạng thái và bằng chứng: [V4_ROADMAP.md](V4_ROADMAP.md), [V4_IMPLEMENTATION_REPORT.md](V4_IMPLEMENTATION_REPORT.md).

## V4 Phase 2: phục hồi và backup

- Builder và Local Planner giữ phần trước Start/Accept qua reload. Có thời điểm lưu và Continue/Discard; không tự bắt đầu hoặc lưu/activate kế hoạch. Đổi input Planner hủy gợi ý cũ ngay.
- Status “đã lưu” chỉ sau write thành công. Conflict giữa tab báo CHƯA LƯU; sao chép phần cần giữ trước khi reload mở bản mới. Nếu Start/Save lỗi, bản nháp đã lưu vẫn còn.
- Backup đầy đủ cần **dữ liệu JSON + ảnh JSON**. Nhập dữ liệu trước, ảnh sau; xem preview/xác nhận. Link tải chỉ là yêu cầu tải, hãy kiểm tra hai file thật trên máy. Nếu không tải được, dùng Sao chép JSON và nút sao chép JSON ảnh sau chuẩn bị, dán vào hai file .json riêng tư.
- 74/74 tests. Paired fixture roundtrip đã chạy qua hai origin thử; dữ liệu/snapshots và3 ảnh giữ nguyên metadata/bytes. Mobile CSS đã thử iframe320/360/390 và top-level390; chưa thử điện thoại vật lý/quota thật/file lớn. Báo cáo: `V4_IMPLEMENTATION_REPORT.md`.

## Chọn bài trong Builder — V4 Phase3

Gym → Tạo buổi (hoặc sửa buổi custom) → **Thêm bài bằng bộ chọn**. Lọc tên không dấu/cơ chính/dụng cụ/pattern, chọn nhiều bài rồi **Xác nhận thêm bài**. Đổi filter giữ lựa chọn. **Thay bài** chọn một bài và duyệt so sánh/thông số/ghi chú trước xác nhận. Bài đã có bị chặn trùng; bài custom đang dùng cũng xuất hiện.

Xác nhận tự lưu vào bản nháp; reload → **Tiếp tục bản nháp**. Lựa chọn chưa xác nhận sẽ mất khi rời trang. Lưu kế hoạch/source hoặc Start vẫn là hành động riêng. Schema7 giữ nguyên. Kiểm chứng và giới hạn: [V4_IMPLEMENTATION_REPORT.md](V4_IMPLEMENTATION_REPORT.md).
