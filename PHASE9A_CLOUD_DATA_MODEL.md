# Tracker V4 — Phase 9A: proposed cloud data model

08/10/2026 · **DESIGN ONLY. Không SQL migration đã tạo/chạy; schema app vẫn8, photo DB vẫn1.**

[Architecture](PHASE9A_ARCHITECTURE_DECISION.md) · [Protocol](PHASE9A_SYNC_CONTRACT.md) · [Security](PHASE9A_SECURITY_PRIVACY.md)

## 1. Lựa chọn: relational envelope, aggregate JSONB payload

Phân biệt **local schema8**, **future sync protocol version**, **future database migration version**, **server record revision** và **domain revisions**. Không gọi tất cả là schema9. Payload giữ source contracts/snapshots hiện có; ownership, sync order và receipts nằm ngoài payload.

Whole JSON CAS là alternative khả thi cho manual transfer ít ghi, nhưng mỗi update Nutrition tranh với cả Gym/Journal/settings. Aggregate CAS giảm contention; không normalize nested set/slot để tránh phá registry ordinal/replacement/history invariants. Đổi lại SQL analytics chi tiết khó hơn, cần validator/adapter. Whole JSON LWW bị loại do mất sửa độc lập.

## 2. Payload mapping — đã đối chiếu source; envelope là đề xuất

| Cloud kind | Local nguồn | Aggregate boundary / special rule |
| --- | --- | --- |
|`workout`|sessions và live draft|Một session payload nguyên vẹn; envelope phase live/completed. Completed payload không chứa historyEditBase; snapshot không đổi theo source template |
|`history_candidate`|draft khi sửa completed history|Payload cùng sessionID và historyEditBase; recordID cloud riêng, device scope, sourceSessionId soft ref. Không downgrade completed source |
|`planning_draft`|planningDraft|Một envelope revision/builder/planner mỗi device; recordId=device UUID; invalid raw input giữ đúng draft validation |
|`plan`|plans[]|Nguyên plan/days/slots; nested IDs không global |
|`exercise`|customExercises[]|Chỉ custom definitions; built-ins vẫn PROGRAM/catalog. Archive semantics giữ history |
|`food`|foods[]|Definition; không dùng nó để recalculate historical entries |
|`meal_entry`|entries[]|foodId + frozen food snapshot + servings/date/meal; recipe source prefix giữ nguyên |
|`saved_meal`|savedMeals[]|Nguyên record theo validator hiện có |
|`recipe`|recipes[]|Ingredients/servings/steps/tags/notes/nutritionPerServing; không fabricate timestamps hoặc macros |
|`journal`|journalEntries[]|Một accepted live journal/user/local date; mood enum/tags/createdAt/updatedAt giữ nguyên |
|`checkin`, `cardio`, `knee`|checkins/cardioEntries/kneeEntries|Mỗi record; có thể nhiều records/date, không unique ngày chung |
|`account_settings`|settings + activePlanId|Một record cố định `default`; deletion plan/pointer có compound guard |
|`exercise_note`|exerciseNotes map|Một key hiện có → note payload; không đổi key theo tên exercise |
|`photo`|photo DB metadata|Date/category/pose/measurements/note/optional owner/client times + asset manifest. Blob/thumbnail không JSONB |

Không lưu derived Weekly/Monthly/MyDay/progress aggregates, PROGRAM copy, food images base64, auth tokens hoặc search state trong records. Top-level projection reconstructed giữ array order có ý nghĩa của từng domain; arrays hiện tại không phải sets tùy tiện. Envelope có `position` khi thứ tự array là user-visible/semantically required; migration capture index và future inserts dùng explicit ordering contract, không sort tất cả theo server timestamp. Nested arrays/order giữ nguyên payload.

Projection `draft` chọn một live workout hoặc candidate trên device hiện tại; các remote live/candidate records không biến mất khi chưa selected. Planning source bản khác cần explicit review/copy. Server có thể nhiều live workouts khác IDs; user không phải bị ép abandon session máy khác.

