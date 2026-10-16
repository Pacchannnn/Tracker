# Tracker — Phase 4A: Flexible Live Workout Contract

> Tài liệu kỹ thuật được giữ lại sau dọn dẹp16/10/2026. Các phần có ngày cũ là lịch sử; trạng thái mới xem [bàn giao](../03_TRANG_THAI_VA_BAN_GIAO.md). Báo cáo/research được dẫn nhưng không còn trong repo nằm trong archive riêng ngoài repository.

06/10/2026 · **CONTRACT APPROVED. 4B-1/2/3/4 IMPLEMENTED / TESTED. Phase4 IMPLEMENTED / TESTED; STOP before Phase5.**

### Implementation evidence — 4B-4 release (05–06/10/2026)

Approved contract semantics below are unchanged. Code61de602 adds reviewed close-old + fresh successor Replace to the canonical runtime and the same Shared Picker. Exact old identity/snapshot/logs stay; remaining uses only source slotId count. Insert-after/order/link/chain/cap100/source isolation and one atomic revision/write verified. Edited target says N hiệp mới; candidate notes/setup separate; unchanged raw prescriptions retained. Dirty Save invalidates Replace review rather than updating old budget/replaying; fresh manual review required. Link-based history shows old/new ownership and zero-log rows; history has no structural controls. Review reproduced/fixed decimal/whitespace timer parsing and untouched imported prescription validation.180→197/197 tests,47 JS syntax checks, browser A–I on synthetic8778, critical two actual tabs, exact chain backup restore and320/360/390 iframe checks. Photo DB/format1 and schema8 unchanged. All30 user4B-4 gates passed in documented scope; no template promotion or Phase5 code. See current report for precise evidence and NOT VERIFIED limits, including iframe harness observer error. Older boundary statements below are historical, not current feature status.

### Historical implementation evidence — 4B-3 boundary (05/10/2026)

Approved product semantics below are unchanged. Schema8 stays8; no new photo format. Code fe3f8b9 implements live Shared Picker Add/review/atomic batch/cap100, Remove tombstones and active-position Reorder. History/raw ambiguous/recovery controls remain restricted. Full captured structural baseline is rechecked at queue execution; latest full envelope is guarded inside Web Locks. Saved-set ownership/source snapshots remain unchanged. Dirty valid/invalid inputs require explicit Back/Save/Discard; Save does not auto replay structural intent. Review fixed queue replay, boundary focus, visible badInput and Save focus.167→180/180 tests,46 JS syntax checks, actual browser A–H/all-inactive/two-tab/backup and iframe320/360/390 verified on separate synthetic8776. See current report for precise evidence and NOT VERIFIED limits. **STOP before4B-4 Replace. Phase4 NOT DONE.** Older sections are historical evidence; contract requirements below remain intact.

### Historical implementation evidence — 4B-2 boundary (05/10/2026)

Approved semantics below remain unchanged. Schema8 stays8. Runtime Start UUID/frozen snapshots, atomic safe legacy activation, canonical slot writers/readers, revision + full reviewed envelope inside Web Locks, same-tab queue/epoch, exact historyEditBase reopen/Complete CAS and explicit recovery copies are implemented. Ambiguous raw ownership is preserved; malformed structured imports fail closed. Baseline136 →167 passing tests;43 JS syntax checks; browser A–G, real two-tab stale/CAS conflicts and320/360/390 widths. Review found and fixed dirty-form rerender loss and empty-duplicate Quick Fill selection. See current report for evidence and limits. **STOP before4B-3 Add/Remove/Reorder and4B-4 Replace.** Audit and older implementation sections below describe their historical checkpoint, not current runtime.

### Historical implementation evidence — 4B-1 boundary

Approved product semantics below remain unchanged. Current request explicitly limits activation:7→8 does **not** materialize/enrich live drafts or completed history. Constructors/materializers/validators/adapters are foundation APIs only; current Start and all live writers stay legacy until4B-2. New historyEditBase supports model/backup validation but is not added to runtime history edits yet. Imported structured/non-null baseline drafts are read-only; old writer handlers have generation compatibility guards. **BRIDGE ONLY — NOT4B-2 CUTOVER.** Migration/backup chain1–8,136tests, current Original/custom/one-off/reopen/Builder/picker browser regressions verified. Full evidence in V4_IMPLEMENTATION_REPORT.md; code09676c2. Sections using future wording are the approved design for remaining milestones, not a claim of implemented runtime actions.

Thiết kế cho app hiện có tại checkpoint `50cf6ec`, schema **7**, baseline **82/82 tests** đạt khi audit. File này đề xuất contract cho implementation sau; không phải mô tả tính năng đang chạy. Task này không sửa code/tests, không migrate, không ghi storage hoặc research lại 35 apps. Roadmap chính vẫn là `V4_ROADMAP.md`.

**Khuyến nghị:** Option B — schema **8 additive**, ownership bằng session slot ID, đóng slot cũ + tạo continuation slot khi Replace. Scope mặc định **CHỈ BUỔI HÔM NAY**. Chia implementation thành **4 milestones**, cần yêu cầu triển khai riêng sau khi duyệt.

## 1. Current architecture audit — FACT từ repository

