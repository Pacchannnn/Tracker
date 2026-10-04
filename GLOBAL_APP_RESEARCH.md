# Tracker V4 — Global product research

**RESEARCHED · 03–04/10/2026.** Baseline: Tracker V3, schema 6, HEAD `5e3332d`. Bộ test chạy lại ngày 04/10 trước thay đổi: **55/55 đạt**. Các ý tưởng trong báo cáo chưa mặc nhiên là tính năng đã triển khai; xem trạng thái ở `V4_ROADMAP.md`.

## Kết luận sản phẩm

Tracker đã có nền tảng đáng giữ: custom plans, snapshots lịch sử, alternatives, log nhanh, timer, thư viện thực phẩm/ảnh, bữa mẫu, recipes và journal/calendar. Khoảng trống lớn nhất nằm ở **chỗ nối giữa các thao tác**: chọn bài ngay trong builder, đổi bài sau khi đã bắt đầu, tìm món ngay lúc ghi ăn, tái dùng hoạt động journal và xem lại một ngày từ các dữ liệu đã có.

Hướng đề xuất là tăng tốc nhập và bảo vệ công sức đã nhập, rồi mới thêm My Day/review. Không cần chuyển framework/backend để làm các phần này. Nghiên cứu dẫn đến 15 đề xuất ưu tiên trong [backlog](TRACKER_FEATURE_BACKLOG.md), tám concept trong [product ideas](TRACKER_PRODUCT_IDEAS.md), và các mốc có acceptance criteria trong [roadmap](V4_ROADMAP.md).

## Phương pháp và giới hạn

1. Đọc tài liệu dự án, các module domain/UI và tests trước tìm đối thủ. [Baseline đối chiếu code](docs/research/2026-10-03-tracker-baseline.md) ghi rõ các tính năng đã có một phần để tránh đề xuất trùng.
2. Nghiên cứu ba nhóm độc lập bằng Exa; ưu tiên trang chính thức, help center, developer listings. Mở trang quan trọng thay vì chỉ dựa snippet. Đi sâu DailyBean, live-session/template scope và recipe arithmetic.
3. Tách **O: capability do nhà phát hành mô tả**, **U: ý kiến người dùng**, **P: đề xuất/suy luận cho Tracker**. Marketing không phải bằng chứng hiệu quả sức khỏe. Review cũ không chứng minh lỗi còn tồn tại hôm nay.
4. Hoàn tất corpus, đọc lại code liên quan, rồi mới xếp gap/score và chọn milestone nhỏ. Không tải nhật ký, ảnh, health logs hoặc MASTER_PLAN lên công cụ nghiên cứu.

**35 sản phẩm unique**: 11 Gym + 12 Nutrition + 11 Journal = 34; Gyroscope bổ sung góc cross-domain. Exist xuất hiện ở cả journal và cross-domain nhưng chỉ đếm một lần. Mẫu có tài liệu Nhật của Asken, Lyfta/Norway, phản hồi Đức/Europe, storefront Australia/New Zealand, bên cạnh tài liệu tiếng Anh toàn cầu. Đây không phải khảo sát đại diện mọi quốc gia; chưa xác minh mức phủ món Việt hay dùng thử trả phí từng app.

**Audit số nguồn:** Gym ghi 21 Exa searches/105 slots, Nutrition 40/200, Journal 17/88; root có thêm 4/20 cho cross-domain. Tổng **82 Exa searches, 413 slots yêu cầu**, không phải 413 trang đọc sâu. Ba hồ sơ ghi lần lượt 21, 34, 21 URL fetch thành công riêng trong từng nhóm; có overlap giữa nhóm. Root mở thêm cross-domain/API và spot-check sources. Không cộng thành một số URL unique giả. Gym còn dùng web fallback cho community (14 queries), với nguồn search-only được đánh dấu yếu hơn. Các ledger đầy đủ ở hồ sơ dưới đây. Một số trang dài được trích đoạn có giới hạn ký tự; không tuyên bố đã đọc toàn bộ policy/manual.