Ordering proposal cụ thể: per-kind `position` là bigint wire string, không derive từ clock. Initial empty-cloud import cấp positions theo source array order; creates sau đó append bằng `max(position)+1` dưới account head lock. Update giữ position. Nonempty-cloud import phải preview thứ tự append/skip trước confirmation; không tự reorder existing cloud. Nested arrays giữ byte-equivalent nội dung/order. Cần roundtrip tests; position không được dùng thay set ownership hoặc workout registry ordinal.

## 3. Tables đề xuất — tên/fields là contract design

Tất cả sync tables trong private schema dự kiến `tracker_sync`; không expose write functions qua public PostgREST. Không phải bản DDL sẵn để chạy.

| Table | PK/FK và fields chính | Lý do |
| --- | --- | --- |
|`sync_accounts`|PK user_id UUID → auth.users.id; status active/disabled/deleting; head_seq bigint, min_available_seq bigint; server times|Account authorization, ordering lock, cursor floor |
|`sync_devices`|PK(user_id,device_id UUID); FK user; label, registered_at,last_seen_at,disabled_at|Phối hợp queue/draft, audit; không coi deviceID là credential |
|`sync_operations`|PK(user_id,operation_id UUID); FK user/device; fingerprint, terminal_status, commit_seq nullable, result, server time|Idempotency applied/conflict/reject; UNIQUE(user,commit_seq) cho applied |
|`sync_records`|PK(user_id,kind text,record_id text); FK user; revision bigint>0, last_seq, payload_schema, payload JSONB, deleted_at nullable, device/source envelope, position nullable|Accepted current state/tombstone; composite ownership và legacy IDs |
|`sync_record_versions`|PK(user_id,kind,record_id,revision); FK record key, FK operation; commit_seq,ordinal,payload/envelope/tombstone|Immutable revisions cho incremental feed và stable as-of-H bootstrap |
|`photo_uploads`|PK(user_id,upload_id UUID); FK user/device; photo_key,asset_version UUID,exact object paths,expected sizes/SHA256,base revision,expires_at,status,verified hashes|Staging/retry/finalize; không publish partial objects |

Thêm `sync_snapshot_pins(user_id,token,H,expires_at)` **chỉ khi triển khai pruning/retention**; initial prototype giữ all versions nên không cần pin table để tồn tại snapshot. No-GC là chi phí cần budget stop, không là policy production vô hạn được mặc định duyệt.

Record revisions, sequences và bigint JSON wire là decimal strings. Local domain revision vẫn safe JS integer theo validator hiện có. Server timestamps do DB cấp; dates từ payload không đổi. Deleted payload có thể chỉ retain identity/tombstone; candidate/base giữ trong version/conflict theo retention được duyệt, không mất khả năng review do drop payload sớm.

### Foreign keys và giới hạn cascade

- Composite FKs gồm user_id ngăn cross-user references giữa records/operations/devices/manifests.
- Không hard-FK meal_entry.foodId→food, session.planId→plan hoặc snapshot.exerciseId→exercise: lịch sử và orphan hợp lệ phải sống độc lập.
- Photo ownerType/ownerId là soft reference; không unique(ownerType,ownerId), không FK cascade. Valid imports có thể nhiều ảnh cùng owner hoặc owner không còn tồn tại.
- Candidate.sourceSessionId là soft reference để giữ deleted/legacy-unknown source; Complete bắt buộc exact reviewed source state, không fabricate baseline.
- Account deletion có orchestrated lifecycle; có thể FK cascade DB sau bước export/disable/asset cleanup được xác nhận. Không dùng delete auth user như một thao tác xóa ảnh atomic.
- Nested slot/set ownership/replacement là domain validator trong aggregate, không FK SQL theo current catalog.

## 4. Constraints/indexes

Proposed checks: allowed kind/action/phase, valid payloadSchema, revision/head ranges, dates và per-kind shape; payload sizes có rejection rõ, không truncate. JSONB equality/fingerprint dùng canonical semantic representation với array order retained; plain `JSON.stringify` property order không phải cloud integrity standard.