| Thành phần | Hiện tại | Bằng chứng |
| --- | --- | --- |
| Persistence | Một JSON `vshape-tracker`, schema7; `draft` độc lập `planningDraft`; ảnh ở IDB riêng | `js/data.js:4`, `DATA_MODEL.md` |
| Original live session | `id/workout/date/week/sets/notes`; chưa có workoutSnapshot. Render bài từ PROGRAM, số hiệp/RIR tính theo session.week | `js/app.js:299` openWorkout; `js/app.js:326` workoutView; `js/program.js` |
| Custom/one-off session | Start clone workoutSnapshot gồm planId/planName/dayId/name và exercise slots. CUSTOM không tự giảm hiệp tuần1 | `js/app.js:279` startCustomWorkout; `js/custom-workout.js` snapshotWorkout/sessionExercises |
| Template slot | `id` riêng, `exerciseId`, name snapshot và prescription. Snapshot copy **cùng template slot ID**, không cấp occurrence ID mới lúc Start | `js/custom-workout.js` validateSlot/snapshotWorkout |
| Original slot | PROGRAM exercise không có slot ID hoặc exerciseId. Library có ID `original:day:index`, rồi dedupe **theo tên**; ID catalog và vị trí Original không luôn giống nhau | `js/custom-workout.js` BUILTIN_EXERCISES; `js/program.js` |
| Saved set | UUID `id`, exerciseIndex/name, setNumber/load/unit/reps/RIR; custom thêm exerciseId. Không có slotId, timestamp từng set, hoặc flag completed | `js/app.js:435` set form submit; `js/data.js` validateSet |
| Completed representation | Set có trong sets[] nghĩa là đã lưu/ghi; set chưa làm không có record. Set number là số hiệp trong mục, không phải set ID | `js/app.js:363` exerciseBlock; `js/workout.js` nextIncompleteExercise |
| Focus/ownership | Render nhóm set, kiểm tra duplicate, next incomplete dùng **exerciseIndex**; quick fill custom dùng exerciseId, Original dùng workout+index | `js/app.js:366`, `js/app.js:442`; `js/workout.js` |
| Completed session | Complete copy draft vào sessions[], thay session cùng ID hoặc append; chỉ cần >=1 saved set. History hiện liệt kê sets bằng name snapshot và array order | `js/app.js:483` completeWorkout; `js/app.js:497` historyView |
| Reopen history | Clone completed session thành draft cùng ID. Edit set CAS record; Complete hiện kiểm tra draft ID, chưa CAS baseline completed session khi ghi đè | `js/app.js:506`; `js/app.js:483` |
| Builder live distinction | Builder Phase3 Replace giữ slot ID/prescription, đổi exerciseId/name/notes; Remove bỏ mục khỏi builder draft. **Live session chưa có structural editing** | `js/exercise-picker.js`; `js/gym-builder-ui.js` renderDayEditor |
| Source safety | Custom history giữ snapshot dù plan đổi/xóa. Original history chỉ snapshot tên từng set, **không có full program snapshot** | `tests/custom-workout.test.js`; `DATA_MODEL.md` |
| Multi-tab | Web Lock serialize read-latest→clone→change→write. Không có global/live revision. Phase2 revision chỉ thuộc planningDraft envelope. Một số live actions chỉ kiểm tra draft ID | `js/data.js:125` updateData; `js/planning-draft.js` createDraftStore |
| Backup validation | CUSTOM set phải match snapshot.exercises[exerciseIndex].exerciseId/name và số hiệp. Original validation lỏng hơn: không kiểm tra index trong PROGRAM; chưa kiểm tra unique set IDs hoặc unique (index,setNumber) trong session | `js/data.js:178` validSession; `tests/model.test.js` |
| Progress/history | exerciseHistory lọc **name snapshot**; quick fill custom match exerciseId. Weekly count đếm session, không đếm slots. Original next workout theo key; custom theo frozen planId/dayId | `js/progress.js`; `js/workout.js`; `js/program.js` nextWorkout; `js/custom-workout.js` nextPlanDay |

Đã đọc V4 roadmap/report đầy đủ, feature backlog/product ideas/DATA_MODEL; README, V3 roadmap/report, baseline/history note docs; module workout/custom/session/progress/data/planningDraft/Shared Picker và tests liên quan. Mốc lịch sử schema6/55 hoặc schema7/74 trong docs không thay baseline hiện tại. Không suy diễn rằng app đã có volume, PR, e1RM hoặc auto progression: chưa thấy các phép tính đó trong code hiện tại.

## 2. Problems preventing safe live editing

1. Reorder theo array index sẽ chuyển set sang bài khác; slot IDs của custom snapshot hiện chưa giải quyết ownership.
2. Mutate same slot sau logs đổi definition/name nhưng old sets còn snapshot cũ: UI, index matching và strict CUSTOM backup dễ mâu thuẫn. Tuyệt đối không sửa old set names để làm validator pass.
3. Xóa slot khỏi snapshot làm mất index reference hoặc dịch index của mọi mục phía sau.
4. Original chưa có full session snapshot; không thể coi PROGRAM hiện tại là snapshot lịch sử chính xác từ lúc tập.
5. Lock chỉ ngăn writes chạy đồng thời; ID-only checks không phát hiện một tab reorder/replace rồi tab stale log vào index cũ. Set delete/discard/Complete cũng cần cùng guard.
6. Multiple occurrences cùng exerciseId hiện có thể có trong imported/custom templates; quick fill gộp bằng exerciseId và chọn setNumber đầu tiên có thể gây hiểu nhầm.
7. FocusIndex, timer, note keys, history reopen và backup validator phải được audit cùng ownership; không chỉ thêm nút vào workoutView.

## 3. Product semantics — PROPOSED

- Structural actions chỉ áp dụng **open, chưa complete workout**. Reopen một completed workout để sửa set/date/notes vẫn được; structural Add/Remove/Replace/Reorder không bật cho chế độ sửa lịch sử trong Phase4.
- Không sửa PROGRAM, Original Plan, custom plans/days hoặc activePlanId. Buổi modified từ Original vẫn giữ workout key A/B/C/D; custom giữ frozen planId/dayId; one-off vẫn planId=null.
- Saved set ownership là bất biến. Sửa load/reps/RIR hoặc xóa một set là hành động riêng, explicit; không phát sinh từ Remove/Replace/Reorder.
- Chưa đủ hiệp vẫn có thể Complete sau >=1 saved set như hiện tại. Badge “buổi đã lưu” không có nghĩa tập đủ prescription.
- Có unsaved set-form input: trước hành động gây rerender, cho **Quay lại / Lưu hiệp / Bỏ phần nhập chưa lưu**. Không tự log hiệp. Invalid input chỉ có quay lại hoặc explicit discard. Form chưa Save không phải completed set; chưa hứa form recovery qua reload.
- Review/pending picks là transient. Chỉ Confirm thành công mới là live change; không auto accept, increase load hoặc kiểm tra ACL bằng thuật toán.

## 4. Slot identity contract

