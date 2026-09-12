# Tech stack đề xuất cho Ghim

> Trạng thái: research note — facts và recommendations được tách rõ
>
> Kiểm chứng lần cuối: 2026-09-11
>
> Phạm vi: greenfield web app, browser extension, FSRS-6, AI enrichment, background jobs và production operations

Các claim có link trực tiếp là **fact đã kiểm chứng** từ tài liệu, source code, pricing page hoặc repository chính thức tại ngày trên. Các đoạn ghi **recommendation** là lựa chọn cho Ghim dựa trên facts và constraints của sản phẩm. Giá/quota có thể đổi; phải kiểm tra lại trước khi mua hoặc launch.

## Kết luận

Ghim nên bắt đầu bằng một **TypeScript modular monolith trong npm-workspaces monorepo**, không tách microservice:

| Layer | Lựa chọn MVP |
|---|---|
| Runtime/workspace | Node.js 24 LTS, TypeScript strict, npm workspaces, Turborepo local cache |
| Web | Next.js 16 App Router, React 19, Node runtime |
| Extension | WXT + React, Chrome/Edge MV3 trước; Firefox sau |
| UI | Tailwind CSS 4, stock shadcn/ui `base-nova` trên Base UI, Lucide; Ghim semantic color palette; native React forms + Zod trước |
| API | Hono đặt trong Next.js, REST `/api/v1`, Zod request/response schemas, Hono typed client |
| Data/auth/storage | Supabase managed Postgres + Google-only Auth + Storage, Singapore region nếu available |
| SQL/migrations | Supabase CLI SQL migrations là source of truth; generated DB types + `supabase-js`; atomic mutations qua SQL functions |
| Jobs | Inngest cho AI enrichment/optimizer; transactional outbox trong Postgres; không để provider event là source of truth |
| Cache/limits | Không Redis lúc đầu; quotas/idempotency trong Postgres. Thêm Upstash Redis khi traffic chứng minh cần distributed rate limiting/cache |
| AI | Vercel AI SDK provider registry + internal `EnrichmentProvider`; model/prompt/schema versioned |
| Scheduler | Pinned `ts-fsrs` sau internal adapter; server authoritative; immutable events + rebuildable projection |
| Test | Vitest, Testing Library có chọn lọc, Playwright; pgTAP/Supabase DB tests |
| Analytics/ops | PostHog + Sentry free tiers trước, explicit/redacted telemetry, structured server logs; tuyệt đối không gửi captured text |
| Deploy/CI | Vercel Hobby chỉ cho development/non-commercial; Supabase Free, Inngest Hobby và GitHub Actions; extension artifacts từ CI |

Mục tiêu là **free-first, không free-at-all-costs**: bắt đầu ở free tier của Supabase, Inngest, PostHog và Sentry; dùng Vercel Hobby chỉ trong giai đoạn personal/non-commercial. Upgrade khi quota, reliability, backup/RPO hoặc Terms of Service (ToS) trở thành constraint thật, không nâng cấp chỉ để “production-looking”. PostHog/Sentry là telemetry có thể tắt, không nằm trên critical path. Extension là static artifact. Không có Redis, dedicated API server, worker fleet, message broker hay Kubernetes.

## 1. Kiến trúc tổng thể và repository

### Fact đã kiểm chứng