| Index/constraint | Use case |
| --- | --- |
|Records PK(user,kind,id)|CAS/find, tenant prefix |
|Partial unique(user,journal_local_date) WHERE kind=journal AND not deleted|Giữ một journal/date cả khi hai máy tạo IDs khác nhau |
|Records(user,kind,local_date,id) live|Date reads; dates denormalized được validate bằng payload |
|Records(user,kind,device_id) live|Remote drafts/candidates selection |
|Versions(user,commit_seq,ordinal)|Complete commit groups incremental pull |
|Versions(user,kind,id,commit_seq DESC)|Latest revision≤H cho keyset bootstrap |
|Operations(user,operation_id); unique applied user/seq|Idempotency, dependency lookup |
|Uploads(user,status,expires_at)|Staged orphan cleanup preview, not automatic delete |

Không thêm GIN index toàn bộ note/photo payload hoặc duplicate analytics tables trước workload thực. Order scope dùng deterministic position + identity tie-break; concurrent reorder cùng aggregate CAS. Global array positional field cho domain display không dùng làm workout exerciseIndex. Existing saved arrays phải roundtrip đúng; ambiguous array order không được silently normalize khi migration.

## 5. Transaction boundaries

**Local-only VERIFIED:** JSON một setItem; ảnh một IDB transaction; hai kho không có transaction chung.

**Future cloud PROPOSED:**

1. Local account DB: latest projection/validation + outbox + local epoch/revision trong một IDB transaction; photo bytes/intent cũng sameDB.
2. Server PostgreSQL: lock account head; verify receipt/dependency/base/semantic guards; allocate one commitSequence; upsert accepted records/tombstones, append versions, receipt. Rollback toàn operation nếu một change lỗi.
3. Pull apply: shadow/projection/outbox ack/conflicts/cursor cùng IDB transaction.
4. Photo assets: outside PG transaction; prepare→upload both→verify→finalize metadata transaction. Không rollback bytes tự động cùng JSON.

Head row lock must occur trước cấp sequence, serialize toàn commit của một user; không auto-increment sequence cấp trước transaction commit. Feed từng operation group, không page từng arbitrary row làm partial projection.

History correction checks **hai baselines**: candidate revision và completed source revision/exact baseline. Completing live checks phase/current source; pending set không thể tự append vào completed record nếu phase khác. Clear candidate/planning slots là part compound operation, không xóa trên ack của old epoch.

Edge validation ngoài SQL transaction phải gửi trusted read set (revisions/full guarded sources) để helper recheck dưới head lock; source thay đổi giữa validation/commit gây stale rejection. Không lấy frontend “valid” làm authorization hay commit candidate dựa trên source đã đổi.

## 6. Validation tiers

- Reuse current pure JS validators/readers cho legal schema8, structure graph, snapshots, dates, macros, drafts. Deno/Edge module compatibility phải test trước; chưa hứa drop-in.
- Cloud gateway validate domain command với accepted latest records. Không chỉ chạy whole backup validator: incomplete raw drafts, live phase, tombstones/metadata có semantics khác.
- DB enforce tenant/key/revision/journal date/phase/compound constraints và transaction invariants. Complex workout payload được trusted gateway validate; private DB entry point không cho client bỏ qua gateway.
- Baseline local load validators không đủ để upload mọi readable malformed legacy data. Migration preview strict-check; unsupported records giữ local/export và BLOCK upload có giải thích, không wipe hoặc regenerate IDs.
- Unknown/null/zero giữ khác nhau. Không nhập unknown macros bằng0; những domain food/entry hiện yêu cầu known macros vẫn áp contract đó.
- Built-in exercises/source plan không trở thành editable remote definitions. Custom plans và immutable session snapshots tách riêng.

## 7. RLS/privileges và trusted gateway

Đề xuất Edge gateway xác minh JWT bằng official supported auth path. Backend nhận UID từ verified context, không body. Sau đó gọi private PostgreSQL transaction functions qua **restricted DB login role chỉ EXECUTE**, secret chỉ server. Đây là D3 cần duyệt; credential/pooler/connection limits và deployment method chưa provision.