**Tách ba thứ:** exerciseId = định nghĩa bài; sourceSlotId = mục trong day/template gốc; session slot `id` = một occurrence trong buổi. Set reference session occurrence, không reference display index.

Đề xuất thêm `sessionStructure` vào session/draft có identity mới:

| Field | Contract / use case |
| --- | --- |
| revision | Safe integer >=0, tăng cho mọi mutation của session: log/edit/delete set, date/notes, structural edit và Complete. Không dùng planningDraft.revision thay thế |
| basis | `started`, `legacy-snapshot`, hoặc `legacy-program`; cho biết provenance, không giả vờ legacy Original có start snapshot |
| slots[] | Registry append-only; giữ cả closed/removed slots. Array ordinal không đổi sau insert; không dùng làm ownership |
| order[] | Mỗi slot ID đúng một lần, gồm cả inactive slots để history có final display order; reorder chỉ thay list này |
| slots[].id | UUID mới khi Start/Add/Replace; unique **trong session**. Legacy materialization có ID deterministic `legacy-slot:<index>` trong phạm vi session |
| exerciseId | ID catalog nếu xác định được; null nếu legacy không biết. Không dùng same-name guess để gộp custom với built-in |
| sourceSlotId | Template slot ID cho initial custom/one-off; `original:A:0` dạng source occurrence cho Original initial; null cho live-added/replacement. Không phải catalog ID dedup |
| replacesSlotId | null, hoặc previous session slot ID; một previous slot chỉ có một successor, không cycle |
| status | `active`, `removed`, `replaced`. Active không đồng nghĩa còn hiệp thiếu; trạng thái đủ hiệp được derive |
| snapshot | `{name, sets, reps, rest, rir, notes, setupNote}`; numeric target sets + **nguyên văn display strings** cho reps/rest/RIR, source technique note và personal setup note lúc snapshot |

Snapshot giữ `6–10 mỗi bên`, `60–90 giây`, unknown RIR và notes gốc; không round-trip Original qua validateSlot để làm mất ranges/units. Custom strings derive từ thông số đã validate lúc Start. Snapshot contents của một slot không đổi trong structural actions; chỉ status và order thay đổi. Prescription mới được duyệt trước tạo slot; không thêm màn hình sửa mọi prescription đang có logs trong phase này.

New initial session occurrence UUID khác sourceSlotId; IDs có thể trùng **giữa các sessions** nếu legacy scoped ID, nên FK là (sessionId,slotId). Hai occurrences cùng exerciseId vẫn là hai slots; không gộp bởi name hoặc exerciseId.

workoutSnapshot custom giữ nguyên như **baseline lúc Start**, không append/reorder vào đó. SessionStructure là current/performed structure. Legacy fields retained; consumer phải chọn canonical structure nếu có, không fallback index từng set trong structure session.

## 5. Set identity contract

- Giữ UUID set.id hiện tại; không cần một loại ID mới. Unique ID trong session, unique (slotId,setNumber); edit giữ ID và ownership.
- Thêm **slotId** vào mỗi saved set của structure session. New set giữ exerciseName snapshot, exerciseId theo slot nếu biết, setNumber/load/unit/reps/RIR như hiện tại.
- Legacy set chỉ được thêm slotId khi mapping chắc chắn; không đổi id/name/exerciseId/index/setNumber/values/unit hoặc array order để “sửa” lịch sử.
- exerciseIndex giữ để compatibility: ở new records là immutable registry ordinal trong slots[], không phải order position. Không dùng field này để render/focus/match khi sessionStructure có mặt. Reorder không rewrite exerciseIndex.
- slotId quyết định ownership; exerciseId phục vụ matching qua các buổi. Snapshot name là label lịch sử, không lấy tên từ Library hiện tại.
- New logging chỉ vào active slot, setNumber chưa dùng trong 1..target sets. Existing legacy sets vượt target (Original validator cũ từng cho phép) phải được giữ và sửa bằng set.id; state validator không xóa hoặc giảm chúng để ép <=target. New writers không tạo overruns.
- sets[] giữ thứ tự **record đã lưu**, append khi Save, edit tại chỗ. Không có timestamp thực hiện từng hiệp trong V7; không bịa loggedAt/timeline timestamp cho dữ liệu cũ. Reorder không sort lại sets[].

## 6. Add semantics — scenario A

1. Mở Shared Picker, multiple pending selection; existing **active** exercise IDs blocked. Không giới hạn catalog theo template.
2. Review từng bài và prescription. Defaults đúng cấu hình Builder hiện tại:2sets,8–12,RIR2,90s; nhãn “mặc định có thể chỉnh”, không phải prescription từ MASTER_PLAN. Cho chỉnh các giá trị này trước Confirm với validation hiện có, không tự gợi ý tạ.
3. Confirm cấp UUID mỗi slot, snapshot accepted definition/name/notes và setupNote; sourceSlotId/replacesSlotId=null, status=active. Append slots[] và cuối order[] theo selection order. Mọi bài trong batch vào **một write**; có một candidate stale/archived/invalid thì reject toàn batch.
4. Chưa có saved set mới. Logs chỉ phát sinh khi user Save hiệp. History sau Complete thấy added slot kể cả chưa làm hiệp.
5. Proposed technical cap100 registry slots, tính cả tombstones; cap chặn Add/Replace mới, không cắt legacy session lớn hơn. Cảnh báo là giới hạn app, không giới hạn tập an toàn.

## 7. Remove semantics — scenarios B và C

| Tình huống | Confirm wording / kết quả |
| --- | --- |
| 0 saved sets | Confirm ngắn “Bỏ bài khỏi buổi hôm nay?”; status=removed. Giữ snapshot/ID trong registry, không xóa definition hay unrelated data |
| >=1 saved sets | Preview số hiệp và bài; “Giữ N hiệp đã ghi, bỏ phần chưa tập”; status=removed, set records nguyên vẹn |

Remove không giảm snapshot target sets để giả vờ hoàn thành đầy đủ, không mark các hiệp thiếu là done, không cascade delete. Removed row thu gọn nhưng vẫn đọc được trong buổi và history; user thấy “Dừng bài · đã ghi2/3hiệp”. Focus/completion bỏ qua inactive rows. Khi không còn active bài, hiển thị empty state có Add hoặc Complete nếu đã có set; không gọi exerciseBlock(undefined).

