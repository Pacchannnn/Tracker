# Tracker V4 — Phase 9A: architecture decision

08/10/2026 · **DESIGN / RESEARCH ONLY · PROPOSED, chưa được duyệt triển khai.**

## 1. Kết luận

Vercel static + Supabase Auth/PostgreSQL/private Storage phù hợp với nhu cầu một tài khoản, 2–3 thiết bị. Khuyến nghị giữ UI Vanilla JS và các pure domain modules; đồng bộ **từng aggregate**, giữ payload schema 8, thay vì chép đè toàn bộ JSON. Supabase không tự cung cấp contract offline, bảo toàn draft hay giải quyết xung đột của Tracker.

Cần thêm hai thành phần **đề xuất** ngoài cấu hình hosting: persistence adapter có transaction dữ liệu + outbox, và một write gateway được tin cậy. Gateway dự kiến là Supabase Edge Function xác minh user JWT, dùng PostgreSQL transaction để CAS/validate/ghi receipt. Chưa chọn SDK, cài dependency, tạo project hoặc thay app.

Các quyết định D1–D10 ở cuối phải được duyệt trước phase liên quan. Tài liệu này không phải approval cho cloud, tài khoản, chi phí hay upload.

## 2. Baseline thực tế — VERIFIED

| Hạng mục | Kết quả kiểm tra ngày 08/10/2026 |
| --- | --- |
| Git trước tài liệu | `main`, HEAD `93befc1`, clean; code checkpoint `2e4dfc7` |
| Node tests thực chạy | 439/439, 0 fail/cancel/skip/todo; log riêng `.local/phase9a-baseline.txt` |
| Syntax thực chạy | 74/74 file JS trong source/tests |
| Dữ liệu | JSON schema 8; localStorage key `vshape-tracker` |
| Ảnh | IndexedDB `tracker-photos`, store `photos`, DB version 1 |
| Backup | JSON v8 và photo JSON format 1; hai file, không atomic với nhau |
| Runtime | HTML/CSS/Vanilla JS; chưa có Auth/backend/sync/SW/PWA |
| Thiết bị thật | NOT VERIFIED; kế thừa giới hạn Phase8B2, không chạy browser/device mới ở 9A |

Nguồn nội bộ: [data model](DATA_MODEL.md), [8B2 matrix](PHASE8B2_COMPATIBILITY_MATRIX.md), [backup evidence](PHASE8B2_BACKUP_VERIFICATION.md), [device checklist](PHASE8B2_MANUAL_DEVICE_CHECKLIST.md), source và tests. Tests hiện tại chứng minh contract local đã liệt kê; không chứng minh cloud hoạt động.

## 3. Current architecture audit

