# Tracker V4 — Phase 8A Experiment Backlog

08/10/2026 · **DESIGN / RESEARCH ONLY — PROPOSED, NOT APPROVED FOR IMPLEMENTATION.** Baseline code6c67590/docs1fc8add;388tests/schema8. Không feature code, migration, dependency, analytics hay user-data mutation.

## 1. Quy tắc ưu tiên

Giá trị/tần suất là suy luận cho ứng dụng cá nhân, chưa đo user behavior. Không cộng điểm để tạo độ chính xác giả. Action = một lần kích hoạt nút/navigation hoặc hoàn tất một nhóm nhập liệu; số ký tự gõ và thời gian đo riêng. Không gọi con số action dự kiến là số taps đã tiết kiệm trên điện thoại.

**P0 gate:** backup/device readiness trước thay đổi persistence lớn. **P1 experiment:** có hypothesis nhỏ và rollback ít rủi ro. **P2 conditional:** chỉ xét khi xác nhận nhu cầu. **Hold:** semantics/privacy chưa đủ. Không coi gate/checklist hay polish candidate là experiment thứ3.

## 2. Bảng so sánh

Tần suất ghi “nếu…” là điều kiện, không dữ liệu thật. Migration = dự kiến khi triển khai theo scope được mô tả, không quyết định schema đã duyệt. Rollback có persistent fields cần giữ dữ liệu mới, không hạ schema hoặc xóa fields tự động.

