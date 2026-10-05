# Ảnh cục bộ và sao lưu

## V4 Phase 4B-3 — schema8 structural compatibility

Data JSON remains schema8, preserving mixed legacy/structured sessions and editing baselines; raw/wrapped1–7 migrate additively. Identity/session snapshots/historyEditBase are preserved losslessly and malformed structure fails validation. Photo IndexedDB version1 and photo backup format1 are unchanged; no image migration or new photo feature. Full backup still requires two files. Existing photo bytes/owners/rollback tests pass; this milestone's browser roundtrip checks data JSON only.

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

## V4 Phase 2 — trạng thái và bằng chứng (05/10/2026)

Settings có trạng thái riêng cho dữ liệu và ảnh: đã chuẩn bị, đã yêu cầu tải (phải kiểm tra file trên máy), đã khôi phục phần tương ứng. Không báo “backup hoàn tất” chỉ vì có link. Data preview đếm cả hai bản nháp pre-start schema7. Photo preview báo số owner món/công thức còn thiếu; giữ ảnh trong gallery và không tự tạo owner. Import cùng ID giữ ảnh hiện tại; preview chỉ là dự kiến, count cuối lấy từ transaction.

Photo export chấp nhận kho rỗng để có file zero-photo rõ ràng. Sau chuẩn bị, có fallback **Sao chép JSON ảnh đã chuẩn bị**; dán vào file .json riêng tư nếu link tải không hoạt động. Sao chép ảnh lớn có thể thất bại do giới hạn clipboard/bộ nhớ; app báo lỗi, chưa kiểm chứng ảnh lớn. Clipboard chứa ảnh riêng tư và cần được quản lý như file backup. Không lưu base64 vào localStorage.

**TESTED:** export/parse/import qua IndexedDB test mới hoàn toàn; cùng ID/metadata/owner/blob/thumbnail bytes; duplicate skip, duplicate-ID package reject, missing owner; injected failure ở lần thêm thứ hai abort cả batch và giữ ảnh cũ. Các tests replace/remove/stale/rollback cũ vẫn đạt. Không sửa transaction vì tests xác nhận cơ chế hiện có đã đáp ứng.

**MANUALLY VERIFIED:** dữ liệu và3 ảnh JPEG synthetic (food, recipe, orphan-food) được nhập vào8770, xuất từ state thật qua clipboard ra hai file, import dữ liệu trước rồi ảnh ở8771 sạch, xuất lại và so sánh toàn bộ state/bytes. Nhập lặp thêm0/giữ3; file invalid bị từ chối và re-export không đổi. Recovery/backup iframe viewport320/360/390 không overflow; top-level390 cũng được kiểm tra.

**NOT VERIFIED:** download-link completion trong Codex IAB (download event timeout), thư viện lớn/gần200MB, quota/storage pressure thật, profile chứa dữ liệu thật, Safari/điện thoại vật lý. Roundtrip là bằng chứng cho fixture local, không chứng minh mọi profile/thiết bị. Hai phần restore vẫn độc lập; giữ bản sao trước restore để phục hồi nếu phần còn lại thất bại.
## Phase 5A read-only day photos — 06/10/2026

The IndexedDB database version1/store and photo backup format remain unchanged. `listPhotoMetadata()` projects a readonly cursor into metadata with blob/thumbnail omitted; it does not call getAll, decode original bytes, retain original Blob arrays or create original URLs. Because existing records co-locate metadata and binaries, cursor.value still supplies structured-clone Blob handles internally; this is not a separate physical metadata store or a measured promise about browser internal I/O. No new photo schema/index layer is introduced.

`getPhotoThumbnail(id)` returns only the selected thumbnail or null, never the original as a fallback. My Day requests thumbnails only for matching selected-date IDs, releases URLs on navigation, checks detached hosts before appending, and keeps a missing/error placeholder per image. All photo categories use their explicit date, once per ID; owner IDs and orphan state are not changed. Gallery source navigation still uses the existing full-image editor; that is separate from initial My Day loading.

Readonly opening of an absent DB aborts initial upgrade instead of creating persistent stores. listPhotos/getPhoto use that same no-initialization path so merely navigating into an existing source editor does not initialize an empty photo DB. Explicit photo Save/import continues to use the original write path. Tests verify no database remains after empty reads, metadata excludes binaries/getAll, selected thumbnail access only, zero write transactions and unchanged records. Browser initial My Day with5 photos:0 JSON/photo writes,0 original URLs,4 thumbnail URLs (one thumbnail missing); photo-only day and simulated metadata failure isolated from JSON cards. Large photo-library memory/I/O and real quota remain unverified.