| Phần đã xác minh từ source | Ý nghĩa đối với sync |
| --- | --- |
| `js/data.js`: một JSON gồm settings, sessions, foods, entries, checkins, draft, exerciseNotes, cardioEntries, kneeEntries, savedMeals, recipes, journalEntries, customExercises, plans, activePlanId, planningDraft | Không có user/device/cloud revision/tombstone chung. Không được tự gán timestamp còn thiếu vào dữ liệu lịch sử |
| `updateData`: Web Lock `vshape-tracker-write`, load latest, clone, validate, một `setItem` | Atomic cho JSON local; lock chỉ cùng origin. Không có lock phân tán; thiếu Web Locks thì fail closed |
| `ensureUnchanged` và guard session/draft | So sánh baseline đầy đủ, bảo vệ stale local edits. Cần giữ guard này bên trong cloud adapter, thêm server CAS |
| `sessionStructure`: revision/basis/slots/order; slot IDs, snapshot, trạng thái và replacement links; sets gắn slotId + immutable registry ordinal | Đồng bộ workout nguyên aggregate ban đầu. Không chia slots/sets thành các hàng độc lập làm mất invariant |
| `sessionStructure.revision` tăng cả khi log set | Đây là domain revision, không dùng thay server revision hoặc cursor |
| Legacy sessions có thể không có structure; ambiguous ownership được giữ raw | Không materialize/đoán ownership chỉ để sync. Không biến record lỗi thành một record mới rồi bỏ record cũ |
| Completed history giữ snapshot, nhưng cho sửa có chủ đích | Snapshot không đổi theo template; history không phải write-once. Sửa history cần CAS source và giữ candidate riêng |
| `draft` singleton; `historyEditBase` có thể cùng session ID với completed source | Cloud phải phân biệt live workout và history-edit candidate; không để candidate biến completed thành live |
| `planningDraft` revision + Builder/Planner raw payload, source baseline, invalid strings | Lưu nguyên draft chưa hợp lệ; không auto Start/Accept/activate. Dùng per-device draft để tránh tranh singleton |
| Foods/recipes/entries và meal snapshots | Sửa/xóa source không đổi macro đã ghi. Không áp FK cascade xóa entries hoặc rebuild snapshots |
| Journal một entry/date; mood/tags/title/note, client timestamps | Hai ID khác nhau cùng ngày vẫn xung đột semantic. Không chỉ kiểm tra trùng ID |
| Photo Blob + thumbnail trong một IDB transaction; metadata CAS bằng updatedAt | Client timestamp không đủ cho cross-device CAS. Cần revision cloud độc lập |
| Journal delete JSON rồi delete daily photos riêng; owned-photo replace có transaction IDB riêng | Có partial failure hiện tại. Cloud cần reviewed dependencies và thao tác publish metadata có transaction; blob ngoài DB vẫn không atomic |
| Photo ownerType/ownerId tùy chọn; orphan và nhiều ảnh cùng owner hợp lệ | Không tự repair owner; không unique(owner), không FK cascade xóa ảnh |
| JSON restore replace toàn state theo baseline; photo import add-missing/skip cùng ID | Không gắn restore này vào sync rồi tự upload một loạt delete. Skip ID chưa chứng minh bytes bằng nhau |
| Nutrition pending multi-add, Cooking Mode, search/filter/timer ở closures | Không có persisted recovery cho các state này. Không hứa tất cả form chưa Save sống qua refresh |
| Nhiều `loadData(localStorage)` và write bindings trực tiếp trong app/UI | Không thể cắm một hàm sync là xong; cần refactor có giới hạn cả read/write/account context, giữ domain/UI |

Photo “original” hiện là **JPEG đã nén mà app lưu**, không phải file camera nguyên bản. Không upload ảnh camera để thay nó. Local dates `YYYY-MM-DD` giữ đúng ngày người dùng chọn; server UTC ordering không đổi ngày này.

## 4. Ranh giới kiến trúc được đề xuất

```text
Vanilla UI + domain validators/read models hiện có
                  |
       Workspace persistence adapter
       /                              \
Local-only mode                   Cloud account mode (future)
localStorage schema8              IndexedDB account workspace
tracker-photos DBv1               state + shadow + outbox + conflicts + photos
                                  |
                          authenticated Sync Gateway
                                  |
                   PostgreSQL CAS/receipts/version feed
                                  |
                   Private Storage: immutable photo assets
```

Vercel phục vụ shell public, không giữ dữ liệu riêng trong deploy artifact. Backend có trách nhiệm xác minh identity, validation, transaction và publish ảnh. Không cần Flask/SQLite cho phương án này; không thêm remote AI.

### Persistence boundary: quyết định lớn cần duyệt

Không khuyến nghị `localStorage.setItem(data)` rồi `IDB.put(outbox)`: crash giữa hai bước có thể mất thao tác sync hoặc queue thao tác không tồn tại. IndexedDB chỉ có transaction trên stores trong **cùng database**. [IDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction).

Đề xuất một DB mới **`tracker-sync` v1 trong tương lai**, key scope theo environment/project/user UID, chứa:

- `workspaces`: schema8 projection, selected draft, local revision/epoch, cursor.
- `shadow`: bản cloud đã được xác nhận và server revisions.
- `outbox`: intent bất biến, operation ID, base/dependencies, trạng thái gửi.
- `conflicts`: base/local/remote và kết quả review chưa gửi.
- `photos`: metadata và Blob/thumbnail của workspace account.