Không có Undo tổng quát ở milestones đầu. Cancel trước Confirm và tombstone history là protection; cần tập lại bài đã Remove thì **Add occurrence mới** với review. Xóa set/buổi vẫn là chức năng riêng với confirmation, không biến Remove thành thao tác xóa logs.

## 8. Replace semantics — scenarios D và E

### So sánh phương án

| Phương án | Đánh đổi | Quyết định |
| --- | --- | --- |
| 1. Mutate same slot | Ít fields nhưng slot ownership đổi nghĩa; snapshot/sets/quick fill dễ sai sau logs | Không chọn cho live, kể cả 0logs để chỉ có một rule |
| 2. Create replacement slot, xóa old slot | Có identity mới nhưng mất mục đã lên kế hoạch hoặc orphan logs | Không chọn nếu physical removal |
| 3. **Close old + continuation slot** | Giữ ownership, cần status/link và registry nhưng không cần event engine | **Chọn cho cả0 và>=1logs** |
| 4. Replacement chain/event sourcing | Replay/undo mạnh nhưng schema/actions/rollback phức tạp; không cần full chronology hiện tại | Không chọn; một previous link đủ |
| 5. Chỉ Replace0logs, còn lại hướng Add | An toàn nhưng workflow khi máy bận không trực tiếp và user phải tự dừng bài | Fallback giải thích được, không là trải nghiệm chính |

### Rule được chọn

- Source phải active và còn target sets chưa ghi. `remaining = max(0, source.snapshot.sets - số saved sets thuộc source.slotId)` tại baseline review.
- 0logs: old status=replaced, new slot nhận toàn target sets. Old snapshot giữ như skipped baseline, không mutate same ID.
- Partial logs: old status=replaced, new slot nhận **remaining** sets. Giữ rep range/RIR/rest gốc cho user duyệt; không tự nhân đôi tổng hiệp. User có thể chỉnh số hiệp của successor **trong review**, nhãn rõ nếu khác remaining.
- All targets logged hoặc overrun: **không continuation tự động**. Disable Replace, giải thích “Đã ghi đủ hiệp; dùng Thêm bài nếu muốn tập thêm”, Add vẫn manual. Không phát sinh target0 hoặc extra work tự động.
- New UUID, exerciseId/name của bài mới, sourceSlotId=null, replacesSlotId=old.id. Append registry, insert new ID **ngay sau old ID** trong order. Link previous giữ dù reorder.
- New technique/setup notes lấy definition/reference của bài mới, không copy old machine/grip/setup. Review old→new notes; old snapshot giữ nguyên. Load/reps thực tế/RIR thực tế của old sets không copy sang new form.
- Một write đóng old và thêm new. Pending review không thay status. Candidate current/existing active ID blocked; closed occurrences không bị gộp. Stale session/candidate phải review lại trước Confirm.

### Ví dụ minh họa từ tình huống user, không phải dữ liệu cá nhân

| Snapshot slot | Status sau Replace | Saved sets thuộc slot | Phần sẽ tập |
| --- | --- | --- | --- |
| s-pull · Lat Pulldown · target3 | replaced | set-1:50×10;set-2:50×9, slotId=s-pull | Dừng phần còn lại |
| s-row · Cable Row · target1, replacesSlotId=s-pull | active | Chưa có | Hiệp1 của Cable Row |

Khi Save row-set: slotId=s-row, exerciseName=Row, setNumber1. Hai set Pulldown không đổi thành Row hoặc đổi set number. UI: “Pulldown ·2hiệp đã ghi → đổi sang Cable Row ·1hiệp còn lại”. Nếu user duyệt Row3hiệp thì hiển thị đó là **3hiệp mới**, không gọi là còn lại1.

## 9. Reorder semantics — scenario F

- Nút lên/xuống mobile và keyboard, không yêu cầu drag/drop. Dùng slotId và anchor slotId, không index từ DOM.
- Move active slot một vị trí qua active neighbor trong order[], các inactive IDs vẫn có mặt. Rule rõ: swap hai active positions trong order[], giữ các inactive entries tại positions còn lại. Nếu chỉ một active slot thì disable cả hai.
- Chỉ thứ tự hiển thị/next-active thay đổi. slots registry ordinal, set.id/slotId/index/name/setNumber và sets[] record order không đổi.
- Replacement link không đồng nghĩa bắt buộc adjacency sau user reorder; UI vẫn ghi “Thay cho …” bằng link.
- Focus giữ current slotId nếu vẫn active; sau Remove/Replace chọn successor hoặc next active còn thiếu. Timer đang chạy giữ label bài đã khởi tạo, không tự đổi sang bài ở index mới; hết/Skip theo controls hiện tại. Timer/focus mode vẫn transient như app hiện tại, không hứa phục hồi timer qua reload.

## 10. Snapshot / history / progression contract

New completed record giữ baseline workoutSnapshot (custom), sessionStructure final, cùng toàn bộ sets. Original giữ key/week và frozen structure snapshot; không cần rewrite PROGRAM hoặc biến thành CUSTOM để có snapshot.

History có hai góc nhìn nhỏ: exercise cards theo final order (incl. added/removed/replaced rows,0log row có nhãn “chưa ghi hiệp”) và saved sets theo record order nếu user mở chi tiết. Không mô tả record order là thời gian thực hiện chính xác. Initial rows phân biệt bằng sourceSlotId; added bằng sourceSlotId=null/replacesSlotId=null; replacements bằng previous link. Không lưu event log/timestamps cấu trúc riêng.

**Không phụ thuộc current Library/template để đọc history.** Deleted/renamed definition chỉ ảnh hưởng choices tương lai. Legacy completed records không có structure vẫn đọc name snapshots như hiện tại; không invent mục bị bỏ/thứ tự planned hoặc full historical prescription.

Progress contract:

