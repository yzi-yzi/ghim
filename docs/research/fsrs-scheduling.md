# FSRS scheduling cho Ghim

> Trạng thái: research note — facts và recommendations được tách rõ  
> Kiểm chứng lần cuối: 2026-09-11  
> Phạm vi: thuật toán, review UX, dữ liệu, personalization và lựa chọn thư viện cho web app Ghim

Các claim có link trực tiếp là **fact đã kiểm chứng** từ tài liệu, source code hoặc repository chính thức tại ngày trên. Các đoạn ghi **recommendation** hoặc **inference** là quyết định được đề xuất cho Ghim dựa trên các facts đó.

## Kết luận

Ghim nên triển khai **FSRS-6**, không tự viết công thức và chưa lấy FSRS-7 làm production scheduler. FSRS-7 hiện là phiên bản mới nhất trong benchmark/research của Open Spaced Repetition, nhưng implementation TypeScript được duy trì chính thức và Anki production vẫn dùng FSRS-6. Lựa chọn ít rủi ro nhất cho một web app TypeScript là:

1. Dùng `ts-fsrs` làm scheduler, pin exact package version và ghi version vào mọi Review Event.
2. Dùng default FSRS-6 parameters và desired retention `0.90` khi khởi tạo.
3. MVP hiển thị hai kết quả **Quên** và **Nhớ**, map lần lượt sang `Again=1` và `Good=3`; không hiển thị `Hard`/`Easy`.
4. Mỗi `Memory Track` có state, due date và review history riêng. Recognition và Production không chia sẻ memory state dù cùng thuộc một Vocabulary Item.
5. Review log là immutable source of truth; card state hiện tại là projection có thể rebuild. Undo void event vừa tạo và restore/replay state, không xóa lịch sử không dấu vết.
6. Không reschedule hàng loạt ngay khi đổi parameters/version. Áp dụng cấu hình mới ở review kế tiếp; chỉ chạy explicit migration có preview, audit record và rollback plan.
7. Ưu tiên due/overdue reviews; tạm dừng new items khi có backlog. Practice trước hạn mặc định không đổi lịch FSRS.

Đây là recommendation của báo cáo. Các phần dưới giải thích căn cứ và những điểm sản phẩm vẫn phải chốt.

## 1. Phiên bản thuật toán hiện hành

### Fact đã kiểm chứng

FSRS mô hình hóa memory bằng Difficulty, Stability và Retrievability. Với FSRS-6, memory state lưu `S` và `D`; forgetting curve suy ra `R`, và phiên bản này dùng 21 parameters. Official algorithm page mô tả `Again=1`, `Hard=2`, `Good=3`, `Easy=4`, công thức riêng cho successful review và lapse, cùng trainable decay của forgetting curve ([Open Spaced Repetition — The Algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)).

Official benchmark hiện gọi **FSRS-7** là phiên bản mới nhất. Nó được thiết kế cho fractional intervals, dự đoán same-day recall và dùng forgetting curve phức tạp hơn với 35 default parameters được liệt kê trong benchmark. Chính benchmark cũng nói khi đưa FSRS-7 vào Anki nên bật recency weighting và scheduling penalties; cách diễn đạt này cho thấy nó vẫn là frontier/target integration, không phải production contract đã ổn định ([official srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark)).

