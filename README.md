# Tracker

**Hiện tại: schema8 · Cloud Batch2 LOCAL SYNTHETIC ACCEPTANCE PASS (11/10/2026).**
Account IndexedDB/outbox, sync hai chiều, offline/cache, conflict review và import
preview đã có; Supabase mặc định tắt, server thường vẫn không cho ghi cloud.
634/634 tests · 112/112 syntax · SQL45/121 · artifact48 files. Workout qua ACK,
conflicts, account isolation, mobile và paired backup/restore đã được kiểm tra bằng browser synthetic.
JSON backup8/photo backup1; entry/workspace `v=42`, imports khác `v=41`, CSS `v=39`. Không tạo project,
deploy, push, PWA hay nhập dữ liệu thật. Supabase/production/iPhone/Safari chưa xác
minh. Counts và gates cuối: [báo cáo Batch2](CLOUD_BATCH2_IMPLEMENTATION.md),
[setup và rollback](CLOUD_BATCH2_SETUP_AND_ROLLBACK.md),
[trạng thái dự án](V4_IMPLEMENTATION_REPORT.md). Dừng sau Batch2.

Ứng dụng dùng HTML, CSS, JavaScript thuần. Kho ẩn danh dùng localStorage + IndexedDB
ảnh; account cache dùng IndexedDB riêng. Nội dung bài tập lấy từ MASTER_PLAN.md;
ứng dụng không tự thay bài hoặc kết luận tình trạng gối.

## Cloud Batch2 — kiểm tra local

```powershell
npm test
npm --prefix cloud run test:sync
npm run build
npm run check:artifact
```

SQL runner dùng PostgreSQL WASM và dữ liệu giả, không kết nối Supabase thật.
Test dependencies đã có; sau clone cần `npm ci` và `npm --prefix cloud ci`.
Hai browser fixtures và các bước còn thiếu nằm trong setup/QA reports. Không chạy
restore/reset trên origin8765. Đăng nhập không tự nhập lịch sử ẩn danh hay ảnh.

## Cloud Batch1 — kiểm tra local

Backend/test dependencies nằm riêng trong `cloud`, không đưa vào web `dist`:

```powershell
npm --prefix cloud ci --ignore-scripts --no-audit --no-fund
npm --prefix cloud run test:db
```

Lệnh thứ hai chạy SQL/RLS và gateway với PostgreSQL WASM disposable, dữ liệu giả.
Không cần tài khoản Supabase; chưa chứng minh provider hoặc nhiều kết nối thật.
Cài đặt & sao lưu có panel Cloud ở trạng thái local-only. Đăng nhập khi được cấu
hình sau này cũng không tự chuyển dữ liệu local lên cloud. Hướng dẫn setup,
migration và rollback: [CLOUD_BATCH1_SETUP_GUIDE.md](CLOUD_BATCH1_SETUP_GUIDE.md).

## Chạy

Từ thư mục này:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8765/` trên **cùng máy**. Dùng cùng địa chỉ, cổng và browser
profile vì dữ liệu gắn với origin. Sync đã được kiểm tra bằng thiết bị giả cục bộ;
điện thoại thật chưa kết nối cloud và cần provider/gateway được duyệt riêng.

Nếu tab đã mở trước khi cập nhật app và vẫn hiện giao diện cũ, hãy **tải lại chính tab đó** bằng nút Reload của trình duyệt. Kiểm tra tiêu đề trang là **Tracker**. Đừng đổi cổng hoặc địa chỉ để tránh nhìn sang một kho `localStorage` khác.

## Đóng gói static — local preview

Từ thư mục Tracker, dùng Node (đã kiểm tra24.19.0) và Python:

```powershell
npm run build
npm run check:artifact
python -m http.server 8800 --bind 127.0.0.1 --directory dist
```

Mở `http://127.0.0.1:8800/`. Lệnh chỉ phục vụ **dist**, gồm48 file runtime
được allowlist; không phục vụ repo/private documents/backup. Output dự kiến cho
Vercel là **dist**; cấu hình chỉ được chuẩn bị, chưa triển khai. Không cần cài
dependency cho packaging; test suite vẫn dùng devDependency hiện có.
`node scripts/static-package.js --inventory` in path/bytes/SHA256. Nếu dist có
file lạ, build dừng và giữ file đó để kiểm tra, không tự xóa.