- Completed saved sets của closed/removed slots vẫn được tính/hiển thị theo **bài cũ**. New slot chưa log không tạo volume, PR,0-performance hoặc progression record.
- Giữ exerciseHistory name-based view tương thích trong Phase4; slotId chỉ giải quyết ownership, không âm thầm gộp đổi tên/variants. ID-based history/PR chart là backlog khác.
- Quick fill structure sessions match exact exerciseId; legacy Original fallback chỉ exact source occurrence + name. Không fallback display index sau reorder, không coi Pulldown là Row vì cùng slot position.
- Latest-session lookup giữ date/updatedAt ordering. Nếu một exercise có nhiều occurrences trong latest matching session: hiển thị từng occurrence có slot label và để user chọn, không tự lấy find(setNumber) giữa nhiều slots; Quick Fill tắt tới khi chọn occurrence. Legacy group bằng index+name; ambiguous group chỉ xem list, không quick fill. Một occurrence thì dùng behavior hiện tại. Không auto-copy load giữa các bài thay thế.
- weeklySummary vẫn đếm completed session một lần. Original nextWorkout và custom nextPlanDay giữ frozen source key/planId/dayId. Buổi modified có >=1 set được Complete vẫn advance source sequence theo rule hiện tại; chỉ one-off không advance. Xóa source plan không làm mất history, active-plan fallback vẫn hiện có.
- Chưa implement volume. Nếu tính sau: count mỗi set.id đúng một lần theo actual exercise owner, giữ unit/load convention; không sum kg+lb hoặc máy/tạ tay như tương đương, không auto prescribe progression từ knee logs.

## 11. Template safety

Mọi live structural write chỉ đổi `draft`, không đổi plans, customExercises, activePlanId, PROGRAM hoặc planningDraft. Start từ Builder vẫn dùng Phase2 commit atomically và clear đúng planning slot; không save live changes trở lại Builder.

**SAVE CHANGES TO TEMPLATE / completed workout→template** thuộc milestone riêng sau core Phase4, chưa nằm trong4 milestones được đề xuất ở đây. Sau này cần preview target vs performed, chọn custom/new copy, source CAS, confirmation; Original luôn chỉ tạo bản sao. Không lấy highest load/actual reps làm prescription tự động. Nếu source deleted/stale, không recreate/overwrite âm thầm.

Global exerciseNotes hiện là reference dùng lại. Structural Replace/Add chỉ đọc và capture setupNote; không mutate map. History dùng snapshot capture, không notes mới từ map. UI sửa ghi chú dùng lại phải ghi rõ scope cho buổi sau; badge “chỉ hôm nay” chỉ gắn với structural controls, không làm global note editor bị hiểu nhầm là session-only.

## 12. Persistence / atomicity / crash-reload

Reuse `updateData`, cùng key và Web Lock `vshape-tracker-write`; không key riêng cho live structure. Proposed session write queue serialize local commands; synchronous change callback không await bên trong lock.

Boundary cho mọi action: đọc latest dưới lock → compare expected **draft ID + revision + full session baseline** → validate selected definitions nếu Add/Replace → áp dụng một candidate clone → validate structure/set ownership → tăng revision → một setItem toàn JSON → chỉ sau success publish Saved và render state mới.

Full baseline comparison bổ sung revision để phát hiện stale restored state/old writer không bump revision. Unrelated nutrition/settings/journal writes được giữ do read latest; không CAS cả top-level state cho live changes. Các thao tác date/notes/log/edit/delete/discard/start-switch/Complete cũng phải dùng guard này; chỉ sửa structural handlers là chưa đủ.

- Replace đóng old/add successor atomically; Add batch all-or-nothing; reorder/Remove một write. Validation/quota/unsupported lock không đổi persisted state, không báo Saved.
- UI pending proposal/form giữ trong memory khi thất bại; persisted draft cũ vẫn recover. Retry chỉ khi baseline còn đúng; stale thì giữ phần nhập để copy và yêu cầu reload/review lại, không blind overwrite.
- Confirm button disabled khi saving; freeze review selection trong operation. Không đổi intent bằng cách filter/toggle sau khi command đã enqueue.
- Crash trước write: last saved structure/logs. Crash sau write trước UI acknowledgement: reload ra **toàn candidate**. LocalStorage boundary không đảm bảo tuyệt đối power-loss/disk durability; cần native-browser tests, backup và không claim giao dịch giữa localStorage/IDB.
- Complete writes final session + clear draft trong một lock; updatedAt sau successful candidate. No half-complete. Stale/malformed structure bị chặn ghi, giữ raw disk và export/recovery thông báo; không reset history.

## 13. Multi-tab behavior

| Race | Contract |
| --- | --- |
| A Save set / B Replace | First write thắng; second stale revision/full-baseline reject. B không đóng slot từ review thiếu set mới; A không log vào old slot đã closed |
| A Reorder / B Save set | Không auto merge dù slot ID có thể map đúng; second tab reload/review. Không log theo old index |
| A Remove / B edit/delete set | Second stale reject; explicit edit sau refresh vẫn được sửa/delete saved set của inactive slot, không reopen slot |
| A Complete / B structural edit/log | draft null/mismatch reject; không resurrect draft hoặc append old-session set vào buổi mới |
| A discard/start khác / B Save | Session ID/full-baseline mismatch reject; không xóa hoặc ghi vào draft mới |
| A food log / B Reorder | Independent domain preserved; live guard chỉ compare target session |
| Archive/edit candidate khi picker mở | Confirmation recheck active status và definition đúng accepted preview. Changed definition phải review lại; Library snapshot cũ của existing slot vẫn readable |

Storage event có thể chỉ báo “Buổi đã đổi ở tab khác”; không tự thay UI đang nhập và không auto replay pending commands. Refresh lấy baseline mới, manual reapply; không cần auto merge.

**Reopened completed-session safety:** proposed draft-only `historyEditBase` giữ original completed session baseline để Complete CAS sessions[id], không chỉ CAS draft. Null khi new live workout; là cloned completed record khi reopen. Không copy field này vào completed record. Reload giữ baseline này. Nếu source history changed/deleted, reject overwrite; cho giữ bản nhập/export hoặc explicit lưu bản sao sau review rằng đây là một session riêng và sẽ được tính vào history/weekly counts. Copy recovery cấp mới session/slot/set IDs, remap order/previous links/set.slotId, giữ snapshot/values và source provenance/date theo review, không activate plan hoặc recreate source silently. Copy là recovery action của milestone2, không template feature hoặc auto merge.