Một local transaction ghi projection + outbox; thao tác ảnh ghi bytes + photo intent cùng DB. Chỉ báo **Đã lưu trên thiết bị** sau transaction complete. **Đã đồng bộ** chỉ sau cloud receipt. Không hứa power-loss durability tuyệt đối hay chống browser eviction.

DB local-only cũ và key cũ vẫn giữ nguyên để rollback. Không mirror account A/B vào key anonymous chung. Migration copy ảnh vào account DB giữ ID/bytes, có thể tăng dung lượng local gấp đôi; phải preview quota. Không nâng DB ảnh v1 hoặc đổi backup/schema trong Phase9A. Khi được duyệt triển khai, storage metadata/version mới phải có migration tests riêng, dù payload portable vẫn schema8.

Adapter cần async initialization, snapshot trong memory cho read models, atomic mutations và workspace epoch để chặn kết quả async từ account cũ. Giữ Web Locks fail-closed hiện tại; transaction/revision cũng kiểm tra multi-tab. Không âm thầm thêm fallback cho browser thiếu lock.

### Drafts và chuyển thiết bị

- Live workout là record có phase `live|completed`; selected draft là con trỏ **cục bộ từng device**. Remote live record có thể hiện trong “Tiếp tục trên thiết bị này” sau review, không tự thay draft đang mở.
- Planning envelope và history-edit candidate có identity theo device. Remote drafts có thể được xem/copy/tiếp tục **có chủ đích**; không overwrite raw Builder/Planner đang làm.
- Complete đồng bộ workout và clear/cập nhật đúng candidate trong một server operation; local projection update cùng outbox. Lịch sử source là record riêng khi candidate sửa history.
- Nhiều draft trên cloud không nhét hết vào singleton schema8. Backup v8 chỉ chứa selected device draft; cần export riêng từng workspace nếu muốn giữ các draft còn lại.

## 5. So sánh lựa chọn

| Phương án | Chuyển đổi | Ưu điểm | Hạn chế / quyết định |
| --- | --- | --- | --- |
| Whole JSON + last-write-wins | Thấp | Nhanh làm demo | Loại: dễ mất food/journal/set/draft độc lập; delete resurrection |
| Whole JSON + CAS + manual review | Thấp–vừa | Có thể bảo toàn hai phiên bản, ít bảng | Viable fallback nếu chỉ backup/transfer; contention cả workspace, upload lại toàn file, review khó, ảnh vẫn riêng |
| **Aggregate JSONB + server CAS/version feed** | Vừa | Giữ nested invariants/schema8; independent records không tranh nhau; incremental | Khuyến nghị có điều kiện: adapter/outbox/gateway và conflict UI cần duyệt |
| Normalize mọi workout slot/set/ingredient | Cao | SQL analytics/FK chi tiết | Hoãn: chuyển đổi legacy/ownership lớn, chưa cần cho sync cá nhân |
| CRDT/automatic field merge | Cao | Có thể giảm manual conflicts | Hoãn: remove/replace/complete/snapshot không phải text merge; phức tạp hơn giá trị hiện tại |
| Supabase direct table writes từ frontend | Thấp ban đầu | Ít backend | Loại cho sync writes: có thể bypass receipts, compound invariants, validation và ordering |
| Firebase hoặc backend Flask/SQLite tự vận hành | Vừa–cao | Khả thi theo nhu cầu khác | Không chọn mặc định: phải thiết kế lại gateway/conflicts/ảnh và vận hành; không có lợi ích đủ rõ cho yêu cầu này |
| Vercel static + manual paired backup, chưa sync | Thấp | Không upload dữ liệu, giữ app đơn giản | Fallback nếu chi phí/privacy hoặc complexity không được duyệt; không đạt tự sync hai máy |

## 6. Offline và compatibility

**VERIFIED:** source hiện dùng local JSON/IDB và Web Locks; tests local đạt. Phase8B2 chỉ chứng minh managed IAB và các fixture cụ thể, không phải iPhone Safari hay Firefox thật.