8800 là origin khác8765: dữ liệu cũ không tự xuất hiện. Giữ8765 cho dữ liệu đang
dùng; preview nên dùng fixtures, không khôi phục phá hủy dữ liệu thật. Vercel sau
này cũng là origin mới. Hai file backup dữ liệu/ảnh vẫn riêng tư; không đưa chúng
vào dist/GitHub. Không mở index bằng file://; dùng server cho ES modules/storage.
Tắt server preview bằng Ctrl+C khi xong. Provider setup, Batch2 sync và deployment cần duyệt riêng.

## Dùng nhanh

1. Vào **Cài đặt** chọn tuần chương trình (mặc định tuần 1) và sửa mục tiêu ăn nếu cần.
2. Vào **Gym → Gym hôm nay** để bắt đầu buổi kế tiếp. **Original Plan** giữ nguyên A/B/C/D. Hoặc vào **Kế hoạch** để tạo/nhân bản/chỉnh các buổi riêng và chọn kế hoạch active. **Thư viện bài** có tìm/lọc và bài custom. Nhập tạ, số lần, RIR rồi chọn **Lưu hiệp**; bản nháp đang tập lưu sau mỗi hiệp.
3. Chọn **Hoàn thành & lưu buổi**. Vào **Gym → Lịch sử** để xem hoặc mở lại sửa.
4. Tạo món ở **Dinh dưỡng → Thực phẩm**, rồi thêm vào **Nhật ký ngày**. Có thể lưu một bữa đã ghi thành **Bữa lưu sẵn**, sao chép ngày trước, hoặc nhập **Công thức**. Macro công thức là dữ liệu bạn tự nhập; công thức thiếu macro không ghi vào nhật ký ăn.
   Ô **Tìm thực phẩm** tìm theo tên không phân biệt dấu/hoa thường/đ-d/khoảng trắng: `com ga` tìm “Cơm gà”, `DAU HU` tìm “Đậu hũ”. **Xóa tìm kiếm thực phẩm** hoặc query trống đưa về toàn thư viện theo thứ tự hiện có; không sửa tên/macro/ảnh.
5. Ghi cân, eo, ngủ hoặc ghi chú gối ở **Tiến độ**.
   **Tiến độ → Tổng quan** cho biết các trung bình theo tuần và lịch sử theo bài khi có dữ liệu. **Gym → Cardio & gối** cho phép ghi hoạt động và tình trạng gối riêng.
   **Tổng quan tiến độ → Lịch sử theo bài** bắt đầu với20 **hiệp**; **Xem thêm** mở20hiệp kế tiếp, hiển thị số đang thấy/tổng số. Đổi bài, rời view rồi mở lại hoặc reload bắt đầu lại20; history đã lưu vẫn còn. Không đổi cách nhóm theo tên hay đơn vị tạ.
   **Tiến độ → Tuần đã ghi** có tuần trước/sau/hiện tại, chọn ngày và Làm mới. Xem ngày có bản ghi, tâm trạng, thẻ tự ghi, buổi tập, dinh dưỡng và metadata ảnh. Bản ghi tương lai được tách riêng; thiếu/chưa rõ/chưa đọc được không đổi thành số0. Mở nguồn rồi **Quay lại Tuần đã ghi** để đọc lại dữ liệu mới nhất; phần chưa lưu sẽ chặn rời trang. Xem tuần/nguồn không tự lưu hay mở buổi tập để sửa. Ngữ cảnh quay lại chỉ giữ trong tab, mất sau reload.
   **Tiến độ → Ký ức tháng** có tháng trước/sau/hiện tại, chọn tháng và **Làm mới**. Số bản ghi tính cả tháng; ngày có ghi chỉ tính những ngày đã đến hạn. Timeline theo ngày tăng dần, có dữ liệu mới hiện ngày; bản ghi tương lai vẫn hiện với nhãn riêng. Mở nguồn rồi **Quay lại Ký ức tháng** để đọc lại dữ liệu mới nhất và trở về đúng vị trí. Ghi chú nguồn chưa lưu sẽ chặn rời trang.
   Ảnh ban đầu chỉ hiện thông tin. **Mở ảnh** đọc thumbnail ảnh đó; **Xem ảnh đầy đủ** là thao tác riêng để đọc ảnh gốc. Thumbnail lỗi không tự mở ảnh gốc. **Đóng ảnh**/chuyển tháng/rời màn hình giải phóng ảnh đang xem; lỗi file ảnh không biến số metadata thành0. Các thao tác xem không ghi dữ liệu; tháng/ảnh/ngữ cảnh Back không giữ qua reload. Sao lưu dữ liệu và ảnh vẫn là hai file riêng như trước.