## 14. Migration decision — OPTION B

**Recommendation:** schema8 additive, không schema7 masquerade và không rewrite lớn. Runtime hiện tại vẫn7; migration dưới đây chỉ là thiết kế.

Fields mới chính xác:

1. `sessionStructure` với revision/basis/slots/order và các slot/snapshot fields tại §4, ở new/materialized draft/sessions.
2. `sets[].slotId` ở record có structure; existing set ID và legacy fields retained.
3. `draft.historyEditBase`: null / baseline completed record; migration của legacy history-edit draft chưa biết baseline dùng `{kind:'legacy-unknown'}` marker, chỉ cho review recovery trước overwrite. Baseline record không chứa historyEditBase, tránh recursive payload.

Không fields mới trong plans/catalog/settings/planningDraft/photos. Completed legacy sessions có thể **không có sessionStructure** và không có slotId; reader phải hỗ trợ rõ hai generations.

### 7→8 migration/materialization

- Chạy V1→7 migration hiện có trước, validate baseline. Nâng schemaVersion trong cloned in-memory state; **không setItem chỉ vì load**, không allocate random IDs mỗi lần load.
- **Completed sessions giữ nguyên mọi record/field/array order**. Không batch enrich lịch sử cũ, không fabricate original full snapshot. Khi reopen để edit, materialize draft từ saved baseline dưới guarded write; original record chưa đổi tới explicit Complete.
- Legacy custom draft: ordered workoutSnapshot.exercises đủ definition/prescription. Map index→deterministic legacy slot, sourceSlotId=old snapshot.id, basis=legacy-snapshot; derive exact display strings như renderer cũ; thêm slotId cho sets. Không rewrite workoutSnapshot.
- Legacy Original draft: reconstruct accepted PROGRAM+week hiện tại qua rules hiện có, basis=legacy-program; catalog ID chỉ exact built-in match của vị trí/tên, **không dùng literal original:B:4 nếu catalog đã dedupe sang A:3**. Giữ rest/reps nguyên văn. Capture existing notes map tại upgrade và nói rõ không biết setup lúc Start cũ. Chỉ bind khi set index/name nhất quán với owner; không rename saved set để ép match. UI ghi “Buổi cũ: snapshot khởi tạo khi nâng phiên bản”.
- Bất kỳ mapping ambiguous/out-of-range/name conflict hoặc duplicated set IDs/(index,setNumber) mà V7 từng chấp nhận: preserve raw legacy data, không guess/drop records, không chặn toàn bộ nutrition/journal. Session đó giữ legacy mode với export và explicit recovery warning; structural edits không bật. Existing individual set/date/notes corrections nếu thực hiện được an toàn vẫn dùng set-ID/full-baseline guards; identity repair cần scope riêng, không auto map sang exercise khác.
- Legacy draft cùng ID một completed session có thể đã được chỉnh trước upgrade, không có original history baseline. Đặt historyEditBase legacy-unknown; giữ candidate. Không cho candidate này overwrite source. Recovery: giữ/export hoặc lưu bản sao có review; nếu muốn sửa original thì xác nhận mở lại source mới nhất thành fresh editing draft rồi tự áp dụng chỉnh sửa. Không tự capture fresh source rồi giả vờ nó là baseline lúc đã mở lịch sử.
- New starts dùng UUID và basis=started, freeze snapshots dưới lock. No live original week recalculation sau khi identity đã materialized. Existing source keys/plan refs vẫn frozen.
- Idempotence: migration/load2lần produce cùng IDs/values, disk chưa đổi. First successful user write persist8. Failed migration/materialization giữ original disk/backup, không ghi state một phần.

## 15. Backup / restore implications

- Data wrapper/data đều8; chấp nhận raw/wrapped1–7 rồi migrate. Wrapper mismatch/future unsupported fail như hiện tại. Format envelope không cần version khác ngoài schemaVersion.
- Structure validation phải được dùng ở cả load/write và strict backup; không chỉ validatePlanningData. Validate revision/basis/status/types, unique registry IDs, complete order permutation, no dangling set ownership, same owner name/known ID, unique set IDs/(slotId,setNumber), replacement link earlier registry entry/no cycle/one successor and predecessor status=replaced. Source refs không bắt buộc tồn tại trong current Library/plan.
- Legacy absent structure dùng legacy validation; không half-mix sets thiếu slotId với structure. Valid older records vượt target giữ theo §5. Malformed structure8 fail closed cho session writes/export, không silently fallback index và làm mất new ownership.
- Export/import giữ removed/replaced0log rows, previous links/order/revision, old field snapshots, historyEditBase của open editing draft. Import review counts vẫn đếm saved sets, không coi removed row là deleted set.
- Restore preview/full top-level baseline CAS vẫn hiện có. Sau restore clear pending operation queues/epoch, require old tabs reload; full session baseline giúp reject stale commands ngay cả revision reused.
- IDB version1 và photo backup format1 **không đổi**; không photo writes trong live edit. Paired backup vẫn2files, không claim cross-store atomicity.
- Không hỗ trợ downgrade8→7 tự động. Trước migration cần verified private backup7; rollback là restore backup bằng đúng reader hoặc dùng schema8 reader, với xác nhận vì newer workout data sẽ mất nếu thay bằng backup cũ. Old cached V7 app phải fail unsupported schema, không write downcast; tất cả tab phải refresh.

## 16. UX proposal — paper identity, mobile-first

Header gần structural controls: **“Chỉ thay đổi buổi hôm nay · kế hoạch gốc giữ nguyên”** + Saving/Saved/Chưa lưu. Không major redesign hoặc nav mới.