| Đề xuất / priority | Giá trị sử dụng | Tần suất dự kiến | Actions có thể giảm (chưa đo) | Độ khó | Rủi ro dữ liệu | Migration? | Module chịu ảnh hưởng | Kiểm thử | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 fill từ hiệp trước cùng slot — P1 chọn | Bớt gõ thông số lặp, không đổi plan | Mỗi buổi nếu repeats phổ biến | Khoảng0–1 nhóm nhập/hiệp;0 khi dùng history quick-fill hiệu quả | Thấp–vừa | Thấp về persistence; nhầm số nhập cần review | Không, UI dùng saved values | Session UI/readers/dirty guard | Exact slot/unit/edit/stale/double-save; mobile/keyboard | Bỏ control, logs vẫn hợp lệ8 |
| E2 MyDay Home prototype — P1 chọn có điều kiện | Review ngày ngay khi mở | Mỗi lần mở để review nếu có nhu cầu | Tối đa1 navigation/action review; có thể tăng đường Start Gym | Vừa | Thấp nếu chỉ prototype route | Không cho prototype; persistent preference thiết kế riêng | Home/MyDay/source/nav/photo reads | Entry/date/reset/draft recovery/zero writes | Trở lại Dashboard, không đổi records |
| Favorites/pins + lượng quen — P2 | Món thường dùng dễ chọn | Hằng ngày nếu recents6 không đủ |0→bớt query/amount; chưa đếm | Vừa | Vừa: refs mất/archived, lượng cũ | Có nếu lưu preferences chuẩn | Food/recipe/batch/settings/backup | Rename/delete/snapshot/pin order/default amount | Ẩn feature, giữ preference, không downgrade |
| Portion basis/grams — P2 | Bớt quy đổi khẩu phần có cân | Mỗi meal có mapping thật | Bớt một phép quy đổi ngoài app; không hứa tap count | Vừa–cao | Vừa–cao: sai macro do unit/basis | Có nếu persistent mapping | Food/meal/copy/recipe/backup | Exact grams per serving, legacy unknown, snapshots | Quay về serving mode, giữ provenance |
| Cooked weight/yield — P2 | Chia cùng batch đúng khối lượng đo | Mỗi lần meal prep nếu dùng | Bớt nhẩm chia; không giảm nhập measured weight | Cao | Cao nếu đổi totals cũ | Có nếu batch/yield lưu | Recipes/log/copy/backup | Total invariant, raw/cooked, fractional portions | Giữ batchtotal, bỏ UI mới; không đổi history |
| Shopping checklist — P2 | Gom nguyên liệu định nấu | Hằng tuần nếu prep nhiều recipe | Bớt chép tay; unknown count | Vừa | Thấp nếu view; vừa nếu saved list | Không derived; có nếu list persistent | Recipes/ingredients/cooking | Exact name/unit compatible, no guessing | Bỏ view, recipe nguyên |
| Pending nutrition batch recovery — P2, nâng ưu tiên nếu H4 đúng | Bảo vệ effort trước Confirm | Chỉ khi reload/crash ở pending |0 thường; tránh nhập lại N rows khi mất | Vừa–cao | Cao: stale/double commit/replay | Cần contract; mặc định migration nếu canonical persisted draft | Batch/store/settings/restore/backup | Raw invalid input, tabs/quota/restore, explicit Resume→fresh review | Tắt resume, giữ/export draft; không auto log |
| Journal quick draft/recovery — P2 | Giữ đoạn chưa Save | Nếu đóng/reload khi soạn |0 thường; tránh viết lại | Vừa–cao | Vừa: nhạy cảm, ngày/mood/duplicate stale | Có nếu canonical draft | Journal/MyDay/backup | Date switches, dirty, explicit discard, partial photos | Giữ/export draft; không auto publish entry |
| Advanced sets warm-up/working→supersets — P2 | Ghi đúng loại thực tế tập | Chỉ nếu user có sử dụng | Không chắc giảm action; thêm classification | Cao | Cao: counts/history/timer/volume | Có cho saved setType/group semantics | Identity/log/previous/history/progress/backups | Legacy unclassified, ownership, totals/timer | Không xóa type/groups; old writer compatibility phải rõ |
| Equipment profiles — P2 | Tách load context/setup theo máy | Mỗi lần đổi gym/máy nếu cần | Bớt gõ setup, có thể thêm bước chọn profile | Cao | Vừa–cao: wrong aggregation | Có nếu linked snapshot profile | Library/plan/slot/previous/progress/backup | Rename/archive/load conventions, same-name IDs | Keep snapshots; disable new edits, không gộp histories |
| PWA/offline shell — Hold trước device/update gate | Mở app khi server/network mất | Theo môi trường gym, chưa biết | Bớt thao tác mở server; tap count chưa đo | Vừa–cao | Cao nếu cache writer mismatch | Không nhất thiết schema; thêm SW/cache contract | All routes/assets/storage lifecycle | Native offline/cold update/N→N+1/old tabs | Unregister owned SW/remove owned app caches ONLY; giữ JSON/IDB |
| In-app reminder→notifications — Hold | Nhắc thao tác user chọn | Theo nhu cầu opt-in | Không chắc giảm thao tác; có thể gây gián đoạn | Vừa in-app; cao background | Privacy cao nếu lockscreen notes; delivery false certainty | Không transient; có cho prefs | Timer/journal/platform | Permission deny/revoke, background/timezone/neutral content | Tắt reminder/subscription riêng; data giữ nguyên |
| Plan-only export/import — P2 | Chuyển routine không mang history | Không thường xuyên | Bớt dựng lại plan | Vừa | Vừa–cao: ID mapping/source conflict | Có thể không, nhưng import-format contract riêng | Plans/library/Original/backup | Preview/collision/missing exercise/zero personal export | Bỏ importer, plan đã nhập vẫn hợp lệ |
| Paired backup confidence + large-file option — P0 readiness, P2 code sau đo | Bảo vệ mọi module | Backup định kỳ/restore hiếm | Có thể thêm bước kiểm tra; không đo bằng fewer clicks | Vừa→cao ZIP/stream | Cao: pair/collision/partial restore | Không data8 nếu UI; format change cần contract mới | Settings/JSON/IDB/files | Actual files/fresh-origin hashes/abort/stale/limits | Giữ hỗ trợ backup1/JSON8, không xóa safety copies |
| Associations — Hold | Tìm pattern mô tả cá nhân nếu đủ dữ liệu | Tuần/tháng nếu muốn | Không giảm logging, có thể tăng review fields | Cao | Vừa–cao: semantic reinterpretation | Có thể có nếu explicit absence/window lưu | Journal/sleep/gym/nutrition/Life Review | Missing/unknown/zero, paired observations/sample denominators | Bỏ derived view; explicit records giữ nguyên |
| AI/cloud/backend — Hold quyết định riêng | NL planning hoặc nhiều thiết bị | Chưa có requirement đo được | Unknown; local planner đã có | Cao | Cao: disclosure/conflict/retention | Không mặc định; architecture contract riêng | All persisted data/provider boundary | Offline/manual/draft approval/export/delete/merge | Local mode đầy đủ + verified exported data; không hứa rollback remote effortless |