6. Vào **Nhật ký & Ảnh** để đánh dấu trạng thái ngày, thẻ và ghi chú. Ảnh lưu cục bộ trong trình duyệt; ảnh tiến độ có ngày, góc chụp, cân/eo tùy chọn. Ảnh được nén, file gốc trên thiết bị không bị sửa.
7. Vào **Cài đặt & sao lưu** để chuẩn bị và tải **hai file**: dữ liệu JSON và ảnh JSON. Giữ cả hai file riêng tư. Nếu trình duyệt không tải file dữ liệu, dùng **Sao chép JSON**. Xác nhận cả hai file thực sự tồn tại trước khi xóa dữ liệu trình duyệt.
8. Để khôi phục, chọn file dữ liệu JSON, xem trước, giữ bản sao an toàn rồi xác nhận thay thế. Sau đó chọn file ảnh, xem trước và thêm ảnh còn thiếu. Nhập ảnh không xóa hoặc ghi đè ảnh hiện có.

## Chỉnh bài trong buổi hôm nay

- **Thêm bài:** dùng Shared Picker tìm/lọc/chọn nhiều bài, duyệt/chỉnh hiệp/reps/RIR/nghỉ rồi Confirm. Mặc định2 hiệp,8–12,RIR2,90s là cấu hình chỉnh được; không lấy từ MASTER_PLAN và không chọn tạ tự động. Lựa chọn/review chưa Confirm sẽ mất khi hủy/rời trang. Bài đang active bị chặn trùng; tối đa100 mục kể cả bài đã dừng.
- **Đổi phần còn lại:** chọn một bài trong Shared Picker, duyệt số hiệp còn lại/reps/RIR/nghỉ/ghi chú rồi xác nhận. Luôn giữ mục cũ với logs riêng và tạo mục mới; không chuyển tạ hoặc logs. Nếu đổi target khác remaining, review ghi rõ **N hiệp mới**. Ghi đủ hiệp thì Replace bị khóa; dùng Thêm bài nếu muốn tập thêm. Bỏ successor không mở lại bài cũ. Sau Save trong dirty gate phải duyệt lại remaining; không tự replay.
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

## Xem ngày — Phase 5A

Ở **Hôm nay → Chọn việc cần làm → Xem ngày**, chọn ngày để xem nhật ký, các buổi tập đã hoàn thành, cardio, dinh dưỡng, check-in, ghi nhận gối và ảnh đã lưu. Dashboard vẫn là trang mặc định. Ngày trước/sau đi đúng một ngày lịch, không bỏ qua ngày trống; **Hôm nay** quay về ngày hiện tại trên thiết bị. Ngày tương lai được phép xem.