Functions trong private schema, fixed empty search_path và fully qualified identifiers; nếu cần SECURITY DEFINER thì owner là NOLOGIN/NOBYPASSRLS role có đúng table rights. Không đặt SECURITY DEFINER trong exposed API schema. RLS vẫn bật/force theo role phù hợp; trusted context transaction-local `tracker.user_id` được set bên trong private gateway từ verified UID. Queries luôn có explicit user filters. Client không thể EXECUTE helper hoặc tự đặt trusted UID qua HTTP. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

| Actor | Proposed access |
| --- | --- |
|Anonymous/publishable-only|Không rows, không sync function EXECUTE, không Storage read |
|Authenticated browser|Auth + sync Edge HTTP; không direct sync table DML/helperEXECUTE. Nếu sau này mở read API, SELECT chỉ auth.uid()=user_id và account active |
|Restricted backend function role|Private EXECUTE; table mutations thông qua scoped helper, không arbitrary admin SQL |
|Helper owner|Minimal sync table rights, no auth admin, no BYPASSRLS; server-context owner policies, explicit uid guard |
|Storage verifier/cleanup|Server-only capability theo user/upload path; nếu provider admin key cần thiết thì phạm vi rộng là residual risk, audit rõ; không coi admin client được RLS bảo vệ |
|Project administrator|Có đặc quyền vận hành; RLS không phải E2EE chống admin |

Không chọn shortcut `service_role` trong browser. Không allow direct writes rồi trông đợi client tự ghi versionfeed. Read-only prototype cũng xác minh tenant/snapshot; không dùng admin read không filter.

RLS/authorization gates tương lai: noJWT/expired/wrongissuer/wrongproject; A đọc/sửa/xóa/pull/receipt/upload B; spoof uid/device/path; disabled account; direct DML/EXECUTE denied; function search_path injection; same user limited reads; no cloud sensitive bodies trong logs. Test actual denied HTTP/SQL, không chỉ inspect policy text.

## 8. Retention, garbage collection và growth

Receipts giữ account lifetime trong initial design để old retry không lặp side effects; versions/tombstones chưa tự purge. DB growth ước tính trong architecture doc làm Free không an toàn lâu dài. Retention sản phẩm cần D7: maximum supported offline interval, snapshot pins, floor, export/conflict recovery, purge policy và budget.

Future pruning giữ latest baseline≤floor mỗi key + all versions>floor; tombstone key/rev vẫn cần để reject stale create. Device offline dưới floor phải full snapshot, pending candidates vẫn review. Không xóa receipts vì device “không thấy gần đây” mà chưa có recovery protocol.

Photo physical GC tách DB logical tombstone; only unreferenced staged/assets, không active published/version/conflict/import references trong retention window. Dry-run manifest + confirmed lifecycle gate; orphan owner không đủ điều kiện GC. Không implement cron ở9A.

## 9. Migration strategy và rollback

Fresh cloud schema future migrations là append-only reviewed SQL, riêng khỏi schema8 migration chain. Validate versions trước data import; local original giữ nguyên. Server migration backward-compatible protocol khi có thể; unsupported older clients pause writes, không tự rewrite history.

Cloud import ledger giữ source workspace/hash, targetUID, mapping identities và accepted operation receipts. Existing ID giữ nguyên; collision báo review. Account/device/candidate/cloud metadata identities mới chỉ tạo ở explicit migration, không sửa nested historical IDs. Migration preserve current array order, frozen snapshots, raw valid drafts, note keys, photos bytes/metadata.

Rollback future deploy disable sync networking/feature gate, retain account workspace/outbox/export, return local-only original. Không downgrade account DB hoặc copy selected account vào anonymous key. Partial import cleanup chỉ user-confirmed CAS các records inserted by that import và chưa ai sửa; không xóa record account khác/other device. Server tombstones/version receipt recovery vẫn giữ.

## 10. Acceptance before SQL implementation

Approve D2/D3/D4/D5/D7; test synthetic schema8 projection roundtrip từng domain/draft/order/legacy; SQL unit/integration for tenants/unique date/CAS/phase/transaction rollback/version order; retry/no skip/pagination; source-delete history invariants; restore detached workspace; quotas. Model chưa chứng minh vận hành;439tests là baseline local. **STOP9A.**