**Polish candidates chưa triển khai:** A01 thống nhất food-library search; A02 xem thêm exercise history; A05–A06 đo scans/paging. Chúng thuộc backlog đã có (search/history/large photos), không đề xuất rewrite hoặc một “engine tối ưu” mới. User có thể chọn chúng thay một experiment sau khi đọc audit.

## 3. Tại sao chỉ chọn E1 và E2

Ba hướng đã cân nhắc:

1. **Hai thử nghiệm UI nhỏ (đề xuất):** tận dụng exact saved data và derived MyDay, không tạo persistent structure. Giá trị có thể đo bằng task trước/sau; rollback code không cần xóa lịch sử.
2. **Nutrition-first pins/recovery:** hợp lý nếu mất pending hoặc tìm món là pain point thường xuyên. Tuy nhiên recents/search/batch đã làm; chưa có bằng chứng thêm pin đáng migration, và recovery cần chống replay/restore/quota riêng.
3. **Platform/analytics trước:** PWA/cloud/advanced sets hấp dẫn nhưng phát sinh cache/ownership/privacy hoặc absence model. Chưa có device/cost/need gate nên hoãn.

E1 ưu tiên1 vì hành động lặp nằm trong workflow chính. E2 ưu tiên2 **có điều kiện**: chỉ mở prototype nếu user muốn review ngày là landing chính. Nếu điều đó không đúng, bỏ E2; không lấp chỗ trống bằng feature khác tự động. Backup/device checklist luôn là gate độc lập, không nằm trong hai experiment này.

## 4. E1 — Fill từ hiệp đã lưu ngay trước trong cùng slot

**Trạng thái:** PROPOSED / NEEDS USER APPROVAL; chưa code/test experiment.

**Vấn đề C/H:** hiệp mới trống; history quick-fill đã có. Chưa có shortcut lấy set trong buổi đang tập, hữu ích khi không có history hoặc tải/reps hôm nay khác buổi trước. Tần suất lặp và savings chưa biết.

**Giả thuyết:** shortcut explicit điền **weight + unit + reps**, giữ **RIR trống**, giảm retyping với hiệp lặp mà không làm tăng nhập sai. RIR mỗi hiệp vẫn tự ghi; không coi RIR cũ là mức hiện tại. Không mặc định prefill hay auto save.

**Scope cụ thể đề xuất:**

- Chỉ form tạo set mới của live structured active slot, không history edit/legacy ambiguity/inactive/complete target. Source là hiệp đứng trước theo set numbering trong chính slot, ID/ownership xác định; không lấy slot tên giống, bài Replace cũ hay buổi khác. Nếu không xác định duy nhất thì disable và giải thích.
- Label riêng **Điền tạ & reps từ hiệp trước trong buổi**, xem được source setNumber/unit; không thay nghĩa **Dùng số lần trước** đang lấy history.
- Click chỉ thay input nếu form nguyên trạng; form dirty thì không ghi đè, giữ guard/explicit user review. Source đổi sau render thì chặn và yêu cầu refresh review. Quick-fill giữ dataset baseline để dirty detection vẫn thấy input chưa lưu; đủ target không tự mở hiệp mới.
- Save đi qua canonical command hiện có, validation/queue/CAS; không viết thêm command/storage/entity hoặc append log từ quick-fill. Correct/edit/delete source và stale tab được xem lại trước action/Save.