**PROPOSED:** account workspace đã mở có thể ghi offline vào outbox; foreground reopen/focus/online/manual Sync thực hiện pull/push, backoff+jitter. Token hết hạn vẫn giữ local changes, dừng network cho tới đúng UID đăng nhập lại. Đồng bộ không tức thì; polling khi app foreground có thể bắt đầu ở 60 giây (giá trị thiết kế, không đo usage).

**NOT VERIFIED:** cold launch/reload khi offline, iOS suspension, native quota/crash/eviction, storage persistence grants, real multi-device. Hiện không có Service Worker, nên cache shell offline không được bảo đảm. Một phase riêng có thể được duyệt để phục vụ shell offline; không tự triển khai PWA/SW. [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API). WebKit có quota/eviction riêng; backup cần nằm ngoài kho browser. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).

Checklist tương lai: iOS Safari; Android Chrome/Firefox; Windows Chrome/Edge/Firefox; macOS Safari/Chrome/Firefox. Kiểm tra capability trước write, background→foreground, restart, airplane mode, token expiry, 2 tabs, 2–3 devices, keyboard/safe area, near-quota và origin khác. Tất cả dùng fixtures và account test tách riêng; không phá dữ liệu thật.

## 7. Chi phí — research official ngày 08/10/2026

USD, chưa thuế/SMTP/domain/overage; kiểm tra lại trước mua hoặc release.

| Dịch vụ | Giá/quota đã xác minh |
| --- | --- |
| Supabase Free | $0; DB500MB, Storage1GB; egress5GB uncached +5GB cached;50k MAU; unlimited API requests;2 active projects; pause sau1tuần không hoạt động; không daily DB backup |
| Supabase Pro | Từ$25/tháng; DB8GB, Storage100GB; egress250GB mỗi loại;7daily DB backups; thêm project từ$10/tháng. Overage DB$0.125/GB, Storage$0.0213/GB, egress uncached$0.09/cached$0.03 mỗiGB |
| Vercel | Hobby$0 cho personal/non-commercial; Pro$20/tháng theo pricing hiện tại. Dùng static shell để tránh server compute tại Vercel |