| Hồ sơ | Phạm vi và nội dung |
| --- | --- |
| [Gym — 11 sản phẩm](docs/research/2026-10-03-gym.md) | Inventory, 10-feature matrix đủ 16 trường, nguồn chính thức, complaints có ngữ cảnh, session identity risks |
| [Nutrition — 12 sản phẩm](docs/research/2026-10-03-nutrition.md) | Inventory, 10-feature matrix đủ 16 trường, serving/scaling contract, review đa thị trường |
| [Journal — 11 sản phẩm](docs/research/2026-10-03-journal.md) | Inventory, 10-feature matrix đủ 16 trường, DailyBean deep dive, mood models, activity/photos/recaps |
| [Cross-domain](docs/research/2026-10-03-cross-domain.md) | Exist/Gyroscope, My Day, missing-data semantics, nguồn loại bỏ |
| [Browser boundaries](docs/research/2026-10-04-browser-boundaries.md) | 4 trang MDN đã mở: barcode, voice, notifications, storage |

## Inventory và đóng góp riêng

| Nhóm | Sản phẩm | Pattern đáng học; capability chi tiết và link nguồn nằm trong hồ sơ nhóm |
| --- | --- | --- |
| Gym | Hevy | Chọn nhiều bài; session changes và lựa chọn cập nhật routine |
| Gym | Strong | Empty workout; lưu buổi thành template; lựa chọn phạm vi cập nhật |
| Gym | Fitbod | Muscle-led selection; thay bài theo dụng cụ/lịch sử |
| Gym | Boostcamp | Desktop multiweek authoring; tái dùng program |
| Gym | Alpha Progression | Gym profiles, giới hạn dụng cụ và mức tăng tạ có thật |
| Gym | JEFIT | Day/set editor và exercise database |
| Gym | Caliber | Chạm số liệu trước để điền; session/template confirmation |
| Gym | StrongLifts | Ghi set ít chạm; phân biệt chưa ghi và 0 reps |
| Gym | GymBook | Superset navigation; warm-up tách khỏi statistics; export |
| Gym | Lyfta | Routine/library, RPE, muscle/progress presentation |
| Gym | Liftosaur | Quy tắc tiến trình có thể xem trước; bài học về độ phức tạp |
| Nutrition | MacroFactor | Search + temporary plate/multi-add, go-to theo thời điểm |
| Nutrition | Cronometer | Serving/weight-based recipe, cooked weight, review ingredient matches |
| Nutrition | MyFitnessPal | Meal reuse/photos; recipe yield |
| Nutrition | Lose It! | Selected-mealtime suggestions và recent meals |
| Nutrition | Lifesum | Manual recents/favorites/quick macros song song AI |
| Nutrition | YAZIO | Amount/unit memory; photo estimate cho sửa lại |
| Nutrition | MyNetDiary | Frequent foods, aliases, Copy & Customize recipe |
| Nutrition | FoodNoms | Favorite portion presets và meal quick repeat |
| Nutrition | Mealime | Recipe → scaled groceries → cooking workflow |
| Nutrition | Samsung Food | Collections/search và recipe conversion |
| Nutrition | Paprika | Scale, check ingredients, highlight step, search/duplicate |
| Nutrition | Asken / あすけん | Dễ sửa nhận diện: alternatives, zoom, bổ sung món bị sót |
| Journal | DailyBean | Quick mood/activity capture, blocks tùy chỉnh, ảnh/note/calendar |
| Journal | Daylio | 5 nhóm mood, custom vocabulary và archive semantics |
| Journal | Day One | Search/tags, On This Day, rich media và export |
| Journal | Journey | Calendar/media views, throwbacks và prompts |
| Journal | Stoic | Morning/evening flow tùy chọn, blank/guided writing |
| Journal | Finch | Small goals, lựa chọn cách quay lại; gamification là đánh đổi |
| Journal | Reflectly | Prompt để bắt đầu và periodic review; AI claims chưa kiểm chứng |
| Journal | Bearable | Separate mood/energy; factor comparisons có điều kiện dữ liệu |
| Journal | Pixels | Daily mark và nhiều cảm xúc/moments |
| Journal | Diarium | Tập hợp context, local use và export |
| Journal | Exist | Tags/numeric attributes, relationships, memory và weekly review |
| Cross-domain | Gyroscope | Daily timeline tổng hợp; cloud/privacy là ranh giới riêng |

## Gym — điều gì thực sự cải thiện V3?

