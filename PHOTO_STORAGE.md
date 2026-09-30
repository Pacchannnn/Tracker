# Ảnh cục bộ và sao lưu

## Quyết định lưu trữ

Tracker giữ dữ liệu chữ/số trong một đối tượng `localStorage` có `schemaVersion` và giữ ảnh dưới dạng Blob trong IndexedDB `tracker-photos/photos`. IndexedDB phù hợp với dữ liệu binary hơn localStorage và transaction giúp các lần thêm/xóa theo lô không bị lưu dở. Không có upload, analytics hay truy cập ảnh từ bên ngoài. Trình duyệt vẫn có thể xóa dữ liệu site khi hết dung lượng hoặc khi người dùng xóa profile/site data; vì vậy cần xuất bản sao thường xuyên.

Ảnh JPG/PNG/WebP tối đa 20 MB được xử lý trên thiết bị: cạnh dài tối đa 1800 px, JPEG quality 0.82 và thumbnail 320 px quality 0.72. Tracker giữ bản nén và thumbnail; file gốc nằm ngoài app không bị đụng tới. Ảnh tiến độ có loại riêng và metadata tùy chọn, không có phân tích cơ thể/y khoa.

## Sao lưu và khôi phục

V3 thêm `ownerType: food | recipe` và `ownerId` tùy chọn trong cùng photo record/store, category vẫn `food`; không đổi DB version và không sao chép ảnh sang localStorage. Card thư viện hiển thị ảnh mới nhất của chủ sở hữu. Thay/gỡ ảnh chỉ tác động ảnh của chủ sở hữu đó, có xác nhận và kiểm tra ID/updatedAt để chặn tab cũ ghi đè. Nếu giao dịch thay ảnh thất bại, IndexedDB rollback cả phần xóa ảnh cũ. Xóa food/recipe giữ ảnh trong gallery để người dùng quản lý, và không đổi meal macro snapshot. File backup ảnh giữ metadata owner; phục hồi ảnh không tự tạo món/công thức còn thiếu.

Tests Node dùng [fake-indexeddb của maintainer](https://github.com/dumbmatter/fakeIndexedDB) làm dev dependency để chạy giao dịch trong bộ nhớ; frontend vẫn dùng IndexedDB native. Kiểm tra mô phỏng rollback không chứng minh khả năng chịu quota thật trên thiết bị.

Một bản sao đầy đủ hiện cần **hai file riêng**:

1. `tracker-backup-*.json`: cài đặt, buổi tập, dinh dưỡng, check-in và nhật ký chữ/số. Khôi phục file này thay thế dữ liệu cấu trúc sau kiểm tra/xem trước và xác nhận.
2. `tracker-photos-*.json`: ảnh JPEG đã nén, thumbnail và metadata, mã hóa base64 để chuyển giữa trình duyệt. Khôi phục file này kiểm tra định dạng/ảnh, xem trước, rồi chỉ thêm ID ảnh chưa tồn tại trong một transaction IndexedDB. Không xóa hay ghi đè ảnh hiện có.

Hai thao tác khôi phục không tạo thành một transaction chung giữa localStorage và IndexedDB. Vì vậy giữ cả hai file, kiểm tra file thực sự tải về, và nhập file dữ liệu trước rồi file ảnh. Định dạng ảnh JSON có giới hạn 200 MB ảnh giải mã và có thể tốn nhiều bộ nhớ; nếu thư viện ảnh tăng lớn cần đánh giá ZIP hoặc xuất dạng streaming. Chưa thêm thư viện nén vào bản hiện tại.

## Tài liệu kỹ thuật đã tham khảo

- [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN IndexedDB transaction concepts](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology)
- [MDN StorageManager estimate](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)
- [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
- [MDN canvas.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)

Về trải nghiệm nhật ký, Tracker chỉ dùng nguyên tắc thao tác nhanh từ thông tin công khai của [DailyBean](https://www.dailybean.app/en) và [FAQ](https://dailybean.app/en/faq). Dấu mực, bố cục giấy, văn bản và luồng ảnh là thiết kế riêng của Tracker; không dùng hình, biểu tượng hoặc bố cục của DailyBean.