Trang này chỉ đọc và dẫn về editor nguồn. Dùng **Mở nhật ký / dinh dưỡng / lịch sử tập / check-in / cardio / ảnh**, sửa ở nguồn nếu cần, rồi **Quay lại Xem ngày** để thấy dữ liệu mới. Lịch sử và ảnh được lọc ngày, có nút xem toàn bộ. Ngày được giữ trong bộ nhớ khi điều hướng trong tab; reload trở về Dashboard và lần mở Xem ngày tiếp theo bắt đầu ở hôm nay. Không lưu thêm summary/ngày chọn vào dữ liệu.

Ngày trống hiện **Chưa có bản ghi**; ngày chỉ có ảnh vẫn hiển thị ảnh. Thiếu macro hiện **Chưa rõ**, không thay bằng0. Ảnh lỗi không che các bản ghi khác. Không có phân tích sức khỏe hay gợi ý tự động. Schema8 giữ nguyên, dữ liệu JSON và kho ảnh vẫn cục bộ. **5A và5B implemented/tested trong phạm vi local đã kiểm tra.**

## Tìm lại nhật ký — Phase 5B

Vào **Nhật ký & Ảnh → Lịch & dòng thời gian**. Ô **Tìm nhật ký** tìm trong tiêu đề, ghi chú và thẻ, không phân biệt hoa/thường hoặc dấu tiếng Việt (`met` tìm được `Mệt`). Khoảng trắng được gộp khi so sánh; nội dung đã lưu không bị sửa. Chọn nhiều thẻ nghĩa là nhật ký phải có **tất cả** thẻ đó và khớp query nếu có.

Tìm/lọc trên toàn bộ lịch sử rồi hiển thị ngày mới trước:30 kết quả đầu, **Xem thêm** thêm30. Đổi query/thẻ hoặc **Xóa bộ lọc** quay về30 kết quả; Clear trả focus về ô tìm. Không có dữ liệu hiện **Chưa có nhật ký**, không khớp bộ lọc hiện **Không tìm thấy nhật ký phù hợp**.

**Mở ngày** mở editor đúng ngày; **Quay lại kết quả nhật ký** tính lại từ dữ liệu hiện tại. Sau sửa/xóa, entry có thể không còn khớp query/thẻ. Tìm/lọc/xem thêm/mở kết quả không lưu dữ liệu. Chỉ Save/Delete trong editor thay dữ liệu theo flow hiện có. Query/thẻ/số kết quả không lưu qua reload; dữ liệu nhật ký và ảnh vẫn còn. Đã kiểm tra browser/iframe320/360/390 và keyboard; chưa kiểm tra điện thoại vật lý, screen reader hoặc Safari.

## Ghi nhiều món và copy có chọn — Phase 6A

Vào **Dinh dưỡng → Nhật ký ngày → Thêm nhiều món**. Chọn **Ngày đích/Bữa đích**, chọn món từ recent hoặc tìm kiếm; recent ưu tiên cùng bữa, fallback ghi rõ **bữa khác**. Món nguồn đã xóa hoặc công thức chưa đủ macro không chọn để ghi mới. Search không dấu và lọc thực phẩm/công thức vẫn giữ các món đã chọn.

Chọn **Review batch** → chỉnh số khẩu phần từng món, kiểm tra macro, bỏ món nếu cần → **Thêm N món**. Món mới mặc định1 khẩu phần;0.01–100, không tự lấy lượng lần trước. Chọn/review chưa ghi dữ liệu. Confirm ghi toàn batch một lần; lỗi/stale/quota không ghi một nửa và giữ review để sửa/retry. Khi nguồn đã thay đổi, hủy/mở lại batch để duyệt nguồn mới. Save pending khóa controls, không tạo2N do click lặp.

**Sao chép có chọn món**: chọn ngày/bữa nguồn → chọn từng bản ghi → ngày đích và giữ bữa nguồn hoặc chọn bữa đích → review/edit lượng → Confirm. Copy dùng macro snapshot đã ghi, kể cả food/recipe thư viện đã sửa/xóa; không dựng lại từ nguồn mới. Món nguồn/ngày đích đang có được giữ, bản copy có ID mới. Nút **Sao chép ngày hôm trước** cũ vẫn hoạt động.