**Không làm:** copy RIR/setup/medical claims; auto tăng tải; auto-save/auto-start timer; copy qua exercise/profile/unit conversion; advanced types; change Original/template/history; reset draft; dependencies/backend.

**Đo:** user trước hết xác nhận tình huống có xảy ra. Chuỗi synthetic6 new sets:3 lặp weight+reps,2 đổi reps/load,1 không source; thêm repeated-name/Replace/lb. So manual và **existing history quick-fill** với proposal, thứ tự A/B xen kẽ,3 lượt mỗi workflow. Ghi action groups/characters/time/corrections. Có thể thử ở2buổi dùng thường sau phê duyệt, chỉ user tự dùng, không ghi private values vào research log.

**Acceptance gates đề xuất:**

- E1-G1: toàn388 baseline giữ passing; RED/GREEN exact-source/unit/dirty/stale/quota/double-save và no write before Save.
- E1-G2: input RIR vẫn trống; validation không bỏ qua; khác slot/Replace/legacy/inactive/history không quick-fill nhầm; original/history/meta/backup8 giữ nguyên.
- E1-G3:320/360/390 + keyboard/focus, nhãn phân biệt2quick-fill; source cập nhật/xóa stale rejects. Save exactly1log, failure giữ input; no hidden autosave.
- E1-G4: ở repeated scenario ít nhất1 nhóm nhập ít hơn manual và thời gian median giảm; so history shortcut không tệ hơn quá1action. Changed-value scenarios không tăng lỗi không sửa. Các ngưỡng là đề xuất usability, không standard khoa học.
- E1-G5: user hiểu nguồn là hiệp trong buổi và chủ động điền RIR;0wrong-source/ownership/unsaved overwrite. Review/save là lựa chọn user.

**Stop:** dừng ngay khi wrong source/unit, silent overwrite/save hoặc regression; dừng nếu source semantics buộc đổi schema/scope. Sau6scenario×3lượt và2buổi nếu phù hợp mà không giảm effort hoặc user không dùng, bỏ experiment. Không mở thêm tính năng để cứu hypothesis.

**Rủi ro/rollback:** reps có thể giảm do fatigue nên user phải review; nếu sửa lại thường xuyên thì lợi ích mất. Disable/bỏ control để quay về manual/history-fill; saved sets vẫn schema8 valid. Không dùng git revert trên working tree có edits riêng mà chưa kiểm tra; rollback code không xóa data.

**Cần user quyết:** có thường lặp weight+reps không; đồng ý RIR luôn nhập riêng và scope live-only; có muốn duyệt E1 độc lập không. Chưa cần schema decision nếu giữ scope này.

## 5. E2 — My Day làm Home: prototype opt-in

**Trạng thái:** PROPOSED / NEEDS USER APPROVAL; không đổi Home hiện tại.

**Vấn đề C/H:** Dashboard→Xem ngày có1navigation action; Dashboard đã hữu ích cho next/resume workout và draft recovery. Không có bằng chứng người dùng muốn mở vào MyDay hơn Dashboard.

**Giả thuyết:** entry vào MyDay giảm đường review ngày mà không làm đường start/resume gym/nutrition dài hơn đáng kể hoặc che cảnh báo recovery.

**Scope:** A/B prototype ở disposable test context, lựa chọn variant tại launch thử; không auto áp lên app user. B reuses MyDay localtoday với một nhóm shortcut Start/Resume như Dashboard và link về Dashboard hiện tại, giữ builder/planner/error recovery notices. Primary navigation vẫn Hôm nay; không tạo thêm main tab. Review sources/Back/selected-date semantics giữ nguyên; startup hôm nay, không tự mang ngày quá khứ từ lần trước.

**Không làm:** schema/preference key/sessionStorage mới, persisted route/date, bỏ Dashboard, sửa editor nguồn, auto-save/tạo “rest day”, synthesize0/macros/mood, ảnh gốc auto-read, global search engine/ranking/charts/AI. Persist Home preference chỉ xem xét nếu prototype qua gate và user duyệt contract riêng.

Root JSON read failure vẫn dùng recovery/readonly route hiện có, không bypass parse/validation để dựng một MyDay trống. Prototype không được thay nghĩa các errors chỉ để giữ landing B.

