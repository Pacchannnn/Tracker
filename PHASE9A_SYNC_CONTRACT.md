# Tracker V4 — Phase 9A: sync contract

08/10/2026 · **PROPOSED / DESIGN ONLY. Không endpoint, queue hoặc protocol nào dưới đây đã triển khai.**

Companion: [architecture/baseline/decisions](PHASE9A_ARCHITECTURE_DECISION.md), [cloud tables](PHASE9A_CLOUD_DATA_MODEL.md), [security/photo/migration](PHASE9A_SECURITY_PRIVACY.md).

## 1. Identity và ordering

| Giá trị đề xuất | Contract |
| --- | --- |
|`userId`|Supabase Auth UID từ JWT đã được server xác minh. Email không phải primary identity; bỏ qua UID tự khai trong request body |
|`environment/project`|Scope production/test khác nhau cả cloud lẫn local; không retarget queue khi đổi endpoint |
|`deviceId`|UUID tạo một lần cho installation/workspace; metadata phối hợp, không credential. Restore nội dung không clone device ID |
|`recordKey`|`(userId, kind, recordId)`; recordId **text**, giữ existing IDs, không ép mọi legacy/import ID thành UUID |
|`operationId`|UUID mới cho một intent bất biến; retry giữ nguyên ID và payload fingerprint. ID mới chỉ cho intent/review mới |
|`serverRevision`|Monotonic từng record; wire decimal string, PostgreSQL bigint. Không chuyển qua JS Number gây overflow |
|`commitSequence`|Monotonic từng user, cấp trong DB transaction dưới lock user head; wire decimal string |
|`domain revision`|Giữ `sessionStructure.revision` và `planningDraft.revision` đúng semantics hiện có; độc lập serverRevision |
|`date/timestamp`|Local date/timestamp trong payload giữ nguyên. UTC server audit time mới nằm envelope; không dùng client clock phân xử |

Set/slot IDs scoped theo session; plan day/slot IDs theo plan. Cross-kind trùng ID hợp lệ, cùng kind trùng key phải kiểm tra. Tombstone giữ key/revision, ngăn recreate từ base không còn tồn tại. Không lấy timestamp để quyết định thắng.