**Quay lại chọn món** giữ lượng đã sửa; **Hủy batch** chỉ bỏ phần đang soạn. Pending chỉ ở bộ nhớ của tab; reload làm mất phần chưa Confirm, món đã Save vẫn còn. Xem ngày tự đọc totals/count mới; cook-size công thức vẫn là preview riêng với số phần đã ăn. Schema8 và backup/ảnh không đổi. Đã kiểm tra iframe320/360/390, keyboard/focus, lỗi storage giả lập; chưa thử điện thoại vật lý/Safari/screen reader/quota thật. Cookbook Phase6B đã triển khai như phần dưới. Favorites/pins, portion basis và pending recovery vẫn là proposals.

## Sổ công thức — Phase 6B

06/10/2026 · **Phase6B IMPLEMENTED / TESTED; full bounded Phase6 IMPLEMENTED / TESTED.** Schema8 unchanged;262→283 tests,59 JS syntax checks;36/36 gates passed in verified local scope. Code checkpoint ad1a8f5, asset34. STOP before Phase7. Favorites/pins, portion basis, pending recovery, cooked-weight/yield repartition and shopping list remain deferred proposals.

Vào **Dinh dưỡng → Công thức**:

- **Tìm công thức:** tên, từng thẻ hoặc tên nguyên liệu; không phân biệt hoa/thường/dấu tiếng Việt, bỏ khoảng trắng thừa. Tìm toàn thư viện; không ghép câu qua nhiều field. Thẻ phải khớp đúng sau normalization; chọn nhiều thẻ nghĩa là phải có tất cả, kết hợp AND với search. **Xóa tìm kiếm và thẻ** trở về toàn bộ. Không sửa dữ liệu khi tìm.
- **Nhân bản:** mở card → Nhân bản → review/chỉnh → Lưu bản sao. Tên mặc định “— Bản sao”, ID mới; chỉ Save mới ghi. Hủy/reload bỏ nháp. Nguồn đổi/xóa thì Save bị chặn: Hủy, mở nguồn mới rồi review lại. Lỗi storage giữ nháp và cho retry; bấm lặp không tạo nhiều bản sao. Bản sao không copy ảnh hay lịch sử.
- **Chế độ nấu:** đổi Số phần định nấu để xem nguyên liệu và tổng macro của lượng nấu; macro mỗi phần giữ nguyên. Các bước đánh số theo dữ liệu đã nhập, không sinh hướng dẫn mới. Preview và ghi chú chỉ đọc; không lưu target. **Về lượng gốc** reset; **Quay lại công thức** giữ search/thẻ trong tab và đưa focus về card.
- **Nấu ≠ ăn:** nấu2 phần với300kcal/phần là600kcal cả lượng nấu. Shortcut **Mở công thức để ghi ăn** chỉ đưa về logger cũ; lượng ăn vẫn mặc định1. Macro chưa biết vẫn DATA NOT DEFINED YET và shortcut bị vô hiệu. Ghi ăn vẫn cần Save riêng.
- Công thức mới dùng được trong **Thêm nhiều món** như công thức thường. Xóa definition giữ snapshot đã ghi, My Day và copy có chọn. Nút **Bỏ món** ngắn nhưng tên truy cập giữ đầy đủ tên món.

Đã kiểm tra synthetic browser A–L,320/360/390 và keyboard/focus. Chưa kiểm chứng điện thoại vật lý/Safari/screen reader/quota thật; search tuyến tính cho thư viện cá nhân, chưa đo thư viện lớn. Không có persistent cooking checklist. Xem báo cáo để biết giới hạn chính xác.
# Cloud Batch3 preview setup

Build-time public environment configuration is supported without editing source.
No cloud variables keeps local-only behavior. See [beginner setup guide](CLOUD_BATCH3_SETUP_GUIDE.md) and [verification report](CLOUD_BATCH3_IMPLEMENTATION.md).
Gateway writes remain disabled; real migrations/deployment/uploads need separate approval.