Nguồn: [Supabase pricing](https://supabase.com/pricing), [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [Vercel pricing](https://vercel.com/pricing), [Hobby eligibility/limits](https://vercel.com/docs/plans/hobby). Unlimited API requests không có nghĩa unlimited function CPU/storage/bandwidth.

### Ảnh: mô hình tính, không phải kích thước dữ liệu người dùng đo được

Giả định decimal MB/GB: nominal mỗi ảnh JPEG0.50MB + thumb0.05MB; high scenario1.50+0.10MB. Phiên bản thay ảnh và staging tạm tăng storage.

| Số ảnh | Nominal storage | High storage | Nominal giữ2asset versions | Egress2device: toàn thumbs +20% originals, nominal | Egress2device: tải toàn bộ high |
| --- | --- | --- | --- | --- | --- |
|100|0.055GB|0.160GB|0.110GB|0.030GB|0.320GB|
|1,000|0.550GB|1.600GB|1.100GB|0.300GB|3.200GB|
|5,000|2.750GB|8.000GB|5.500GB|1.500GB|16.000GB|

Ba thiết bị tạo download tương tự tăng cột egress ×1.5; cache hit thực tế chưa đo, nên không mặc định dùng quota cached. Nominal1,000ảnh có thể vừa1GB khi chỉ giữ một version; high hoặc2versions vượt.5,000ảnh vượtFree storage. Bản backup/download độc lập còn tiêu thụ bandwidth.

### Database/API và vận hành

Giả định5năm:20workouts/tháng×60×20KB≈24MB;10meal entries/ngày×1,825×1KB≈18.25MB; journal1/ngày×4KB≈7.3MB;5,000photo metadata×2KB≈10MB;other≈5MB. Current records khoảng64.55MB **trước indexes/JSONB overhead**.

Version feed mới là chi phí lớn: giả định40mutations/ngày×1,825×15KB≈1.095GB;73,000receipts×1KB≈73MB. Initial no-GC policy dễ vượt DB Free, dù dữ liệu hiện tại nhỏ. Đây là lý do cần D7 retention/budget, không tự chọn TTL mất retry safety. Chưa benchmark payload thực tế.

Một account =1MAU, không phải số máy. Với40mutations/ngày≈1,200push/tháng; polling60s trong1giờ/ngày trên2máy≈3,600pull/tháng (3máy≈5,400), thêm auth/photo stages/download/retry. Đây là sizing assumptions; batching giảm request count. Gateway photo verification phải benchmark trong giới hạn runtime: hiện256MB RAM,2s CPU/request, wall clockFree150s/paid400s. [Edge limits](https://supabase.com/docs/guides/functions/limits). Không dùng background function sống lâu để bảo đảm sync.

Một production Pro project khoảng$25/tháng; thêm paid Micro staging có thể khoảng$35 tổng; SMTP/domain/tax/egress/compute khác tính riêng. VercelHobby nếu đủ điều kiện có thể$0. Không có khoản mua nào được duyệt. Free phù hợp thử synthetic; pause/no DB backups/quota không phải lời hứa độ tin cậy production.

**Backup không được bỏ qua:** current photo package giới hạn200MB binary (encoded file280MB; JSON data import10MB). Nominal1,000/5,000ảnh vượt photo format hiện tại. Cần thiết kế multipart/inventory backup được duyệt riêng trước phát hành hỗ trợ kho lớn; không đổi format ở9A. Supabase DB backups không chứa Storage bytes. [Provider backup scope](https://supabase.com/docs/guides/platform/backups).

## 8. Decision register — chưa được duyệt

| ID | Cần quyết định | Khuyến nghị / gate |
| --- | --- | --- |
|D1|Nhà cung cấp, region, email owner, chấp nhận plaintext cloud|Vercel + Supabase có điều kiện; chọn region rõ trước tạo project; cloud không E2EE |
|D2|Persistence adapter/account IDB, local storage tăng|Duyệt boundary transactional; giữ local-only DB cũ; không queue bên cạnh localStorage |
|D3|Trusted Edge gateway và restricted DB role|Duyệt trước cloud write; không frontend service-role/direct writes |
|D4|Draft cross-device UX|Per-device candidates + explicit resume/copy; không overwrite singleton |
|D5|Conflict review|Base/local/remote, giữ hai candidate; không LWW; quyết định rõ copy history có tăng count |
|D6|Photo cache/offline|Thumbs trước, original on demand; người dùng chọn download offline, hiển thị missing |
|D7|Budget/version/tombstone/asset retention|Thử nghiệm no-GC có budget stop; production phải duyệt retention/resnapshot/backup scope |
|D8|Độc lập backup kho lớn|Giữ formats hiện tại; contract backup mới riêng nếu vượt caps hoặc nhiều drafts |
|D9|Logout/local cache & device revocation|Seal không xóa pending; remove-local có confirmation sau backup; JWT/URL không revoke tức thì |
|D10|Offline shell, production timing|Không tự PWA/SW/deploy; real-device gates trước dữ liệu thật |

## 9. Liên kết và điểm dừng

- [Sync contract](PHASE9A_SYNC_CONTRACT.md): ordering/outbox/conflicts/first sync.
- [Cloud model](PHASE9A_CLOUD_DATA_MODEL.md): tables/constraints/transactions/ownership.
- [Security & privacy](PHASE9A_SECURITY_PRIVACY.md): Auth/RLS/photos/migration/recovery.
- [Implementation roadmap](PHASE9A_IMPLEMENTATION_ROADMAP.md): từng phase và approval gates.

**STOP Phase9A.** Exact next proposal là9B-1 Deployment readiness **local packaging only**, cần người dùng duyệt riêng. Chưa deploy Vercel, tạo Supabase, thêm auth, queue, schema, ảnh cloud hay migrate.