- **Add:** nút “Thêm bài”, Shared Picker inline, filters/pending count theo Phase3, per-item prescription review, Confirm/Hủy. Batch confirmation rõ số bài.
- **Remove:** button trong exercise card, preview số hiệp đã ghi và phần bị dừng; **“Giữ hiệp đã ghi & dừng bài”** khi có logs. Inactive row thu gọn nhưng hiển thị name/count/status, không biến mất như chưa từng có.
- **Replace:** **“Đổi phần còn lại”**; cùng Shared Picker và alternatives, thêm source completed count/remaining target/budget/notes preview. Sau Confirm old row giữ logs, new card riêng mở form blank. Đủ hiệp thì button disabled + hướng Add.
- **Reorder:** nút lên/xuống có accessible name gồm tên bài; boundaries disabled; focus gắn slot ID. Không swipe/drag bắt buộc.
- **Conflict/failure:** error cạnh action, không toast “Saved” sai. Pending input được giữ tới explicit cancel/reload; warning rõ về unsaved form và last persisted state.
- **Finish/history:** grouped final snapshot để thấy changed rows, saved set details theo record order; không bắt user hiểu registry/schema/revision. “Thay cho Pulldown” là label đủ, không hiển thị implementation IDs.

### Reuse Shared Picker — khác Builder

Giữ một component search/filter/selection/results/alternatives. Proposed context-specific preview/blocked-ID/confirm callbacks, không clone picker hoặc đổi rule Builder Phase3. Text “đưa vào bản nháp buổi” phải adapt thành live scope; live preview dùng snapshot reps/rest raw, không giả original có repMin/restSeconds.

Builder adapter tiếp tục replace same slot, full sets, source explicit Save và duplicate-any-day rule. Live adapter **không gọi replacePickedExercise** (mutates same slot semantics); áp dụng close/create successor và remaining budget. Active catalog candidates revalidated khi commit; absent current definition thì so sánh metadata hiện có thiếu thông tin phải ghi unknown, không suy anatomy từ tên snapshot. Add/Replace identity mutation không nằm trong UI component.

## 17. Edge cases — quyết định cụ thể

| Case | Proposed behavior |
| --- | --- |
| Exercise archived/deleted giữa session | Existing snapshot/set vẫn log/edit được theo prescription frozen. Candidate Add/Replace phải active. Update archive dependency check để nhận references trong sessionStructure, không chỉ baseline workoutSnapshot |
| Custom rename/edit | Old name/setup snapshot giữ; preview changed candidate stale phải review lại. Không auto relabel history |
| Same exercise xuất hiện2lần | Existing legacy/template occurrences giữ riêng, không dedupe. New live Add/Replace block ID đã active ở slot khác. Closed same ID có thể Add lại như occurrence mới; quick fill multi-occurrence cần chọn rõ |
| Replace A→B→C | A/B retained, each successor own UUID/previous link; tính remaining trên B thôi, không copy A logs sang C hoặc reset budget. Chain đã có snapshots, không event replay |
| Remove replacement B | B removed; A vẫn replaced và logs của A/B giữ. Không tự reopen A; chain link vẫn đọc được |
| Undo | Cancel trước Confirm. Không generic undo implementation trong4milestones; tombstones không bị physical delete |
| All sets complete rồi Replace | Disable continuation; explicit Add để tập thêm. Không tăng load hoặc số hiệp tự động |
| Delete một logged set của old closed slot | Separate confirm, CAS; status giữ closed, successor target không tự tăng. Ownership của records còn lại không đổi |
| Exercise notes | Old technique/setup snapshot giữ; new definition/setup notes preview riêng; không copy machine của old sang new |
| All exercises removed | Show Add/Complete state; Complete cần1set như cũ.0log draft được giữ, chỉ explicit Discard xóa |
| Missing/stale source template | Buổi vẫn tập từ snapshot; source refs chỉ provenance. Không làm live write phụ thuộc source plan còn tồn tại |
| Failed storage / stale tab | Last persisted state nguyên vẹn; pending proposal chưa Saved, no retry overwrite auto |
| Reload | Whole last successful structure/sets recovered; transient picker/form/focus/timer không được hứa sống qua reload |
| Complete sau edits | One session+clear draft atomic; source sequence unchanged rule, no plan/template mutation |
| History reopening / race | No structural controls trong history edit; historyEditBase CAS chặn overwrite deleted/changed completed record |
| Legacy ambiguous / missing identity | Retain readable old snapshots, warn/disable structural controls cho record đó, không wipe cảstore |
| Rest range / unilateral / unknown RIR | Keep exact snapshot text; timer minimum theo helper hiện có; không fabricate numeric prescription |
| Large legacy sessions | Không cắt hoặc xóa để đạt technical cap; cap chỉ chặn extensions mới, reader hỗ trợ old size |

## 18. Required automated tests — PLANNED, chưa viết/chạy Phase4 tests

| Nhóm | Assertions bắt buộc |
| --- | --- |
| Identity | Fresh source/session IDs tách biệt; legacy deterministic; registry/order bijection; set ownership stable; multi-occurrences không conflated |
| Add | Batch order/default review/custom; no logs until Save; duplicate active/archive/deleted/stale definition reject all;0log snapshot history visible; cap không truncate |
| Remove0/partial | Tombstone/no cascade; all old set fields equal; unrelated rows unchanged; focus/all-inactive safe; cancel no write |
| Replace0/partial | New UUID, frozen old snapshot/logs, remaining budget, editable reviewed successor target, order insertion and notes; no old load copy; no half-close on failure |
| Replace chains | A→B→C, remove successor, Add previous exercise after closure, all-targets-complete disabled; closed logs vẫn owned |
| Reorder | After logs, order only changes; set indices/IDs/array order unchanged; next incomplete active-only; focus byslotID; timer label stable |
| Sets | Unique set.id/(slotId,setNumber); edit values preserves ownership; inactive slot no new log; delete guarded; above-target legacy data retained |
| Consumers | Previous lookup notdisplay-index; duplicates require occurrence choice; name-based progress unchanged; closed sets visible once; no row0-performance; source next-sequence/one-off preserved |
| Snapshots/templates | PROGRAM/plans/catalog/activePlanId/planningDraft deep-equal after live edits/Complete; source rename/delete does not rewrite actual session |
| Multi-tab | Both lock orders for A log/Breplace and Areorder/Blog; second rejects, no lostsets; same-tab queue; clear/discard/start/Complete reject stale; unrelated domain survives |
| History edits | Reopen baseline persists acrossreload; concurrent source edit/delete rejects Complete; legacy-unknown recovery; no source resurrection |
| Migration | Versions1–7 raw/wrapped, snapshot vs Original draft, dedup Original catalog IDs,0logs/partial/over-target; every old field equal except explicit additive additions; completed histories unchanged;2loads idempotent, disk untouched |
| Corruption | Dangling FK/cycles/missing order/half slotId/duplicateIDs fail; legacy ambiguous preserved; no silent fallback/reset; revision overflow rejected |
| Backup/rollback | Full structure/historyEditBase roundtrip, removed/replaced rows/IDs/counts preserved; invalid/stale/quota restore retains disk; photo owners/bytes and all unrelated domains unchanged |
| Failure | Quota/validation/unsupportedlocks/stale source preview reject before Saved; crash-boundary fixtures produce old or full new state, never half mutation |