Ngược lại, danh mục implementation chính thức vẫn liệt kê `ts-fsrs` là **Scheduler v6** ([awesome-fsrs implementation list](https://github.com/open-spaced-repetition/awesome-fsrs)). Source hiện tại của `ts-fsrs` chỉ chấp nhận parameter arrays dài 17, 19 hoặc 21 tương ứng FSRS v4, 5 và 6; không có 35-parameter FSRS-7 ([`default.ts`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/default.ts)). Anki main đang phụ thuộc crate `fsrs` 6.6.x và source dùng `FSRS6_DEFAULT_DECAY`; release 26.09b2 cập nhật FSRS lên 6.6.2 ([Anki `Cargo.toml`](https://github.com/ankitects/anki/blob/main/Cargo.toml), [Anki releases](https://github.com/ankitects/anki/releases), [Anki FSRS memory-state source](https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/fsrs/memory_state.rs)).

### Recommendation cho Ghim

- Ship FSRS-6 qua `ts-fsrs`; xem FSRS-7 là một migration tương lai, không phải MVP dependency.
- Đặt scheduler sau một internal adapter để domain không phụ thuộc tên field hoặc object shape của thư viện.
- Pin exact npm version. Không dựa vào `main`, `latest` hay auto-upgrade vì cùng một review history phải cho kết quả kiểm tra được.
- Lưu riêng `algorithm_family=FSRS`, `algorithm_major=6`, `implementation=ts-fsrs`, exact package version, parameter-set ID và config version.
- Chỉ nâng FSRS major sau khi có golden-history parity tests, workload simulation, migration plan và canary.

## 2. Rating 1–4 và UI ít nút

### Fact đã kiểm chứng

FSRS định nghĩa bốn grades: `Again=1`, `Hard=2`, `Good=3`, `Easy=4`. `Again` là fail; `Hard`, `Good`, `Easy` đều là pass ([algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm), [Anki statistics](https://docs.ankiweb.net/stats.html)). `Hard` phải có nghĩa là đã nhớ đúng nhưng rất khó. Nếu dùng `Hard` khi thực ra quên, FSRS sẽ tính intervals quá dài ([Anki deck options](https://docs.ankiweb.net/deck-options)).

Official FSRS tutorial nói dùng chỉ `Again` và `Good` vẫn hoạt động tốt, và research của nhóm tại thời điểm tài liệu đó được viết thậm chí cho thấy accuracy hơi tốt hơn ở người chủ yếu dùng hai nút. Tutorial cũng yêu cầu không đổi rating habit giữa chừng và rating theo mức nhớ, không theo interval mong muốn ([FSRS4Anki tutorial FAQ, Q8–Q9](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md)). Official benchmark có chế độ `--two_buttons`, trong đó `Hard` và `Easy` được remap thành `Good`, xác nhận two-button histories là một input model được hỗ trợ trong đánh giá ([srs-benchmark options](https://github.com/open-spaced-repetition/srs-benchmark)).

### Hệ quả của từng lựa chọn

| UI | Mapping | Lợi ích | Chi phí/rủi ro |
|---|---|---|---|
| 4 nút | 1/2/3/4 nguyên bản | Giữ đầy đủ grade signal | Tăng cognitive load; `Hard` dễ bị hiểu là “quên nhưng gần đúng”, làm hỏng lịch |
| 3 nút, ẩn Easy | Quên→1, Khó nhưng nhớ→2, Nhớ→3 | Giữ distinction `Hard` | Vẫn phải dạy ranh giới fail/pass; mất signal “rất dễ” |
| 2 nút | Quên→1, Nhớ→3 | Cực rõ, loại Hard misuse, phù hợp UX Ghim | Mất intensity signal từ 2/4; mọi pass đi qua Good |

### Recommendation cho Ghim

MVP dùng **hai nút**:

- **Quên** — không recall đúng trước khi reveal → `Again`.
- **Nhớ** — recall đúng đủ theo tiêu chí prompt → `Good`.

Không tự suy grade từ thời gian trả lời và không cho người dùng chọn interval. Nếu sau này experiment ba nút, wording phải là **Quên / Nhớ nhưng khó / Nhớ rõ**, và analytics phải chứng minh learner hiểu đúng `Hard` trước khi rollout. Không “giấu Easy nhưng âm thầm đoán Easy”; một output không do learner chọn không nên trở thành training label.

## 3. Desired retention

### Fact đã kiểm chứng

Desired retention là xác suất mục tiêu để recall khi card đến hạn. Anki mặc định `0.90`, gọi đây là cân bằng tốt giữa retention và workload. Workload tăng rất nhanh trên 90% và có thể overwhelming trên 97%; manual khuyên dưới 97% ([Anki deck options](https://docs.ankiweb.net/deck-options)). Official `ts-fsrs` nhận `request_retention` từ 0–1 và ghi rõ giá trị cao hơn tăng review load ([`ts-fsrs` README](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)).

Anki hiện hỗ trợ workload simulation để so reviews/day hoặc minutes/day ở các mức retention; tính toán dùng real memory states, parameters và desired retention ([Anki simulator](https://docs.ankiweb.net/deck-options)).

### Recommendation cho Ghim

- Default và ẩn `0.90` trong MVP. Không bắt người mới chọn một tham số họ chưa có trực giác.
- Desired retention thuộc scheduler policy version, không thuộc từng Deck Membership.
- Sau khi đủ history, có thể cho lựa chọn bằng ngôn ngữ workload như “nhẹ / cân bằng / nhớ nhiều hơn”, nhưng phải preview minutes/day; không lộ con số làm control chính.
- Không vượt 0.95 trong preset thông thường; 0.97+ chỉ là expert/temporary mode có cảnh báo workload.
- Không dùng desired retention để cứu streak hoặc đạt XP. Gamification không được tạo premature reviews.

## 4. Same-day scheduling và learning steps

### Fact đã kiểm chứng

Anki khuyên mọi learning/relearning step ngắn hơn một ngày, có thể hoàn tất cùng ngày, và giữ số step tối thiểu. Repetition nhiều lần trong cùng ngày không đóng góp đáng kể cho long-term memory; step dài có thể chiếm quyền scheduling của FSRS hoặc làm interval của Hard dài hơn Good. Anki hiện cho phép để trống steps để FSRS điều khiển short-term scheduling, nhưng đánh dấu đây là experimental ([Anki learning/relearning guidance](https://docs.ankiweb.net/deck-options)).

`ts-fsrs` hỗ trợ `enable_short_term`, `learning_steps` và `relearning_steps`; empty step list có nghĩa là FSRS quản lý. Package cũng cung cấp fixed step examples như `1m, 10m` và `10m` ([`ts-fsrs` README and models](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md), [`models.ts`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/models.ts)). FSRS-6 cải thiện formula cho same-day stability; FSRS-7 mới là nhánh được benchmark tuyên bố có realistic same-day probability predictions nhờ fractional intervals ([algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm), [benchmark](https://github.com/open-spaced-repetition/srs-benchmark)).

### Recommendation cho Ghim

- Không bê nguyên nhiều learning steps kiểu Anki vào UI.
- Với production FSRS-6, dùng một relearning step ngắn, ví dụ `10m`, sau `Again`; item quay lại khi step due nếu learner vẫn đang học. New item có thể dùng một exposure/reveal rồi vào FSRS, không ép 3–4 lần cùng ngày.
- Coi exact step là hypothesis phải test bằng prototype. Nếu fixed `10m` khiến review session bị kéo dài, kết thúc session hiện tại và hiện “1 từ quay lại sau 10 phút”; không giả vờ ngày đã hết review.
- Chỉ để FSRS-6 tự short-term toàn bộ sau khi test interval UX. Khi FSRS-7 có production TypeScript implementation ổn định, reevaluate vì mô hình same-day của v7 thay đổi đáng kể.
- Lưu timestamps với độ chính xác milliseconds; không collapse mọi same-day event thành cùng một ngày trong source log.

## 5. Default parameters và personalization

### Fact đã kiểm chứng

Optimizer học memory pattern từ review history. Anki khuyên không sửa/copy parameters thủ công, và nói “less than a few hundred” reviews là một nguyên nhân health check không tốt. Optimize khoảng mỗi tháng là đủ ([Anki FSRS parameters](https://docs.ankiweb.net/deck-options)). Tutorial của FSRS cho biết Anki 24.06+ không còn hard minimum: optimizer tự quyết định subset parameters theo lượng data; bản 24.04 từng cần 400 reviews và bản cũ hơn cần 1,000. Khi không đủ, default parameters được dùng ([official FSRS tutorial](https://github.com/open-spaced-repetition/fsrs4anki/blob/main/docs/tutorial.md)).

`@open-spaced-repetition/binding` cung cấp `computeParameters()` từ history nhưng đang ghi rõ **public beta** và API có thể đổi giữa releases. Nó chạy trên `fsrs-rs`/`napi-rs`, yêu cầu Node 20+, và có cả Node/WASI paths ([binding README](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding/README.md)).

### Recommendation cho Ghim

- Mọi learner bắt đầu bằng official FSRS-6 default weights.
- Dùng một parameter set **pooled theo learner** cho Recognition và Production trong MVP, nhưng vẫn giữ card state/history riêng. Parameters mô tả pattern tổng quát; state mô tả memory cụ thể. Chỉ split parameters theo direction khi mỗi direction có đủ data và offline evaluation chứng minh tốt hơn.
- Chưa optimize trước **400 scheduler-eligible review events** và đủ cả pass/fail signal; con số 400 là conservative product threshold, không phải giới hạn bắt buộc của thuật toán hiện tại.
- Sau threshold, chạy optimization server-side tối đa mỗi 30 ngày hoặc khi có thêm một lượng history đáng kể; evaluate candidate against current parameters trước khi activate.
- Pin riêng optimizer version. Vì binding là beta, bọc sau job interface, timeouts và fallback về current/default parameters; optimizer failure không được chặn review.
- Đừng train từ preview, manual reschedule, undone/voided event, non-scheduling practice hoặc rating do hệ thống suy đoán.

## 6. Optimize, nâng version và reschedule

### Fact đã kiểm chứng

Anki mặc định **không** reschedule cards khi bật FSRS, đổi desired retention hoặc đổi parameters: lịch mới áp dụng ở review kế tiếp, tránh spike workload. Reschedule ngay có thể khiến lượng lớn cards lập tức due và tạo thêm review entries; manual khuyên dùng sparingly ([Anki reschedule on change](https://docs.ankiweb.net/deck-options)).

`ts-fsrs` cung cấp `reschedule(card, reviews)`, `rollback(card, log)` và history replay helpers ([`ts-fsrs` history helpers](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)). FSRS Helper mô tả reschedule từ toàn bộ history và Advance/Postpone theo cách giảm deviation; chính dự án nói add-on chỉ là bonus và không khuyến nghị extensive use ([official FSRS Helper](https://github.com/open-spaced-repetition/fsrs4anki-helper)).

### Recommendation cho Ghim

- Parameter optimization: activate new set for future answers; không đổi toàn bộ `due_at` mặc định.
- Algorithm major upgrade: replay history in a shadow projection, compare distribution of due dates/workload, rồi canary. Không rewrite immutable events.
- Explicit reschedule là operation riêng có `migration_id`, old/new algorithm+params, initiated reason, preview counts, applied timestamp và rollback metadata.
- Không tạo fake learner rating cho reschedule. Ghi `Schedule Adjustment Event` riêng, excluded khỏi optimizer.
- Nếu đổi fixed learning steps, coi đó là behavior migration; official binding cảnh báo giảm số steps có thể làm retention giảm và model cần lâu để thích nghi ([binding learning-step guidance](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding/README.md)).

## 7. Review log để tái lập và audit

### Fact đã kiểm chứng

`ts-fsrs` card state gồm due, stability, difficulty, scheduled days, learning step, reps, lapses, state và last review. Review log trả về rating, prior state, prior due, stability, difficulty, elapsed days, next scheduled days, learning step và actual review time ([official models](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/models.ts)).

Anki revlog lưu review timestamp, card ID, rating, new/previous interval, answer time và review type; early cram là một type riêng ([Anki revlog documentation](https://docs.ankiweb.net/stats.html), [Anki schema](https://github.com/ankitects/anki/blob/main/rslib/src/storage/schema11.sql)). Official benchmark lọc manual due-date changes và một số non-rescheduling filtered reviews khỏi evaluation, cho thấy scheduler events phải phân biệt user recall với manual operations ([srs-benchmark evaluation](https://github.com/open-spaced-repetition/srs-benchmark)).

### Recommendation cho Ghim

Một immutable `Review Event` nên lưu tối thiểu:

- identity: event ID, learner ID, Memory Track ID, Vocabulary Item ID, Practice Direction, prompt/material version;
- chronology: `shown_at`, `revealed_at`, `answered_at`, response duration, IANA timezone và learner-day key;
- observation: user-selected outcome, canonical FSRS grade, whether answer was revealed first, scheduled vs early/late, event source/device;
- pre-state snapshot: due, last review, state, stability, difficulty, reps, lapses, learning-step index;
- scheduling context: algorithm major, exact library version, parameter-set ID/hash, weights, desired retention, learning/relearning steps, max interval, fuzz enabled and deterministic seed/input if used;
- result: post-state, computed interval, final `due_at`, any load-balancing adjustment;
- audit: created-at, idempotency key, superseded/voided-by event, migration ID; never silently overwrite the original grade.

Store parameter sets and policy versions as immutable referenced records. Persist both the canonical event and current projection. A replay test from ordered non-void Review Events must reproduce state/due within documented rounding/fuzz rules.

## 8. Early review, manual reschedule và undo

### Fact đã kiểm chứng

FSRS is designed to handle reviews done early or late; the project name’s “Free” explicitly refers to users being free to choose review time and the algorithm adapting to it ([Free Spaced Repetition Scheduler README](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)). Anki logs early cram separately, and manual scheduling does not record answer time because it is not a normal review ([Anki review log](https://docs.ankiweb.net/stats.html), [Anki browser manual](https://docs.ankiweb.net/browsing.html)). `ts-fsrs` exposes rollback and replay/reschedule functions ([package README](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)).

### Recommendation cho Ghim

- Normal Daily Review chỉ lấy due items.
- “Practice now” trước hạn là non-scheduling practice by default: không rating, không state mutation, không optimizer input. Điều này giữ UX đơn giản và ngăn luyện để farm XP làm lệch scheduler.
- Nếu sau này có exam/advance mode có scheduling, phải label rõ là early review, truyền actual elapsed time vào FSRS và không cho chọn grade dựa trên interval.
- Manual change due date tạo `Schedule Adjustment Event`; không giả làm Review Event và không update S/D trừ khi một documented replay migration yêu cầu.
- Cho undo câu vừa chấm trong session: transactionally void Review Event, restore exact pre-state hoặc replay từ event trước đó, rollback streak/XP side effects, rồi cho learner trả lời lại. Sau khi sync/thiết bị khác đã tạo dependent events, chuyển sang replay-based correction thay vì stack undo đơn giản.

## 9. Recognition và Production Memory Tracks

### Fact và inference

FSRS schedules a unitary memory represented by a card state/history; its libraries receive a `Card` and its reviews, không có cơ chế gộp hai prompt directions thành một state ([`ts-fsrs` model/API](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/models.ts)). Anki cũng xem forward/backward prompts là sibling cards và có bury/disperse mechanics vì xem gần nhau có thể reminder/interference ([Anki study-order FAQ](https://docs.ankiweb.net/faqs/study-in-a-particular-order.html), [FSRS Helper sibling dispersion](https://github.com/open-spaced-repetition/fsrs4anki-helper)).

Việc Recognition và Production có difficulty/recall khác nhau là **product inference**, không phải claim riêng của FSRS docs.

### Recommendation cho Ghim

- Một Vocabulary Item có tối đa hai Memory Tracks: Recognition default, Production opt-in.
- Mỗi track sở hữu `due_at`, S, D, state, reps, lapses và ordered review events riêng.
- Parameter set ban đầu có thể pooled theo learner để tránh data sparsity; không share card state.
- Không hiển thị hai sibling directions trong cùng một short window nếu một direction vừa reveal answer cho direction kia. Bury direction còn lại đến learner-day tiếp theo hoặc ít nhất một interference window được product test xác nhận.
- Merge duplicate Vocabulary Items không được cộng/average S/D. Giữ track có canonical history, append hoặc archive track còn lại; nếu buộc merge histories, replay ordered events và flag conflict/manual operations.

## 10. Lapses, leeches, backlog và new-card load

### Fact đã kiểm chứng

Anki định nghĩa leech là card liên tục quên; default tag/suspend tại 8 lapses. Khuyến nghị xử lý bằng reformulate, mnemonic, delete/suspend hoặc chờ khi interference giảm ([Anki leeches](https://docs.ankiweb.net/leeches.html)).

Anki mặc định để review limit áp dụng cả new cards. Khi có backlog, manual khuyên dừng new cards đến khi catch up vì thêm cards mới làm backlog xấu hơn. Với FSRS, review-order tương ứng “relative overdueness” là ascending retrievability: item dễ quên nhất trước ([Anki daily limits and order](https://docs.ankiweb.net/deck-options)).

### Recommendation cho Ghim

- `Again` trên Review/Relearning tăng lapse count. At-risk threshold ban đầu: 4 lapses trong rolling window để gợi ý sửa nghĩa/context/prompt; leech threshold: 8 lifetime lapses để pause track và mở repair flow. Đây là product defaults, cần tune bằng data.
- Không auto-delete Vocabulary Item. Pause Memory Track, giữ Learner Data, cho edit/restart/archive.
- Queue priority: due/overdue first, lowest retrievability first; intraday relearning khi due; new items sau cùng.
- Khi có overdue backlog, new-item budget bằng 0 theo mặc định. Cho learner override có friction nhẹ, nhưng không lấy new items để tạo cảm giác “đã hoàn thành”.
- Không hard-cap due reviews theo cách silently bỏ lịch. UI có thể chia thành các session 5–10 phút và cho nghỉ, nhưng vẫn hiển thị số due còn lại.
- “Daily Review complete” chỉ khi không còn due-now/overdue tracks trong phạm vi ngày học. Một intraday relearning chưa đến giờ phải được hiển thị riêng là “quay lại lúc …”, không tính là due-now.
- Streak/XP nên dựa trên honest scheduled study và completion rule, không thưởng `Easy`, số lần press hoặc premature practice.

## 11. Thư viện TypeScript/JavaScript

| Candidate | Trạng thái chính thức | Đánh giá |
|---|---|---|
| `ts-fsrs` | Official Open Spaced Repetition TypeScript scheduler, FSRS-6; ESM/CJS/UMD; Node 20+; active repo; MIT ([repo](https://github.com/open-spaced-repetition/ts-fsrs), [license](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE)) | **Chọn cho scheduling**. API có preview, apply, retrievability, rollback và replay/reschedule. |
| `@open-spaced-repetition/binding` | Official optimizer backed by `fsrs-rs`/napi-rs; Node/WASI; public beta; Node 20+ ([README](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding/README.md)) | **Chọn có điều kiện cho server-side optimization**. Bọc adapter/job; pin version; không để beta API vào domain. |
| `fsrs.js` | Official repo tự khuyên migrate sang `ts-fsrs` vì maintainer không còn đủ thời gian và `ts-fsrs` active hơn ([repo notice](https://github.com/open-spaced-repetition/fsrs.js)) | Không dùng cho code mới. |
| `fsrs-rs` trực tiếp | Official FSRS-6 scheduler+optimizer, production-proven trong Anki ([repo](https://github.com/open-spaced-repetition/fsrs-rs), [Anki dependency](https://github.com/ankitects/anki/blob/main/Cargo.toml)) | Mạnh nếu backend Rust; không cần cho TypeScript MVP ngoài binding. |

Source snapshot của `ts-fsrs` tại ngày kiểm chứng ghi package version `5.4.2`; package version **không phải** algorithm version — code vẫn kiểm tra/migrate tới 21 weights của FSRS-6 ([package manifest](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/package.json), [parameter migration](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/src/default.ts)). Khi implementation, phải pin release thực tế được registry trả về và xác minh lockfile; không copy con số trong research note một cách mù quáng.

## 12. Decision đề xuất cho ticket FSRS

Chốt contract MVP sau:

- **Algorithm:** FSRS-6 qua pinned `ts-fsrs`; adapter nội bộ; FSRS-7 theo dõi như future migration.
- **Ratings:** UI hai nút Quên/Nhớ → Again/Good; response time chỉ dùng analytics, không suy grade.
- **Retention:** hidden default 0.90.
- **Short term:** một relearning step ngắn được prototype; không có chuỗi nhiều learning steps.
- **State ownership:** một state/history độc lập cho mỗi Memory Track; Recognition và Production là siblings.
- **Parameters:** official defaults → per-learner pooled optimization sau ngưỡng conservative 400 eligible events, tối đa monthly; optimizer server-side, fail open về current set.
- **Queue:** due/overdue by ascending retrievability → due intraday relearning → new; pause new on backlog.
- **Special operations:** practice early không schedule; manual reschedule là adjustment; undo voids event and restores/replays.
- **Migration:** new parameters apply prospectively; bulk reschedule only as explicit, previewed, auditable operation.
- **Completion:** daily complete khi không còn due-now/overdue tracks; future same-day step shown separately.
- **Leeches:** repair prompt early, pause at repeated failure; never destroy learner data.

## 13. Câu hỏi cần validate bằng prototype/data

1. Một fixed relearning step `10m` có hợp với session 5–10 phút không, hay Ghim nên dùng session boundary khác?
2. Learner Việt hiểu “Nhớ” đủ nhất quán không, hay cần microcopy “Tự nhớ được trước khi xem đáp án”?
3. Bury Recognition/Production sibling đến ngày sau có làm Production adoption quá chậm không?
4. Threshold 400 eligible events có đạt đủ nhanh cho active learners và candidate parameters có cải thiện calibration không?
5. At-risk/leech thresholds 4/8 có phát hiện material tệ sớm mà không làm learner nản không?
6. “Daily complete” cần snapshot đầu ngày hay dynamic due-now semantics để streak vừa trung thực vừa dễ hiểu?

Các câu này nên được trả lời bằng prototype/replay simulation và product testing, không bằng sửa công thức FSRS.