**Picker ở đúng chỗ.** Library hiện có muscle/equipment/pattern filters; builder chỉ tìm tên. Mượn nguyên tắc chọn tại điểm làm việc từ [Hevy](https://www.hevyapp.com/features/exercise-programming-options/) và bộ lọc thay bài của [Fitbod](https://fitbod.zendesk.com/hc/en-us/articles/360006335593-Editing-Workouts): dùng một picker cho Add/Replace, hiển thị bài đang chọn, giữ filter khi quay lại. Đây là cải thiện workflow có sẵn.

**Buổi hôm nay có quyền khác template.** [Strong](https://help.strongapp.io/article/177-update-template) và [Hevy](https://help.hevyapp.com/hc/en-us/articles/38387296276375-Update-Routine-vs-Keep-Original-Routine) cho thấy cần diễn đạt rõ cập nhật gì. Tracker nên cho sửa phần chưa tập trong snapshot, rồi lựa chọn giữ riêng hôm nay hoặc lưu template mới. Logged sets đang dùng exerciseIndex: không được reorder rồi gán nhầm bài đã tập. Phải có slot identity và tests trước khi làm.

**Analytics phải hiểu tạ.** Khác máy, tạ hỗ trợ pull-up, dumbbell mỗi tay, warm-up và working sets không nên gộp thành một PR/volume đơn giản. Trước mắt cải thiện lịch sử theo stable exercise ID, optional setup context và working/warm-up; hoãn e1RM/strength score. [GymBook FAQ](https://www.gymbookapp.com/faq) là ví dụ tách set phụ khỏi stats; [Alpha Progression](https://alphaprogression.com/en/glossary/gym-profile) gợi ý vai trò của dụng cụ có sẵn.

## Nutrition — ưu tiên sự lặp lại và số liệu rõ nghĩa

**Recents đã có, nhưng daily form chưa tìm được.** [MacroFactor](https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor) và [Lose It!](https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It) gợi hướng search/recents ngay lúc thêm món, sau đó mới favorites theo bữa và multi-add có preview. Đừng tạo lại food library khác; log phải tiếp tục giữ macro snapshot.

**Ba thao tác khác nhau:** nấu gấp đôi, chia cùng nồi thành nhiều phần, và ghi số phần đã ăn. Tracker có macro tự nhập mỗi phần, nên nấu 2 từ recipe gốc 4 sẽ nhân ingredients và total ×0.5, còn per-serving giữ nguyên. Chia cùng nồi 4 thành 8 thì ingredients/total giữ nguyên, per-serving giảm nửa. Logging 1.5 phần chỉ tác động meal entry. [Paprika](https://www.paprikaapp.com/help/iphone/), [Samsung Food](https://samsungfood.com/recipe-converter/) và [Cronometer](https://support.cronometer.com/hc/en-us/articles/360018510311-Create-Custom-Recipe) là nguồn pattern; contract cụ thể là thiết kế của Tracker.

**Personal library có giá trị ngay cả khi không có database ngoài.** Favorite portions, tìm theo tên/nguyên liệu/thẻ, duplicate recipe và cooking checklist giúp tái sử dụng dữ liệu người dùng nhập. Photo cover là nhận diện món, không phải phép đo macro. AI/voice/barcode cần đánh giá riêng; phản hồi từ Australia/Japan trong hồ sơ Nutrition cho thấy database lớn không bảo đảm workflow địa phương tốt.

## Journal — DailyBean principle, cách thể hiện của Tracker

[DailyBean FAQ](https://dailybean.app/en/faq) cho phép từ vài icon đến bài dài. Ý tưởng đáng học là entry ngắn vẫn đủ ý nghĩa, nội dung dài tùy chọn. Tracker giữ giấy/dấu mực/font hiện tại; không sao chép mascot, icons, bố cục hay wording. Tag buttons của Tracker đã có, nhưng lấy tám thẻ đầu tiên và chỉ thêm: nâng thành recent chips chọn/bỏ chọn có trạng thái rõ là bước nhỏ hợp lý.

[Daylio](https://daylio.net/faq/docs/daylio-faq/tutorials/create-and-manage-moods/) giữ custom moods dưới năm nhóm và phân biệt archive/delete. Tracker nên giữ 5 lựa chọn ban đầu, mở optional feelings/energy sau; không biến “Mệt” cũ thành “rất buồn” trong lịch sử. Dùng phân bố mood và coverage thay vì điểm wellness trung bình giả chính xác.

Calendar, ảnh theo ngày và hint buổi tập đã có. My Day cần mở rộng sang nutrition, cardio và check-in theo cùng date, có đường về record nguồn; không tự tạo journal/activities từ workout. Recap nên cho xem lại dữ liệu và highlight do người dùng chọn. “On this day” nên mở chủ động vì app không biết ký ức nào người dùng muốn gặp lại. Các nguồn [Day One](https://dayoneapp.com/features/), [Diarium](https://diariumapp.com/) và [Exist](https://exist.io/about/mood/) hỗ trợ các pattern này.

## Phản hồi người dùng → điều kiện thiết kế

| Bằng chứng U, không phải thống kê đại diện | Bài học áp dụng |
| --- | --- |
| [Strong thread 2025](https://www.reddit.com/r/strongapp/comments/1kn6psc/): khó hiểu hậu quả update template | Hiển thị phạm vi trước nút commit, không giấu “giữ riêng hôm nay” |
| [Caliber thread 2022](https://www.reddit.com/r/caliberstrong/comments/xvfwgb/): người dùng không tìm thấy swap, sau được chỉ gesture | Có nút Replace nhìn thấy; swipe chỉ là shortcut, không là đường duy nhất |
| [MFP multi-add 2023](https://community.myfitnesspal.com/en/discussion/10901258/multi-add-not-working-for-anyone-else): items được chọn không xuất hiện | Batch commit phải hiện số item, tránh save hai lần, có đối chiếu kết quả |
| [Paprika HN](https://news.ycombinator.com/item?id=25849830): số nằm trong mô tả có thể không được scale | Chỉ scale trường quantity; giữ prose và nhắc đọc lại, không nhân thời gian/nhiệt độ |
| [DailyBean Play reviews](https://play.google.com/store/apps/details?id=com.bluesignum.bluediary&hl=en_US): khen customization/photo-note; phản đối gián đoạn quảng cáo | Save nhanh, không chèn nudge unrelated; không suy ra mọi người muốn bỏ gamification |
| [Reflectly reviews](https://apps.apple.com/us/app/reflectly-journal-ai-diary/id1241229134): yêu cầu order/filter, review từ 2022 | Retrieval quan trọng sau khi có dữ liệu; không coi request cũ là feature vẫn thiếu hiện tại |

## Feature matrix và gap analysis

Ma trận đầy đủ gồm **30 feature rows × 16 dimensions** trong ba hồ sơ nhóm ở trên: feature/category/apps/problem/mechanism/evidence/praise/complaint/exists/current/improvement/local/privacy/complexity/value/original adaptation. Gym và Nutrition chia ngang thành hai bảng nối bằng ID để đọc được; Journal là một bảng. Bảng dưới là bản tổng hợp để quyết định, không thay bằng chứng chi tiết.

| Phân loại | Feature / baseline | Hướng xử lý |
| --- | --- | --- |
| ALREADY GOOD IN TRACKER | Custom plans, Original return, one-off, editable prescription | Giữ; không build lại |
| ALREADY GOOD | Session và nutrition snapshots; local image ownership | Regression gates cho mọi thay đổi |
| ALREADY GOOD | Quick-fill, focus, timer, saved meals, recipe/photos, calendar | Cải thiện vị trí/thao tác khi có bằng chứng, không gọi là thiếu |
| EXISTS BUT SHOULD BE IMPROVED | Add/replace picker, broad alternatives | Shared filters, concrete variants, difference preview |
| EXISTS BUT SHOULD BE IMPROVED | Recents/name search chỉ ở library; daily select | Search tại daily log, ưu tiên recent; favorites/multi-add sau |
| EXISTS BUT SHOULD BE IMPROVED | Activity tags và first-8 add buttons | Toggle + recency trước; catalog/group/archive sau |
| EXISTS BUT SHOULD BE IMPROVED | Recipe serving count và ingredients | Cook-size preview; phân biệt yield edit và log amount |
| EXISTS BUT SHOULD BE IMPROVED | Weekly logged-day summaries | Coverage, incomplete-day language, drill-through |
| HIGH-VALUE MISSING | Recovery cho chưa-start builder/planner | Schema migration, bounded drafts, conflict recovery |
| HIGH-VALUE MISSING | Live session structural edits | Stable slot IDs, giữ sets đã ghi, scope rõ |
| HIGH-VALUE MISSING | My Day read model và journal search | Join local records, source links, older entries |
| HIGH-VALUE MISSING | Favorites/portions, multi-add | Preview một batch, immutable historical snapshots |
| INTERESTING BUT LATER | Shopping list, cooking mode, monthly memories | Sau phần capture/reuse; không tự đoán units/cooking time |
| INTERESTING BUT LATER | Warm-up/superset, muscle distribution, equipment profiles | Làm rõ counting/loading semantics trước |
| INTERESTING BUT LATER | Notifications, PWA, CSV imports | Browser capabilities, recoverability, versioned parsing |
| NOT SUITABLE | Feed xã hội, leaderboard, điểm sức khỏe, compulsory streak | Không giải quyết mục tiêu personal recording hiện tại |
| REMOTE DECISION | AI photo/text/journal, cloud sync/health integrations | Consent, data route, keys, cost/retention; không nối trong V4 research |

## Unique ideas discovered — bản thích ứng riêng

1. **“Chỉ hôm nay” + phiếu thay đổi:** scope badge và diff nhỏ khi xong buổi; giúp tập linh hoạt mà không sợ phá plan. Kết hợp Hevy/Strong với snapshots Tracker.
2. **“Mình đã dùng món này” có bối cảnh:** món thường ghi ở bữa đang chọn, portion hiện rõ, một nút bỏ gợi ý. Kết hợp MacroFactor/Lose It! với thư viện cá nhân, không dự đoán nên ăn gì.
3. **“Nấu bao nhiêu — ăn bao nhiêu”:** hai con số tách nhau; batch preview không sửa recipe hay bữa cũ. Bài học từ recipe tools và các complaints scaling.
4. **“Ngày có dấu vết”:** một trang giấy gom dữ liệu đã có, nguồn gốc rõ, các khoảng trống trung lập. Inspired by Diarium/Gyroscope; không cần tự động theo dõi vị trí hoặc wearable.
5. **“Tuần được ghi lại”:** coverage đứng cạnh số liệu; mood distribution riêng với số ngày có mood. Giữ điểm mạnh summary hiện có, tránh gamification áp lực.
6. **Thay bài có lý do và khác biệt:** cùng primary muscle nhưng khác equipment/movement hiển thị cạnh nhau; dùng lịch sử setup phù hợp, không gọi là “bài tương đương an toàn”.
7. **Ký ức do mình chọn:** tháng gồm ảnh/entry highlight người dùng chọn và achievements thực có, không AI tự đánh giá đời sống hoặc bật ký ức nhạy cảm.

## Local-first, privacy và dependencies

| Loại | Ví dụ | Ràng buộc |
| --- | --- | --- |
| FULLY LOCAL | Search, favorites, chips, scale, My Day, descriptive reviews, drafts | Dùng JSON versioned/IDB; cần migration nếu thêm persistent structure |
| LOCAL WITH BROWSER API | Photo picker/camera, notifications, storage estimate/persist, barcode decoding | Permissions/capability detection/fallback; không suy ra browser API luôn offline |
| EXTERNAL DATABASE | Barcode→global food macros, catalog/media ngoài | Coverage/license/cache/source attribution; không dùng để tự thay plan |
| REQUIRES BACKEND / CLOUD ACCOUNT | Multi-device sync, remote restore, shared accounts | Auth/conflicts/encryption/retention/backup cần thiết kế và duyệt |
| REMOTE AI / FUTURE DECISION | Photo nutrition, natural-language planner, journal summary | Chỉ gửi trường đã cho phép; secure server key; estimates cần review; manual luôn tồn tại |

[FoodNoms policy](https://foodnoms.com/privacy) mô tả AI inputs có thể gửi tới OpenAI; [Gyroscope policy](https://gyrosco.pe/privacy/) mô tả xử lý server. “Private” không đồng nghĩa local. [MDN boundaries](docs/research/2026-10-04-browser-boundaries.md) giải thích speech/platform service và notification mobile. Không thêm tracking, analytics, account, cloud hay remote AI trong scope hiện tại.

## Đánh giá sau nghiên cứu

Ba hướng: (A) polish local nhỏ, rồi thiết kế My Day/flexible session; (B) build My Day/catalog đồng loạt; (C) ưu tiên AI/integrations. **Chọn A** vì cải thiện workflow có sẵn và có thể kiểm chứng ngay. B cần quyết định model/UX; C cần data/privacy/backend và không giải quyết việc tìm/chọn/lưu cơ bản.

Đợt nhỏ được chọn: **search trong daily food picker; recipe cook-size preview; recent toggle tags**. Cả ba không thêm persisted field, không thay plan/targets, giữ schema 6. Roadmap phải ghi riêng PLANNED → IMPLEMENTED → TESTED dựa trên kết quả thực tế, không dựa vào việc báo cáo đã viết xong.
