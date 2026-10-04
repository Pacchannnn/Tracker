# Browser dependencies — nguồn đọc ngày 04/10/2026

Đã mở 4 trang MDN dưới đây, mỗi trang tối đa 5000 ký tự; đây là kiểm tra phạm vi API, không phải chạy compatibility trên thiết bị thật.

| Đề xuất | Phân loại | Bằng chứng / ràng buộc |
| --- | --- | --- |
| Barcode | LOCAL WITH BROWSER API để đọc mã; EXTERNAL DATABASE nếu tra macro từ catalog ngoài | [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API) chưa hỗ trợ đồng đều, cần secure context trên browser hỗ trợ. Đọc barcode không tự cung cấp nutrition; barcode→food trong thư viện tự tạo có thể local. Cần fallback nhập mã thủ công. |
| Voice | BROWSER API; có thể EXTERNAL SERVICE | [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) phân biệt recognition và synthesis; recognition có tùy chọn platform service hoặc local browser. Không hứa mọi browser/Vietnamese chạy offline. Trước dùng phải kiểm tra provider/processing và quyền microphone. |
| Nhắc nghỉ / journal | LOCAL WITH BROWSER API; background delivery phụ thuộc platform/service worker | [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) cần permission qua user gesture; mobile thường cần persistent notification bằng service worker. API hiển thị notification không bảo đảm scheduler chạy đúng lúc khi đóng app. |
| Lưu local/backup | FULLY LOCAL, nhưng durability phụ thuộc browser | [Storage quotas/eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) mô tả storage theo origin, best-effort mặc định, quota và yêu cầu persist có thể được duyệt hoặc từ chối. Persist không thay backup, không bảo vệ khỏi xóa site data. |

Các tính năng food search, batch recipe scaling, tag chips, My Day và summaries có thể làm bằng dữ liệu hiện có, không cần quyền camera/microphone/notification hay dịch vụ ngoài.