Node khuyên production chỉ dùng Active hoặc Maintenance LTS. Tại ngày kiểm chứng, Node 24 “Krypton” là LTS; Node 26 vẫn Current và Node 20 đã EOL ([Node release schedule](https://nodejs.org/en/about/previous-releases)). Next.js 16 yêu cầu tối thiểu Node 20.9; Vitest hiện yêu cầu Node 22.12+ ([Next.js install](https://nextjs.org/docs/app/getting-started/installation), [Vitest guide](https://vitest.dev/guide/)). `ts-fsrs` yêu cầu Node 20+ ([official repository](https://github.com/open-spaced-repetition/ts-fsrs)). Node 24 vì vậy nằm trong intersection được support.

npm workspaces quản lý nhiều local packages từ một root `package.json`, tự liên kết workspaces khi `npm install`, dùng một root `package-lock.json`, và các lệnh install/ci hỗ trợ workspace selection ([npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/)). Turborepo đọc workspace graph từ package manager/lockfile, xây task graph, chạy task độc lập song song và cache output theo inputs/lockfile ([package/task graph](https://turborepo.dev/docs/core-concepts/package-and-task-graph), [task configuration](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks), [caching](https://turborepo.dev/docs/crafting-your-repository/caching)). Remote cache là optional; local cache hoạt động không cần Vercel.

### Recommendation cho Ghim

- Pin Node 24 bằng `.nvmrc` hoặc `.node-version`, `engines.node`, và CI; pin npm version bằng `packageManager` trong root `package.json`; commit root `package-lock.json` và dùng `npm ci` trong CI.
- Dùng TypeScript `strict`, `noUncheckedIndexedAccess` và `exactOptionalPropertyTypes` cho packages domain/API.
- Dùng **npm workspaces** ngay từ đầu vì web và extension chắc chắn cần chia sẻ domain, UI tokens và API schemas. Đây là quyết định product/team đã chốt; npm đi kèm Node và giảm một bootstrap dependency.
- Dùng Turborepo chỉ làm task runner/cache. Không bật remote cache trước khi CI đủ chậm để đáng cấu hình.
- Không chọn pnpm/Yarn/Bun làm package manager ở MVP. npm workspaces đáp ứng graph hiện tại; đổi package manager chỉ khi đo được install/storage/CI bottleneck. Không chọn Bun làm production runtime: Node 24 là compatibility baseline chung của Next.js, Vitest, `ts-fsrs`, Sentry và optimizer binding.
- Không tách backend thành app riêng. Hono API, web pages và Inngest serve endpoint cùng nằm trong `apps/web`; tách deployable chỉ khi scaling/security profile khác thật sự xuất hiện.

Cấu trúc đề xuất:

```text
apps/
  web/                  # Next.js pages, Hono API adapter, Inngest endpoint
  extension/            # WXT React extension
packages/
  domain/               # vocabulary, capture, review policies; pure TypeScript
  scheduler/            # internal port + ts-fsrs adapter
  api/                  # Zod contracts, Hono AppType/client, DTOs
  ui/                   # tokens and reusable primitives, no product workflows
  data/                 # generated DB types and server repositories
  observability/        # typed events and redaction policy
supabase/
  migrations/           # only authoritative schema history
  seed.sql
```

`packages/domain` và `packages/scheduler` không import Next, Hono, Supabase, Inngest hay browser APIs. Đây là seam quan trọng hơn việc tạo nhiều services.

## 2. Web framework

### Fact đã kiểm chứng

Next.js 16 App Router là current documented line, dùng React 19, Turbopack stable mặc định cho development/build, và hỗ trợ full Node server deployment hoặc Docker ([Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [deployment options](https://nextjs.org/docs/app/getting-started/deploying)). Một Node.js server chạy đầy đủ Next features; framework không bắt buộc Vercel ([platform deployment guide](https://nextjs.org/docs/app/guides/deploying-to-platforms)). Route Handlers dùng standard `Request`/`Response` và hỗ trợ đủ HTTP verbs ([Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)).

### Recommendation cho Ghim

- Chọn **Next.js 16 App Router** cho marketing pages, auth, dashboard, decks, Daily Review và progress.
- Dùng Server Components cho initial reads và public/mostly-static pages; Client Components chỉ cho review interaction, heatmap/tooltips và optimistic UI.
- Dùng Node runtime, không Edge runtime, cho DB access, `ts-fsrs`, optimizer bindings và AI jobs. Điều này giữ một runtime model và tránh giới hạn package/runtime.
- Dùng Server Actions cho web-only form convenience nếu phù hợp, nhưng không coi chúng là domain/API contract. Extension luôn đi qua versioned Hono HTTP API.
- Tự host/Docker vẫn là exit path. Tránh phụ thuộc Vercel-only KV, workflow, auth hay database trong domain code.

Không chọn SPA Vite thuần vì Ghim cần public acquisition pages, auth SSR và backend endpoints. Không chọn full Nest/Fastify service ở MVP vì tạo thêm deployable, auth boundary và duplicated composition root mà chưa có tải chứng minh.

## 3. Browser extension

### Fact đã kiểm chứng

WXT 0.21.4 là current release tại ngày kiểm chứng. Nó build Chrome, Firefox, Edge, Safari/Chromium targets từ một codebase, sinh manifest, hỗ trợ MV2/MV3, file-based entrypoints, HMR, ZIP và Firefox source ZIP ([WXT home](https://wxt.dev/), [target browsers](https://wxt.dev/guide/essentials/target-different-browsers.html), [publishing](https://wxt.dev/guide/essentials/publishing.html)). WXT thống nhất promise-style extension API qua `browser`, nhưng docs cảnh báo phải feature-detect vì type definitions giả định API tồn tại ([extension APIs](https://wxt.dev/guide/essentials/extension-apis)). Safari vẫn cần Xcode wrapper và WXT chưa tự động publish Safari.

Plasmo vẫn tự mô tả là alpha; WXT comparison ghi maintenance của Plasmo/CRXJS chỉ partial, trong khi WXT maintained và tạo đúng Firefox source ZIP ([Plasmo repository](https://github.com/PlasmoHQ/plasmo), [WXT comparison](https://wxt.dev/guide/resources/compare)). Đây là statement từ WXT nên được xem là first-party comparison, không phải neutral benchmark.

Chrome `identity.launchWebAuthFlow()` hỗ trợ non-Google identity providers và redirect về `https://<extension-id>.chromiumapp.org/*`; flow interactive nên bắt đầu từ explicit user action ([Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity)). Supabase có hướng dẫn Google sign-in riêng cho Chrome extensions ([Supabase Google auth](https://supabase.com/docs/guides/auth/social-login/auth-google)).

### Recommendation cho Ghim

- Chọn **WXT + React**, ship Chrome/Edge MV3 trước. Firefox là target thứ hai sau khi capture/auth E2E ổn; Safari ngoài MVP.
- MVP interaction: context-menu và selection-triggered compact UI; không inject permanent toolbar vào mọi trang.
- Content script chỉ đọc selected text, nearby sentence, URL/title và gửi message. Authentication token, retry queue và network calls ở background service worker; page JS không bao giờ thấy token.
- Xin permissions tối thiểu: `contextMenus`, `storage`, `identity` khi auth cần, và exact API `host_permissions`. Dùng `activeTab`/user gesture trước broad `<all_urls>` nếu product behavior cho phép.
- Dùng WXT storage wrapper cho local outbox. Mỗi capture có client-generated UUID/idempotency key; offline captures retry an toàn.
- Không nhúng remote code, AI keys, dictionary keys hoặc service-role credentials. Extension chỉ gọi Ghim API.
- Auth: user bấm “Đăng nhập”, extension mở PKCE/OAuth flow; background lưu/refresh Supabase session trong extension-local storage. Server API xác minh bearer access token. Dev/prod extension IDs và redirect URLs phải được cấu hình riêng.

Không chọn raw Vite + hand-written manifests vì cross-browser build/publish/test glue là phần dễ hỏng nhưng không tạo product value. Plasmo không được chọn vì alpha disclaimer và maintenance signal yếu hơn WXT.

## 4. UI foundation, component system, icons và forms

### Fact đã kiểm chứng

Tailwind 4 chuyển sang CSS-first configuration, automatic content detection và modern CSS features; 4.3 là current documented release line tại ngày kiểm chứng ([Tailwind 4.0](https://tailwindcss.com/blog/tailwindcss-v4), [Tailwind 4.3](https://tailwindcss.com/blog/tailwindcss-v4-3)).

Từ tháng 7/2026, shadcn/ui dùng **Base UI làm default cho new projects**, vẫn support Radix. shadcn không phải black-box package: CLI đưa component source vào codebase để team sở hữu và sửa ([shadcn Base UI announcement](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default), [registry model](https://ui.shadcn.com/docs/registry/examples)). Base UI stable từ 1.0 tháng 12/2025, current 1.8.0, unstyled, MIT, React 17+, compatible với Vite/webpack/Turbopack và tập trung WAI-ARIA/accessibility ([about](https://base-ui.com/react/overview/about), [releases](https://base-ui.com/react/overview/releases), [quick start](https://base-ui.com/react/overview/quick-start)). Radix vẫn mature và supported, nhưng Base UI hiện được active full-time team và có Combobox/Autocomplete sâu hơn ([Base UI comparison](https://base-ui.com/)).

Lucide có tree-shakable icon packages và ISC/MIT-compatible source license; dynamic import toàn icon set làm bundle lớn nên nên import icon tĩnh ([Lucide overview](https://github.com/lucide-icons/lucide/blob/main/docs/index.md), [license](https://github.com/lucide-icons/lucide/blob/main/LICENSE)). Zod 4 stable, zero dependencies, chạy Node và modern browsers, có static inference/JSON Schema và yêu cầu TypeScript strict ([Zod](https://zod.dev/)). React 19 hỗ trợ native form actions, pending state và optimistic updates ([React form](https://react.dev/reference/react-dom/components/form)).

### Recommendation cho Ghim

- Chọn **Tailwind CSS 4 + shadcn/ui Base UI**. Pin base trong `components.json`; không trộn Radix/Base UI tùy hứng.
- `packages/ui` chứa semantic design tokens và primitives dùng chung. Web/extension có composition riêng vì density và surface khác nhau; không ép cùng page layout.
- Visual direction dùng **stock shadcn `base-nova` + Ghim colors**: giữ nguyên typography, spacing, radius, shadows, motion và variants do registry sinh ra; chỉ đổi semantic colors sang forest green, cream và muted mustard/rust.
- Mã hóa palette bằng semantic tokens (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `border`, `ring`), không rải raw colors hay override class bên trong từng component.
- Bắt đầu với typography, spacing, color, radius, elevation, texture và motion tokens; heatmap/badge assets là brand components riêng, không phụ thuộc component library. Heatmap không chỉ dựa vào hue và badges phải vẫn rõ ở grayscale/locked state.
- Dùng Lucide, static named imports; custom SVG cho Ghim mark, badge/rank và domain-specific illustrations.
- Forms đơn giản dùng native `<form>`/uncontrolled inputs + Zod ở boundary. Chỉ thêm React Hook Form khi deck editor hoặc onboarding có dynamic arrays/conditional fields đủ phức tạp; không cài theo quán tính.
- TanStack Query chỉ dùng trong extension và client-heavy surfaces cần retry/cache/optimistic sync. Server-rendered web reads không cần bị bọc toàn bộ trong client query cache.
- Không thêm Redux/Zustand ở MVP; state review session là local state machine, server data là server/query state.
- Accessibility gate: full keyboard review flow, visible focus, screen-reader labels, `prefers-reduced-motion`, color-independent heatmap legend và Vietnamese copy review.

Không chọn Material UI/Ant Design vì visual opinion/bundle và override surface lớn. Dùng nguyên source component shadcn; product UX đến từ composition và information hierarchy thay vì restyle primitives.

## 5. Database, auth và object storage

### Fact đã kiểm chứng

Mỗi Supabase project là full Postgres, không phải proprietary database abstraction; Auth, Storage, Realtime và Edge Functions được xây quanh nó. Paid plans có daily backups; PITR là add-on ([database overview](https://supabase.com/docs/guides/database/overview), [backups](https://supabase.com/docs/guides/platform/backups)). Supabase Auth phát JWT và tích hợp với Postgres RLS ([Auth](https://supabase.com/docs/guides/auth)). Storage dùng Postgres metadata/RLS; object operations phải qua Storage API, không sửa trực tiếp schema metadata ([Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [storage schema](https://supabase.com/docs/guides/storage/schema/design)).

Tại ngày kiểm chứng, Supabase Free gồm 500 MB DB, 50k MAU, 1 GB storage và pause sau một tuần inactive; Pro bắt đầu $25/tháng, gồm một Micro project, 8 GB DB, 250 GB egress và 7-day daily backups. PITR bắt đầu thêm $100/tháng ([official pricing](https://supabase.com/pricing)). Free không có automatic backups; Supabase khuyên tự `db dump` off-site ([backup docs](https://supabase.com/docs/guides/platform/backups)).

RLS là defense-in-depth nhưng grants và policies đều phải đúng; service role bypass RLS và không bao giờ được đưa ra frontend ([RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [secure data](https://supabase.com/docs/guides/database/secure-data)).

### Recommendation cho Ghim

- Chọn **Supabase managed Postgres + Auth + Storage** cho MVP. Chọn region gần Việt Nam và đặt Vercel compute cùng region; verify Singapore availability khi provision.
- MVP dùng **Google-only sign-in** trên web và extension; chỉ bật Google provider trong Supabase Auth. Không expose email/password, magic link/OTP hay provider khác trong UI. Điều này tránh password reset/account-security surface và giữ onboarding đồng nhất.
- Chỉ xin ba OAuth scopes cơ bản mà Supabase yêu cầu (`openid`, email, profile); không xin quyền Google Drive/Gmail. Cấu hình OAuth clients/redirect URLs riêng cho local web, production web và Chrome extension; chuẩn bị consent-screen branding/custom auth domain trước public launch nếu conversion/trust yêu cầu.
- App/extension chỉ gọi Ghim API cho learner mutations. RLS vẫn bật trên mọi learner table và Storage bucket như defense-in-depth; không coi server-only API là lý do bỏ RLS.
- Lưu database normalized: vocabulary items, encounters, learning materials, deck memberships, memory tracks, immutable review events, scheduler policy/parameter sets, job/outbox rows.
- Audio/generated assets trong Supabase Storage; attribution/license/provenance ở Postgres. Captured sentences mặc định private.
- Dùng private buckets cho learner content và signed URLs có reuse TTL hợp lý. Supabase lưu ý tạo signed URL mới mỗi request làm CDN cache luôn lạnh ([Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)).
- Bắt đầu **Supabase Free**, kể cả private beta, với scheduled `db dump` lưu off-site và restore drill. Free không có automatic backups và có thể pause vì inactivity.
- Upgrade Supabase khi một trong các trigger xảy ra: tiến gần quota; pause/reliability không còn chấp nhận được; cần email support/branching; hoặc dữ liệu active learners khiến manual dump không đáp ứng RPO/RTO. Thực tế, public beta có dữ liệu không thể tái tạo thường là backup trigger để lên Pro. PITR chỉ mua khi RPO/RTO và revenue biện minh.

Neon + separate auth + S3/R2 có thể giảm bundling lock-in từng phần nhưng tăng vendor count và auth/storage policy integration. Firebase bị loại vì core data/event/replay workload hợp relational transactions và Postgres portability hơn document database.

## 6. SQL access, migrations và transactional invariants

### Fact đã kiểm chứng

Supabase CLI giữ `supabase/migrations` và seed trong version control, replay bằng `db reset`, deploy bằng `db push`, và generate TypeScript types từ schema thật ([local workflow](https://supabase.com/docs/guides/local-development/cli-workflows), [database migrations](https://supabase.com/docs/guides/local-development/database-migrations), [generated types](https://supabase.com/docs/reference/javascript/typescript-support)). Official workflow nhấn mạnh chọn một schema-change approach; không duy trì hai representations cạnh tranh.

Drizzle là SQL-like typed ORM, nhưng current quick-start docs đang hướng package `@rc` trong quá trình v1 transition ([overview](https://orm.drizzle.team/docs/overview), [quick start](https://orm.drizzle.team/docs/quick)). Điều này không làm Drizzle unusable, nhưng tạo migration risk không cần thiết cho MVP có nhiều RLS/functions/triggers.

### Recommendation cho Ghim

- **SQL migrations trong `supabase/migrations` là source of truth duy nhất.** Mọi migration được review, replay local từ zero và test trước production.
- Dùng `supabase-js` với generated `Database` types cho reads/simple writes. CI regenerate types từ local schema và fail nếu diff.
- Dùng Postgres functions/RPC cho atomic business mutations: `record_review`, `undo_review`, `reserve_enrichment_quota`, `claim_outbox_job`. Function phải validate learner ownership, expected projection version và idempotency key.
- `record_review` transactionally insert immutable Review Event, update Memory Track projection với compare-and-swap version, và insert motivation ledger/outbox effects. Unique `(learner_id, idempotency_key)` chống double-submit.
- DB role của API là least privilege. Service role chỉ ở server/job environment; log và telemetry không bao giờ chứa key/token.
- Không thêm ORM ban đầu. Reassess Drizzle stable hoặc Kysely khi query surface lớn lên; một adapter `packages/data` ngăn domain phụ thuộc `supabase-js`.
- Dùng DB constraints cho invariants (direction enum/check, nonnegative counts, unique active item sense, append-only events), không chỉ Zod.

Điểm chấp nhận có chủ đích: một số transaction orchestration nằm trong SQL function. Đây là ít moving parts hơn direct driver/ORM pool ở serverless và tạo atomic boundary rõ; pure FSRS calculation vẫn nằm ở TypeScript, không port công thức sang SQL.

## 7. API contract giữa web và extension

### Fact đã kiểm chứng

Hono chạy trong Next.js Node runtime trên Vercel bằng catch-all Route Handler ([Hono Next.js](https://hono.dev/docs/getting-started/nextjs)). Hono RPC export server route type cho typed client; docs yêu cầu TypeScript strict và khuyên monorepo compile client type riêng để IDE nhanh hơn ([Hono RPC](https://hono.dev/docs/guides/rpc)). `@hono/zod-openapi` có thể validate request/response và generate OpenAPI ([Zod OpenAPI](https://hono.dev/examples/zod-openapi)).

### Recommendation cho Ghim

- Đặt Hono dưới `/api/v1`; extension và client-heavy web code dùng generated/precompiled Hono client từ `packages/api`.
- Zod schema định nghĩa request **và response**. Không export database rows; map thành stable DTO có camelCase, ISO timestamps và explicit nullable/optional semantics.
- Duy trì machine-readable OpenAPI endpoint/artifact để debugging và future clients, dù internal TypeScript client dùng Hono types.
- Auth bằng `Authorization: Bearer <Supabase access JWT>` cho extension. Web có thể dùng session cookie nhưng route middleware normalize thành cùng `Actor` context.
- CORS allowlist exact web origins và production/dev extension origins; không `*` cho authenticated API.
- Capture contract: `POST /api/v1/captures` nhận selected text, context, source metadata, deck target và idempotency key; trả `202` với `captureId`, item status và polling URL. Enrichment không giữ HTTP request mở.
- Review contract: client gửi track ID, expected projection version, learner outcome, timestamps và idempotency key. Server load current state, chạy pinned scheduler và commit event/projection atomically. Client không gửi authoritative interval/due date.
- Error envelope ổn định: `code`, Vietnamese-safe `message`, `retryable`, `requestId`, optional field errors. Version semantic behavior bằng route major; additive fields không cần new major.

Không chọn tRPC-only contract: nó tốt cho TypeScript app nhưng OpenAPI/HTTP semantics và independent extension releases dễ quản lý hơn với explicit REST. Hono RPC vẫn cho monorepo type safety mà wire format không proprietary.

## 8. Background jobs và queue

### Fact đã kiểm chứng

Inngest functions chạy TypeScript trên own compute nhưng orchestration/state/retries do service quản lý; successful steps được persisted và không chạy lại khi later step retry ([execution model](https://www.inngest.com/docs/learn/how-functions-are-executed), [Next.js quick start](https://www.inngest.com/docs/getting-started/nextjs-quick-start)). Default là 4 retries sau initial attempt; docs vẫn yêu cầu side effects idempotent. Event ID dedupe chỉ có window 24 giờ ([retries](https://www.inngest.com/docs/guides/error-handling), [idempotency](https://www.inngest.com/docs/guides/handling-idempotency)).

Hobby hiện $0 với 50k executions/tháng và 5 concurrent steps; một run cộng từng `step.run()` vào execution count. Khi vượt quota Hobby, execution pause; Pro bắt đầu $99/tháng ([Inngest pricing](https://www.inngest.com/pricing)).

Supabase Queues là Postgres-native durable pull queue trên `pgmq`, nhưng cần consumer chủ động poll; queue mặc định FIFO và không có priority ([Queues](https://supabase.com/docs/guides/queues), [quick start](https://supabase.com/docs/guides/queues/quickstart)). Supabase Edge background tasks vẫn bị 150s Free/400s paid wall-clock và 2s active CPU; docs bảo heavy jobs dùng background workers ([background tasks](https://supabase.com/docs/guides/functions/background-tasks), [CPU limits](https://supabase.com/docs/guides/troubleshooting/edge-function-cpu-limits)).

### Recommendation cho Ghim

- Chọn **Inngest** cho enrichment pipeline, retries/provider fallback, TTS/material generation và monthly FSRS optimizer.
- Dùng **transactional outbox table trong Postgres**. API transaction ghi domain row + outbox row; dispatcher gửi Inngest event. Job result/upsert dùng stable domain job ID, không dựa riêng vào Inngest 24h dedupe.
- Mỗi enrichment là ít step lớn, bounded: normalize/lookup → generate → validate → persist. Không tạo one-step-per-field làm quota execution phình.
- Job payload chỉ có IDs/version, không có full captured sentence nếu có thể; worker load private content từ DB. Configure concurrency/rate limits theo provider.
- Persist job state/cost/attempt/provider/model/prompt/schema version trong Postgres để UX polling và audit không phụ thuộc 24h trace retention của Inngest Free.
- Bắt đầu **Inngest Hobby** và alert ở 70%/90% của execution/concurrency quota. Upgrade khi projected usage sẽ làm jobs bị pause, backlog/latency ảnh hưởng learner, hoặc cần throughput/trace retention/support của paid tier. Nếu mức nhảy lên Pro không hợp unit economics, adapter `JobDispatcher` cho phép chuyển sang Supabase Queues + dedicated worker mà không đổi domain/event schema.

Không dùng `waitUntil()` fire-and-forget làm durable job. Không dùng only database trigger → external HTTP mà thiếu outbox visibility/idempotency.

## 9. Cache, rate limiting và quota accounting

### Fact đã kiểm chứng

Upstash cung cấp connectionless HTTP Redis/rate-limit SDK cho serverless/Next.js và sliding/fixed/token bucket algorithms ([rate-limit overview](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)). Tại ngày kiểm chứng, Free có 256 MB, 500k commands/tháng; pay-as-you-go là $0.20/100k commands, và production HA/SLA pack thêm $200/database/tháng ([pricing](https://upstash.com/pricing/redis)).

### Recommendation cho Ghim

- Không provision Redis ngày đầu.
- Source-of-truth limits như monthly Successful Enrichment phải là transactional Postgres ledger/reservation, không cache counter. Reservation xảy ra trước enqueue; success/failure settles quota theo product policy.
- Basic abuse protection dùng per-user/IP buckets trong Postgres cho low volume, cộng Vercel/platform protection; cache dictionary reference data bằng Next/process cache hoặc CDN where safe.
- Thêm Upstash Redis khi một trong các signal xuất hiện: Postgres limiter contention, high anonymous traffic, repeated hot reads, hoặc multi-instance cache correctness cần thiết.
- Khi thêm, Redis chỉ giữ ephemeral deny windows/cache; DB vẫn authoritative cho billing/free-core entitlement. Chọn fail-open cho ordinary reads, fail-closed/DB-check cho expensive AI endpoint.
- Tách `RateLimiter` và `Cache` interfaces để local memory, Postgres và Upstash implementations thay nhau được.

## 10. AI provider seam và cost control

### Fact đã kiểm chứng

Vercel AI SDK định nghĩa standardized language-model interface, official providers và provider registry để mix/swap OpenAI, Anthropic, Google, Bedrock và các provider khác ([providers/models](https://ai-sdk.dev/docs/foundations/providers-and-models), [provider management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management)). Core API hỗ trợ structured outputs validated bằng schema và trả usage/provider metadata ([AI SDK Core](https://ai-sdk.dev/docs/reference/ai-sdk-core), [Output](https://ai-sdk.dev/docs/reference/ai-sdk-core/output)). AI SDK 6 có documented migration guide, nên exact major phải được pin ([6.0 migration](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)).

### Recommendation cho Ghim

- Dùng **AI SDK 6 Core** sau internal `EnrichmentProvider`; không dùng AI Gateway lúc đầu. Direct provider adapter giữ pricing/failure rõ và bớt một vendor hop.
- Contract không phải “generate text” chung chung. Nó trả `EnrichmentCandidate` Zod schema: sense, contextual Vietnamese meaning, confidence/ambiguity flags, examples, forms và provenance.
- Model selection là config alias (`enrichment.fast`, `enrichment.quality`), không hard-code provider model IDs xuyên codebase.
- Version immutable: prompt template, schema, grounding dataset, provider, model, parameters và app release. Cache key dựa trên normalized lexical evidence + context hash + versions, không chỉ word string.
- Pipeline lookup deterministic dictionary/OEWN trước, LLM chỉ synthesize/translate grounded evidence. Validate schema, length, language, profanity/safety và unsupported claims trước `Needs Confirmation`/`Ready`.
- Record token/usage/cost estimate per job. Enforce monthly quota at request reservation and provider concurrency at worker.
- Provider fallback chỉ dùng nếu output semantics tương đương và version/provenance ghi đúng; không silently mix output trong cùng candidate.
- Captured user text chỉ gửi phần context tối thiểu cần thiết; không dùng cho provider training nếu contract/settings không đảm bảo và phải disclose trong privacy policy.

Không tự gọi nhiều provider SDK trực tiếp trong handlers. Không dùng gateway/router trước khi có multi-provider operational need; AI SDK registry đã đủ seam ở MVP.

## 11. Scheduler integration

### Fact đã kiểm chứng

Official implementation list ghi `ts-fsrs` là TypeScript **FSRS-6 scheduler**; package hỗ trợ ESM/CJS/UMD, Node 20+, preview/apply, rollback và reschedule ([official implementation list](https://github.com/open-spaced-repetition/awesome-fsrs), [`ts-fsrs` README](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)). Legacy `fsrs.js` chính thức khuyên migrate sang `ts-fsrs` vì maintenance/features tốt hơn ([fsrs.js notice](https://github.com/open-spaced-repetition/fsrs.js/)).

### Recommendation cho Ghim

- Pin exact `ts-fsrs` release trong lockfile và wrap bằng `Scheduler` port. Package version khác algorithm major; persist cả hai.
- Scheduler chạy server-authoritative trong review command. Extension/web có thể preview locally cho instant UI nhưng kết quả server mới được commit.
- Mỗi Memory Track giữ state riêng; immutable Review Event là source of truth, Memory Track row là projection rebuildable.
- Persist algorithm/config/parameter-set IDs, pre/post state, rating, actual timestamps và idempotency. Undo voids/corrects event và replay/restore projection.
- Golden fixtures bao gồm new, learning, lapse, same-day, overdue, timezone/DST, duplicate submit, undo và Recognition/Production siblings.
- Optimizer package là separate background adapter, không import vào interactive review path. Optimization failure giữ current parameters.

Chi tiết policy đã được nghiên cứu riêng trong [`docs/research/fsrs-scheduling.md`](./fsrs-scheduling.md); tech stack không thay đổi các quyết định two-button, 0.90 retention hay review-event semantics đó.

## 12. Testing strategy

### Fact đã kiểm chứng

Vitest hỗ trợ TypeScript/ESM, watch, coverage và browser mode; current line yêu cầu Node 22.12+ ([guide](https://vitest.dev/guide/), [features](https://vitest.dev/guide/features)). Testing Library khuyến khích test qua DOM/accessible queries thay vì implementation details ([React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)). Playwright chạy Chromium, Firefox và WebKit, có isolation/parallelization/traces ([Playwright intro](https://playwright.dev/docs/intro)). WXT chỉ rõ Playwright là lựa chọn thực tế cho Chrome-extension E2E và cung cấp fake browser/storage utilities cho unit tests ([WXT E2E](https://wxt.dev/guide/essentials/e2e-testing), [WXT unit testing](https://wxt.dev/guide/essentials/unit-testing)).

### Recommendation cho Ghim

- **Vitest Node:** pure domain, scheduler adapter golden histories, API schemas, enrichment validation, quota rules.
- **Vitest Browser/Testing Library:** component behavior chỉ nơi focus/keyboard/DOM matters; tránh snapshot markup lớn.
- **Postgres/pgTAP through Supabase CLI:** RLS, grants, append-only triggers, RPC atomicity, idempotency và migration replay.
- **Playwright web:** auth smoke, capture/manual add, review Quên/Nhớ, relearning display, undo, offline/retry states, heatmap/streak integrity.
- **Playwright extension Chromium:** selection → content message → background auth/API → confirmation; offline outbox; minimal permissions. Firefox extension auth/capture có manual release smoke cho đến khi automation support đủ tin cậy.
- **Contract tests:** extension built against `packages/api`; CI compares/generated OpenAPI artifact và fails on uncommitted changes.
- Không mock `ts-fsrs` trong domain integration tests; pin fixtures to implementation/config version. AI provider được fake bằng recorded schema-safe fixtures, không gọi paid API trong ordinary CI.

PR gate tối thiểu: format/lint, typecheck, unit, DB reset/tests, production builds cho web+extension. Playwright critical path chạy trên PR; broader cross-browser/nightly suite có thể tách nếu chậm.

## 13. Analytics, observability và privacy

### Fact đã kiểm chứng

PostHog hiện cung cấp product analytics free tier 1M events/tháng và EU/US cloud selection; pricing sau free tier là usage-based ([official product/pricing page](https://posthog.com/)). Session replay là một product riêng và có sampling/trigger controls ([recording controls](https://github.com/PostHog/posthog.com/blob/master/contents/docs/session-replay/how-to-control-which-sessions-you-record.mdx)). Sentry có free Developer plan và paid plans; quota/retention cụ thể phải kiểm tra lại khi provision ([official pricing](https://sentry.io/pricing/)). Official Next.js SDK auto-captures unhandled errors/performance và current package supports Next 13.2+ ([official npm package](https://www.npmjs.com/package/@sentry/nextjs)). Sentry supports data scrubbing/sensitive fields and source-map upload ([project scrubbing API](https://docs.sentry.io/api/projects/update-a-project/), [source maps](https://docs.sentry.io/platforms/javascript/guides/hono/sourcemaps/troubleshooting_js)).

### Recommendation cho Ghim

- PostHog: explicit typed events only. Disable autocapture and session replay initially, especially trong extension/review/editor. Event payload chỉ có stable IDs, state/category, counts, latency buckets và experiment variant—không word, sentence, translation, URL query/title hoặc deck name.
- Bắt đầu PostHog free; upgrade chỉ khi product-event quota/retention/collaboration thực sự thiếu. Trước khi trả phí, giảm noisy events và sampling nơi không ảnh hưởng product decisions.
- Chọn EU cloud nếu latency/data policy acceptable; document DPA/region before public launch.
- Sentry cho web/API và extension, projects/releases riêng; upload source maps, tag app/version/browser/job ID. `beforeSend` redact Authorization, cookies, captured text, AI prompt/output và page URL details.
- Bắt đầu Sentry free; upgrade khi dropped events/retention cản trở incident response, hoặc production cần alerts/team controls/support đáng tin cậy hơn. Sampling là cost control; security/privacy redaction không được nới để tiết kiệm quota.
- Structured JSON logs có request/job IDs; no full payload. Metrics đầu tiên: capture success/latency, enrichment success/cost, due queue size, review command conflicts, job retry/failure, API error/latency.
- Inngest dashboard dùng cho job trace ngắn hạn; Postgres job rows là durable operational record.
- Health endpoints kiểm tra process, không expose dependency secrets. Alerts cho enrichment failure rate, exhausted queue, review commit errors và quota anomalies.

Không gửi Learner Data sang analytics để “debug tiện”. Session replay chỉ được cân nhắc sau consent/privacy design và masking tests; captured text surfaces nên mặc định excluded hoàn toàn.

## 14. Deployment và CI/CD

### Fact đã kiểm chứng

Vercel Git integration tự deploy mỗi push/PR thành preview và deploy production branch, có rollback theo deployment ([Git deployments](https://vercel.com/docs/git), [GitHub integration](https://vercel.com/docs/git/vercel-for-github)). Next.js vẫn portable sang Node/Docker ([Next deployment](https://nextjs.org/docs/app/getting-started/deploying)). Vercel Hobby là personal/non-commercial; Terms và Fair Use nói commercial usage phải dùng Pro hoặc Enterprise ([Hobby plan](https://vercel.com/docs/plans/hobby), [Terms of Service](https://vercel.com/legal/terms), [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines)). GitHub Actions miễn phí trên standard runners cho public repositories; private repositories có included quota theo plan ([Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage)). GitHub khuyên `setup-node` để runtime nhất quán; official Node CI flow dùng `npm ci` khi có lockfile ([Node CI guide](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)).

### Recommendation cho Ghim

- Web/API: dùng Vercel Hobby cho local/personal prototype và non-commercial validation, Node runtime, region gần Supabase. Preview per PR; production chỉ từ protected `main` sau required CI.
- Database: migrations apply bằng explicit protected deploy job sau test + `db push --dry-run`; không cho mỗi preview mutate shared production DB. Ban đầu có local/test + production projects; thêm dedicated staging khi team/release cadence cần.
- Jobs: Inngest environments/keys tách preview và production; preview events không được invoke production functions.
- Extension: GitHub Actions build deterministic WXT ZIP/source ZIP, upload artifacts; store publishing manual ở MVP. Sau khi stable mới dùng store publish APIs với protected secrets/approval.
- CI pin action SHAs hoặc trusted majors, minimal permissions, OIDC where supported, no secrets on fork PRs. Enable Dependabot/Renovate PRs nhưng không auto-merge framework/scheduler/provider majors.
- Create SBOM/license check và secret scanning trước store/public launch. Pin exact scheduler and AI SDK majors; batch routine updates monthly.
- Recovery: trên Supabase Free, scheduled logical DB dump off-site và test restore là bắt buộc; khi lên Pro dùng daily backup cộng periodic off-site logical export. Document RPO/RTO trước khi dữ liệu learner trở nên không thể tái tạo.
- Set quota alerts/spend caps ở từng vendor. Giá và quota là snapshot ngày kiểm chứng, phải verify-at-implementation và trước mỗi upgrade.

Free-first upgrade policy:

| Dịch vụ | Điểm bắt đầu | Trigger nâng cấp/đổi |
|---|---|---|
| Vercel | Hobby cho personal/non-commercial development | **ToS:** trước bất kỳ commercial use; hoặc sớm hơn nếu function/runtime/reliability limits cản test thực tế. Nếu Pro không hợp economics, deploy cùng Next app bằng Node/Docker ở host khác. |
| Supabase | Free + automated off-site logical dumps | **Backup/RPO:** dữ liệu active learners không còn tái tạo được; **reliability:** auto-pause/support không chấp nhận được; **quota:** DB/storage/MAU/egress gần giới hạn. |
| Inngest | Hobby | **Quota/reliability:** projected executions, concurrency, queue latency hoặc trace retention có nguy cơ pause/làm chậm enrichment; cân Pro với Supabase Queue worker trước khi nâng. |
| PostHog | Free, explicit events only | **Quota/retention:** dữ liệu bị drop hoặc retention/collaboration cản product decisions; tối ưu event volume trước. |
| Sentry | Free, sampled và redacted | **Reliability/retention:** dropped events, alerting hoặc history cản incident response; tối ưu sampling trước. |

Không dùng Vercel Hobby cho bất kỳ commercial use nào, không chỉ “production”, vì ToS không cho phép. Không auto-deploy DB destructive migrations, không share production Supabase keys với preview, và không publish extension trực tiếp từ unreviewed branch.

## 15. Maintenance, compatibility và lock-in matrix

| Choice | Maintenance/status tại 2026-09-11 | Compatibility | Cost/lock-in đáng chú ý | Verdict |
|---|---|---|---|---|
| Node 24 | LTS | Tất cả chosen tools | Low; standard runtime | Chọn |
| npm workspaces + Turbo | npm/Turbo active official docs; optional remote cache | Node 24, Next, WXT | Low; standard package manifests/root lockfile | Chọn |
| Next.js 16 | Current stable line | Node 20.9+, React 19 | Medium framework coupling; deploy portable | Chọn |
| WXT 0.21 | Active, cross-browser, MIT | React/Vite, MV2/MV3 | Medium build-framework coupling; output is standard extension | Chọn |
| shadcn + Base UI | Base UI stable/current 1.8; shadcn default | React 17+, Vite/Turbopack | Low because component code is owned; primitive API coupling remains | Chọn; stock `base-nova`, custom semantic colors only |
| Supabase | Managed Postgres/Auth/Storage, active | JS/browser/server; Google web/Chrome extension documented | Medium-high Auth/Storage integration; Free has no automatic backup and may pause; DB itself portable Postgres | Chọn Free-first, Google-only, có dump + exit plan |
| `supabase-js` + SQL | Official, schema-generated types | Supabase/PostgREST | Medium query API coupling; SQL/domain tables portable | Chọn, no ORM initially |
| Hono | Active, MIT, documented Next adapter | Node/Vercel, standard fetch | Low-medium; wire remains REST/OpenAPI | Chọn |
| Inngest | Managed/open-source durable execution | Next/Node | Medium orchestration lock-in; Hobby pauses at quota and has $0→$99 price cliff | Chọn Hobby sau `JobDispatcher` + outbox; upgrade/switch by trigger |
| Upstash | Active serverless Redis | Next/Vercel | Extra vendor and production SLA cost | Defer |
| AI SDK 6 | Active multi-provider abstraction | Node/browser packages; use server only | Medium SDK semantics, lower model-provider lock-in | Chọn sau own port |
| `ts-fsrs` | Official maintained FSRS-6 TS package | Node 20+, browser | Algorithm/version-sensitive | Chọn, exact pin + audit |
| Vitest/Playwright | Active | Node 24, Vite/WXT/Next | Low | Chọn |
| PostHog/Sentry | Active managed telemetry | Web/Next/extension | Medium data/vendor coupling; off critical path | Chọn free-first với strict redaction/sampling |
| Vercel | First-party Next hosting | Next 16 | Medium hosting convenience; Hobby personal/non-commercial only | Hobby chỉ pre-commercial; Pro trước commercial use, giữ Docker exit |

## 16. Phased adoption

### Phase 0 — foundation

1. Node 24 + npm workspaces + Turbo; scaffold `apps/web`, `apps/extension` and pure domain/scheduler/API packages.
2. Next 16 + WXT builds; stock Tailwind/shadcn Base UI components và Ghim semantic colors; CI dùng `npm ci`, format/typecheck/test/build.
3. Supabase local + Free hosted project, SQL migrations, seed, generated types, RLS tests và off-site dump/restore script/process.
4. Hono `/api/v1`, Google-only Auth Actor context cho web/extension, error envelope, OpenAPI artifact.
5. Pinned `ts-fsrs`, immutable event schema, atomic `record_review`, golden replay tests.

### Phase 1 — end-to-end core loop

1. Extension capture with offline outbox/idempotency.
2. Transactional outbox + Inngest Hobby enrichment; provider adapter, schema validation, quota reservation và usage alerts.
3. Web Daily Review, undo, due queue and sync conflict handling.
4. PostHog/Sentry free tiers; explicit events, sampling/redaction, no replay/autocapture.
5. Vercel Hobby previews cho non-commercial validation, Supabase scheduled backup process, manual extension release artifact.

### Phase 2 — only after measured pressure

- Add Upstash when rate/cache metrics justify it.
- Add React Hook Form/TanStack Query to specific complex surfaces, not globally.
- Add dedicated worker/Supabase Queue if Inngest economics or runtime becomes poor.
- Upgrade Supabase theo backup/RPO, reliability hoặc quota trigger; upgrade Vercel trước commercial use theo ToS.
- Upgrade PostHog/Sentry chỉ khi optimized event/sampling volume vẫn thiếu quota, retention hoặc incident-response reliability.
- Split backend deployable only for independent scaling/security ownership.
- Add Firefox automated release, Safari wrapper, optimizer personalization and bulk scheduler migrations after their prerequisites.

## 17. Decisions đã chốt và implementation gates

1. **Workspace:** npm workspaces + Turborepo; không pnpm.
2. **Cost posture:** free-first cho Supabase, Inngest, PostHog và Sentry. Vercel Hobby chỉ dùng khi personal/non-commercial; chuyển Pro hoặc host Node/Docker khác trước commercial use.
3. **Auth:** Google-only trên web và extension; learner mutations chỉ qua Ghim API, không cho extension query database trực tiếp.
4. **UI:** Tailwind 4 + shadcn/Base UI cung cấp nguyên component language; Ghim chỉ thay semantic color values.
5. **Jobs:** Inngest Hobby sau transactional outbox/`JobDispatcher`; đo executions, concurrency, backlog và latency để quyết định Pro hay Supabase Queue worker.
6. **Upgrade gates:** quota, reliability/support, backup/RPO và ToS là trigger. Mỗi quyết định nâng cấp phải ghi metric/constraint đã chạm, monthly cost mới và exit path.

Stack đã đủ quyết định để chuyển sang architecture ticket/spec mà không cần thêm vendor research. Exact package versions, prices, quotas và plan terms phải được resolve/verify-at-implementation; không copy mù phiên bản patch hoặc chi phí trong research note.