Giữ82tests hiện có, cập nhật expectations schema có chủ đích; không xóa behavioral assertions để migrate pass. No requirement dựng volume/PR analytics chỉ để test ownership.

## 19. Required browser tests — PLANNED

Chỉ synthetic origins; không ghi storage của user. Export before/after để assert snapshots/sets/source dữ liệu, không chỉ dựa count nhìn thấy.

1. Start Original tuần1/3 và custom/one-off; verify exact prescription, separate slot ownership, freeze week; reload.
2. Log2 Pulldown sets → Replace Row remaining1 → Save Row set → reload → Complete/history: old2 names/values/IDs giữ, new1 ownslot. Export/restore fresh origin rồi compare.
3. Replace0logs; Cancel/Escape no structural write; filter hides selected candidate still pending; already-active blocked.
4. Remove0logs/partial, accept preview; logs retained; all-inactive empty state; Complete>=1set; no unrelated data loss.
5. Reorder after logs, same-index old-tab case, focus/timer label and subsequent set ownership đúng; chainA→B→C; remove successor.
6. Existing custom duplicate occurrences/closed same exercise Add; previous quick fill chooseoccurrence notmixed.
7. Two actual tabs: both directions log-vs-replace/reorder-vs-log; conflict preserves disk, pending form copyable; Complete/discard/source history concurrent races.
8. Native persistence fault injection on test harness: failure no Saved; retry/cancel; reload validates last saved version. Distinguish simulation vs nativequota.
9. Deleted/archived/custom-name-changed candidate vs existing snapshot; source plan deleted while session open remains usable, no template write.
10. Legacy7 migration/reopen/historyEditBase unknown; source history changed/deleted before Complete; safe recovery copy/read warning, no automatic overwrite.
11. Keyboard Add/Replace/Remove/reorder, Tab/Enter/Space/Escape, focus return; labels/error messages/status; fresh-tab runtime logs.

## 20. Mobile tests — PLANNED

320/360/390px: execute Add/filter/multi-select/review/Confirm, Remove partial preview, Replace partial ownership/new form, reorder after log, closed rows/history and error/conflict. Measure document clientWidth/scrollWidth, button>=44px, filter/name wrapping, selected count, no action hidden behind bottom nav, focus target and scroll to successor. Include Vietnamese long/unbroken names, rest ranges and larger font.

Iframe responsive checks phải ghi rõ là iframe, không physical phone. Native Chrome/Edge touch keyboard/manual reload và screen-reader smoke check là separate verification; không claim nếu chưa chạy. Các controls giữ paper styling hiện tại; không thêm chart/navigation library.

## 21. Risks / limits / approval boundary

**Risk lớn nhất:** bỏ sót một index-based consumer hoặc old live writer: UI reorder đúng nhưng saved set/backup/history/quick fill sai owner. Identity must land trước structural controls; enumerate mọi read/write path và test race cả hai chiều.

Các rủi ro còn lại: legacy Original thiếu exact start snapshot; ambiguous old backups được validator cũ chấp nhận; duplicate-occurrence quick fill; completion overwrite history; schema8 app/cached7 mismatch; increased JSON size bởi tombstones/temp history baseline; quota; honest remaining-set UX. Không chọn full event engine để xử lý những rủi ro này.

Contract recommendations chưa được user duyệt và chưa có migration/UI tests cho Phase4. Native crash/power-loss durability, physical phones/cross-browser/screen-reader vẫn NOT VERIFIED. Source audit và82baseline tests chỉ chứng minh app hiện tại. Dừng task tại doc này; không bắt đầu implementation từ việc tạo file.

## 22. Proposed implementation milestones — chưa triển khai

| Mốc | Scope / dependency | Gate trước khi đi tiếp |
| --- | --- | --- |
| 4B-1 Identity + additive8 | Sau duyệt contract: validators/materialization/legacy adapters/snapshot/readers/backup, no live edit controls; preserve Phase2/3 | Migration idempotent; old completed records preserved; full backup/restore; old-new readers and82regressions plus identity tests |
| 4B-2 Set/session write guards | Depends4B-1: slot-based log/edit/delete/focus/previous/history, queue/CAS allwriters/historyEditBase/Complete; no structural controls | Both raceorders, history baseline reload/restore, same-tabqueue and storage failures; normal Original/custom logging/browser works |
| 4B-3 Live Add/Remove/Reorder | Depends4B-2: reuse Shared Picker with scope/preview callbacks, tombstones/order, unsaved-form gate | Saved sets/source invariants, all-inactive UX, reload/backup,320/360/390, accessible controls |
| 4B-4 Live Replace + release review | Depends4B-3: close/continuation/budget/notes, chains/all-complete handling; fullintegration review | Partial-log example export/restore identicalownership; two real tabs; migration/safety/mobile/a11y gates and accurate verification report |

Sau mỗi mốc chỉ đánh dấu IMPLEMENTED/TESTED/MANUALLY VERIFIED theo evidence thật. Source-template promotion, completed→template, undo/eventlog, PR/volume analytics, backend/AI không ở4mốc này. Roadmap không đánh dấu Phase4 DONE từ Phase4A.