Không dùng sequence `nextval()` làm cursor commit: allocation không đồng nghĩa thứ tự commit. [PostgreSQL sequences](https://www.postgresql.org/docs/current/functions-sequence.html). Đề xuất user head row lock; tăng head và ghi các phiên bản/receipt trong **cùng transaction**. Một tài khoản ít thiết bị chịu được serialize commits; không lock toàn bộ users.

## 2. Đơn vị đồng bộ

- Whole workout/session incl slots/order/sets/snapshots; phase live/completed ở envelope.
- Whole custom plan incl days/slots; whole recipe incl ingredients/steps/macros.
- Một food/entry/journal/checkin/cardio/knee/savedMeal/customExercise.
- Settings + activePlanId cùng aggregate; exercise note từng key hiện có.
- Planning envelope theo device; history-edit candidate riêng theo device, giữ exact historyEditBase/source ID.
- Photo metadata một aggregate; bytes là asset ngoài JSON protocol.

Không sync dashboard/Weekly/Monthly/MyDay summaries, search state, timer, pending meal batch/Cooking closures hoặc Original PROGRAM như user edits. Không suy diễn hoạt động chưa ghi, unknown macro hoặc ownership legacy.

## 3. Local persistence và trạng thái UI

Cloud-mode persistence đề xuất nằm trong một account-scoped IndexedDB transaction, xem D2. Local-only mode hiện tại không đổi.

1. Capture reviewed source, raw candidate và workspace epoch.
2. Under existing Web Lock + local revision check: apply domain command trên latest projection; validate đúng contract hiện có.
3. Ghi projection + immutable outbox intent; ảnh ghi cả Blob/thumbnail cùng transaction.
4. Commit rồi hiện **Đã lưu trên thiết bị / Chờ đồng bộ**. Failure/abort không hiện Saved, không clear draft.
5. Worker gửi sau commit; cloud ack khác local save. Trong khi push chưa xong, input mới không bị lấy lại bởi ack cũ.

Outbox fields tối thiểu: scope, operationId, deviceId, workspaceEpoch, commandType, changes[], reviewed preconditions, fingerprint, dependencies, state/attempt/nextRetry. Mỗi change có key, action create/update/delete, base và candidate payload khi có. State: queued → sending → synced, hoặc blocked-auth/conflict/rejected. Lease gửi là transient hoặc có hạn, reopen chuyển expired sending về queued, giữ operationId.

**Offline chain cùng record:** intent2 tham chiếu `after(operation1, key)` thay vì cùng dùng revision cũ. Server resolve base từ receipt1; nếu receipt1 chưa có thì dependency-not-ready; nếu1conflict thì2blocked. Không tự sửa payload hay rebase baseRevision trong retry. Những record khác có thể gửi tiếp.

Compound local actions phải thành một operation gồm tất cả thay đổi: Start + clear Builder; Accept Planner + replace Builder + clear Planner; Save plan + clear Builder; Complete/correct history + clear candidate; delete active plan + activePlanId=null; multi-add các captured meal snapshots. Không tách rồi báo thành công toàn phần.

Planning invalid raw fields được validate như **draft envelope**, không như workout executable. Ready workout validation chỉ khi explicit Start/Save. Historical ambiguous data vẫn đọc/export; không chuyển nó thành safe canonical structure bằng suy đoán.

## 4. Push contract và transaction server

Tên dưới đây là protocol thiết kế, chưa phải route/code executable.

`pushOperation` nhận protocolVersion, operationId, deviceId, changes, dependencies/preconditions; không tin userId client. Phân biệt protocol version mới với schema8 payload.

Server flow:

1. Verify JWT/project/account status; verify device registration scope và input limits.
2. Validate payload/domain command trong trusted gateway; DB vẫn enforce shape/invariants cần cho transaction, không chỉ tin frontend.
3. Lock user head; lookup receipt theo `(uid,operationId)`.
4. Cùng fingerprint → trả receipt cũ; khác fingerprint → reject ID reuse. Không chạy lại side effect.
5. Resolve dependency receipts; check create-absence/tombstone, expected revisions và semantic guards (journal date, plan references, workout source phase/history baseline).
6. Nếu conflict/reject terminal: giữ receipt/fingerprint/result, không change records hay increment head; client giữ candidate. Dependency-not-ready/transient/auth lỗi không trở thành terminal domain rejection.
7. Nếu hợp lệ: cùng transaction tăng record revisions, write current records/tombstones, allocate head+1, immutable version rows, applied receipt. Compound changes all-or-nothing.
8. Ack gồm operationId, status, commitSequence và canonical revisions/payload cho đúng keys. Timeout mất response → retry cùng intent; không đổi ID.

Gateway validation đọc latest accepted state và tạo **read preconditions** cho mọi nguồn ảnh hưởng kết quả (source plan/exercise/setup/history, không chỉ keys được sửa). Private transaction phải check lại toàn read set dưới account lock trước commit. Nếu state đổi giữa Edge validation và SQL commit, reject stale; không dùng kết quả validation cũ để bypass invariant. Fingerprint/candidate/read set phải do trusted gateway kiểm soát, không tin client gắn cờ “validated”.

Transaction-local account context derive từ verified UID, không email/body; parameterized queries. Private DB function chỉ trusted backend có EXECUTE, xem cloud/security docs. Direct browser DML không được phép bypass.

Initial proposed limits: tối đa100 changes/operation, tối đa2MiB JSON body; draft caps hiện có vẫn250,000 JSON chars/slot, workout cap Add100registry. Đây là transport/resource limits cần đo và duyệt, **không phải giới hạn truncate legacy imports**. Oversize hiện explicit unsupported/export guidance; không drop fields hoặc split một compound action làm mất atomicity. Photo bytes không qua push JSON. Migration batch một aggregate không split nested workout; payload lớn cần gate xử lý riêng.

## 5. Pull, snapshot và refresh-safe apply

`pullChanges(afterSequence, limit)` trả **complete commit groups**, mỗi group gồm toàn bộ revisions/tombstones của một operation. Limit là số commits, không cắt giữa rows của một multi-add/Complete. Proposed50commits/page và response byte budget; nếu một commit vượt budget cần explicit error/approved transport, không advance cursor qua phần thiếu.

Feed dựa immutable versions, không chỉ current rows đã bị update. Server trả head, minAvailableSequence, next cursor; account khác bị từ chối. App không dùng Realtime event làm nguồn authoritative. Realtime có thể là wake hint ở phase riêng; missed events luôn repair bằng pull.

Local apply trong một IDB transaction:

- Check workspace UID/epoch đúng; validate incoming payload/protocol, unsupported future version pause không wipe.
- Update shadow, receipt/ack knowledge, conflict records và cursor **cùng transaction**.
- Không pending intent trên key → update projection.
- Có pending key → giữ local candidate; remote vào shadow, đánh dấu conflict/review khi không còn đúng expected source. Không dùng incoming remote overwrite input.
- Own ack → chỉ retire đúng operation; replay các descendants đã lưu theo dependency trên accepted shadow để giữ input mới. Nếu replay không hợp lệ thì giữ candidate và block, không silent clear.
- Cursor chỉ advance sau đầy đủ group commit local. Crash trước commit → pull lại; sau commit → từ cursor đã lưu. Duplicate versions không tạo thêm sets/entries.

Dirty visible editor nhận stale notice, giữ raw input và baseline. User review latest rồi retry một intent mới. Queued response của account/tab context cũ bị epoch guard chặn; account-switch không áp ack sang account mới.

### First snapshot và pagination nhất quán

Capture server head **H** khi bootstrap. Query version history để lấy latest revision mỗi key có sequence≤H, keyset paging theo `(kind,recordId)`; include tombstones. Mỗi page dùng cùng H, không nhìn record thay đổi sau H rồi vô tình bỏ sót. Sau staging/validation toàn snapshot, commit workspace baseline/cursorH; tiếp tục pull >H. HTTP pages không chia sẻ một transaction read snapshot thông thường. [Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Initial design giữ versions/receipts/tombstones không GC trong prototype; không phụ thuộc timestamp TTL. Production retention quyết định D7: snapshot pin H + expiry, prune giữ baseline≤floor và all versions>floor; không prune đang pin. Client cursor dưới minAvailable phải resnapshot, **giữ outbox/conflicts**; apply không coi missing trong snapshot là permission xóa pending records. Nếu pin expired thì restart snapshot staging, không commit partial. Retention và budget là release gate, chưa duyệt mặc định một số ngày.

## 6. Eight required conflict cases

| Case | Classification | Hành vi đề xuất |
| --- | --- | --- |
|1 iPhone/laptop sửa cùng journal|User review; preserve both candidates|First CAS wins. Second giữ base/local/remote; chọn remote, chọn local có explicit new CAS, hoặc tự edit combined. Hai IDs cùng ngày cũng conflict; không tạo hai accepted entries/date |
|2 Hai thiết bị log cùng workout|User review ban đầu|Whole-workout CAS. Cùng slot+setNumber khác giá trị giữ cả candidates, không thêm duplicate set. Khác slots cũng review trước; không auto merge qua Replace/Remove/Reorder/Complete/legacy ambiguity |
|3 Delete food vs edit|User review; no resurrection|Delete tombstone wins CAS nếu đến trước; stale edit không recreate. Edit trước thì delete dựa revision cũ conflict. Existing historical entries không đổi. User có thể explicit create food mới, ID mới, giữ snapshots |
|4 Offline nhiều ngày|Retry or resnapshot + review|Không dùng clock. Nếu cursor còn supported pull; dưới floor full snapshot giữ queue. Stale updates/deletes review; independent new valid entries có thể append |
|5 Photo edit/delete hai máy|CAS review, preserve local bytes|Tombstone không bị stale metadata/update hồi sinh. Upload assets staged chưa publish nếu revision conflict; không delete remote mới ngoài reviewed IDs |
|6 Partial sync/network loss|Idempotent retry|Một DB operation atomic; nhiều operations có thể một phần ack. Retry cùng IDs, lookup receipts; photos có upload stages riêng. Không gửi lại toàn dataset rồi replace |
|7 Login với local data|Explicit migration decision|Account workspace khác anonymous. Preview cloud/local; choose keep local-only/open cloud/import after backup. Login/relogin không upload hoặc merge mặc định |
|8 Same kind/key collision|Reject + review|Không dựa tên/timestamp để dedup. Same operation/fingerprint là retry. Different operation cùng ID chỉ coi tương đương sau verified full equality và provenance review; khác bytes/payload giữ local conflict, không overwrite |

**Safe automatic merge duy nhất ban đầu:** independent new keys với validation/semantic constraints hợp lệ, ví dụ hai meal entries khác ID giữ captured snapshots; unrelated food và journal không tranh CAS. Hai workouts mới khác IDs là hai records, không tự dedup theo ngày. Settings cùng aggregate vẫn review khi concurrent.

Potential later optimization: append sets tự động chỉ nếu exact canonical structure/phase không đổi, distinct ownership+number và không duplicate/correction; cần contract/tests/approval riêng. Không nằm trong initial recommendation.

## 7. Conflict review contract

Conflict record giữ reviewed base, local candidate, remote revision/payload/tombstone, pending dependency graph và affected photo references. UI không coi conflict đã synced.

Actions: xem phiên bản, giữ remote (xác nhận abandon pending), sửa từ latest và gửi intent mới, export local candidate, hoặc copy độc lập khi domain cho phép. Copy completed workout cần remap session/slot/set/replacement IDs theo helper đã kiểm thử; báo tăng workout count. Ambiguous raw history không copy thành structured bằng đoán. Journal không copy cùng ngày để bypass unique-date; cần user chọn ngày/nội dung. Planner không auto Accept.

Resolution operation có new ID/base remote mới. Nếu remote lại đổi trong lúc review, reject giữ input; không “force overwrite” timestamp. Descendant intents chỉ bị abandon/rebuild sau user review, không tự replay stale Remove/Replace/Complete.

## 8. Deletes, tombstones và dependencies

- Record deletion là tombstone revision mới, không hard delete trước retention approval. Old creates/updates với base cũ bị reject.
- Plan delete không cascade sessions. Food/recipe delete không rewrite food snapshots. Custom exercise archive giữ referenced definitions theo semantics hiện có.
- Settings activePlanId guard: selecting plan đã deleted conflict; deleting active plan clears pointer atomically. Không tạo orphan active selection bằng operations out of order.
- Photo dependencies là soft owner references; orphan giữ để review. Journal delete chỉ bundle exact reviewed daily photo IDs/revs; server check current matching predicate để báo newly-added unseen photos và yêu cầu review lại, không sweep ảnh máy khác âm thầm.
- Independent creates từ deleted food source có thể giữ captured entry snapshot hợp lệ; không hard-FK backfill food chỉ để pass.
- Account delete là lifecycle riêng, không suy từ dataset rỗng hoặc restore.

## 9. Failure, token và coordination

| Lỗi | Contract |
| --- | --- |
|Offline/DNS/timeout/5xx|Backoff+jitter, same ID; manual retry; không clear local |
|401/token expiry|Dừng worker, giữ queue; reauth same UID rồi continue |
|403/account disabled/quota policy|Block rõ nguyên nhân; không loop hoặc chuyển UID |
|409CAS/semantic conflict|Persist conflict, review; pause descendants |
|422invalid/domain unsupported|Giữ/export candidate, không lược bỏ field để gửi |
|429|Theo retry delay, bounded retries, foreground resume |
|Native quota/IDB unavailable|Không Saved; bảo toàn bản trước; export recovery nếu đọc được |
|Tab suspend/refresh|Không cần background task hoàn tất; reopen nhận sending lease hết hạn, receipts repair |
|Browser eviction|Không bảo đảm phục hồi queue chưa cloud; backup ngoài browser + cảnh báo pending |

Multi-tab dùng Web Locks và sameDB revision/transactions; optional one-network-worker lock để giảm request nhưng idempotent server vẫn là bảo đảm đúng. BroadcastChannel/storage-like notices chỉ wake/reload, không authority. Không tự fallback unsafe khi capability thiếu. Device clocks khác nhau không ảnh hưởng CAS/cursor; client dates vẫn tự chọn.

## 10. Contract test obligations — NOT RUN, future gates

Operation lost ack→retry exact once; same ID/different payload reject; offline chain; compound rollback; concurrent user commits không skip; commit group pagination; snapshot H trong khi writes; future payload pause; local crash trước/sau data+outbox/cursor commit; ack giữ newest input; two tabs; all8 conflicts; tombstone long-offline; history candidate phase; account epoch; journal unique date; plan pointer; legacy raw/no guessed ownership; macro snapshots/null/zero; photo partial stages; quotas/backup limits.

Không dùng439local tests để tuyên bố các gates này đã đạt. **STOP9A.**