**Đo:**3task review today/source/return +3task start next/resume draft/log nutrition, có empty/photo-only/malformed/photo failure/planning recovery.3lượt A/B xen kẽ trên desktop và phone nếu có. Action/time/missed notices/backtracks manual log, không telemetry. C: expected maximum1navigation saved chỉ ở direct review task; chưa đo.

**Acceptance gates đề xuất:**

- E2-G1: baseline388 giữ passing, MyDay/Weekly/Monthly sources/dirty/Back không đổi; JSON/IDB0writes cho Home navigation/selection và raw/meta/bytes/backup equality.
- E2-G2: startup localtoday và reload semantics đúng; absent photo DB vẫn absent; independent photo/root/domain failures không fake empty. Chỉ reuse current MyDay thumbnail contract, không bulk originals.
- E2-G3: mọi saved draft/recovery notice và next/start/resume action hiện dễ tìm; start/resume không tăng navigation actions so A;3review task median giảm ít nhất1action trên task có shortcut hiện tại. Nếu chỉ giúp review nhưng hại workout, không promote.
- E2-G4:320/360/390, keyboard, native device nếu có; long data/virtual keyboard/sourceBack không overflow/focus theft. User giải thích được đang xem ngày nào và đường về Dashboard.
- E2-G5: user thực sự chọn variant B sau thử; không dùng điểm thẩm mỹ hoặc app đối thủ thay usability evidence.

**Stop:** user chủ yếu mở app để tập, không thích B, recovery notice mất, thêm tác vụ ghi, read-load tăng không chấp nhận hoặc tests regress. Nếu cần persistent layout builder/preference migration trước đo, dừng scope. Không tự biến MyDay thành Home chỉ vì đã dựng prototype.

**Rủi ro/rollback:** photo reads/landing clutter và cold-start nhiều hơn; Dashboard mất sự trực tiếp cho gym. Quay entry về Dashboard, bỏ prototype switch; summaries/records không đổi. Giữ module MyDay working độc lập.

**Cần user quyết:** mục đích mở app thường nhất, có muốn thử variantB không, quyền tạo disposable prototype. Quyết định lưu preference/dùng B mặc định sau thành công là approval thứ hai, không gộp với thử nghiệm.

## 6. Contract điều kiện cho các hướng bị hoãn

- **Pins/recovery:** persistent data bắt buộc version+backup+migration tests nếu model mới; không nhét opaque preferences vào schema8 để né review. Recovery lưu bounded raw intent, không reviewed commit để auto replay; latest-source validation sau Resume.
- **Grams:** explicit measured grams-per-serving/basis do user nhập; legacy text giữ nguyên/unknown. Raw/cooked distinct; log snapshot giữ quantity/unit/basis tại lúc Save. Không parse “bát” thành gram hay ước tính từ photo.
- **Yield:** repartition cùng batch giữ tổng nutrition; cook-size scaleRecipe là workflow khác. Measured cooked weight cần trước macros/gram; không suy yield từ raw ingredient mass.
- **Set types/equipment:** legacy unclassified, working vs warmup counts và load conventions/assisted machine khác nhau. Structured slot/sets/replaced history giữ ownership; không gộp theo tên.
- **Associations:** đủ explicit absence/missing contract rồi mới comparison; no diagnosis/causality/automatic training changes.
- **AI/cloud:** backend keys, exact data allowlist/opt-in, provider cost+retention, manual/offline fallback, data deletion/export/conflict model phải được user duyệt. Chưa có provider nên chi phí/retention UNKNOWN; không default Flask/cloud.

## 7. Handoff

Deliverable8A là proposal có acceptance/stop/rollback, không implementation plan đã được duyệt. **Không dùng câu “continue” để tự chọn cả2 nếu user chưa chốt scope.** Quyết định cụ thể ở [PHASE8A_DECISION_REPORT.md](PHASE8A_DECISION_REPORT.md). Next:STOP8A;8B requires explicit authorization and selected experiment contract.
