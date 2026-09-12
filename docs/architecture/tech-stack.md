# Ghim MVP tech stack

## Architecture

Ghim starts as a TypeScript modular monolith in an npm-workspaces repository. Turborepo coordinates builds and tests; it does not define deployment boundaries.

```text
Next.js web ───────┐
                   ├─ Hono /api/v1 ─ Domain modules ─ Supabase Postgres
WXT extension ─────┘                         │
                                      ┌──────┴──────┐
                                      │             │
                                  ts-fsrs       Inngest jobs
                                                  │
                                      Lexical data + AI provider
```

Repository shape:

```text
apps/
  web/                  # Next.js pages, Hono API and Inngest endpoint
  extension/            # WXT React extension
packages/
  domain/               # vocabulary, capture, review and entitlement policies
  scheduler/            # Scheduler interface and pinned ts-fsrs adapter
  api/                   # Zod contracts, DTOs and typed Hono client
  data/                  # generated database types and repositories
  ui/                    # design tokens and accessible primitives
  observability/         # typed telemetry and redaction policy
supabase/
  migrations/           # authoritative database schema history
```

`packages/domain` and `packages/scheduler` do not import Next.js, Hono, Supabase, Inngest or browser APIs. Scheduler, enrichment provider and job dispatch are explicit seams because each needs production and test adapters or a credible provider replacement. Avoid speculative pass-through interfaces elsewhere.

## Selected stack

| Concern | MVP choice |
|---|---|
| Runtime | Node.js 24 LTS, strict TypeScript |
| Workspace | npm workspaces + Turborepo local cache |
| Web | Next.js 16 App Router, React 19, Node runtime |
| Extension | WXT + React; Chrome first, Edge from the same build family, Firefox later |
| UI | Tailwind CSS 4, shadcn/ui on Base UI, Lucide |
| Forms/state | Native React forms + Zod; local review state machine; add RHF or TanStack Query only where justified |
| API | Hono REST under `/api/v1`, Zod request/response contracts, typed client and OpenAPI artifact |
| Data | Supabase managed Postgres, Auth and Storage; RLS on Learner data |
| Auth | Google only; Supabase session/JWT; OAuth PKCE for the extension |
| Schema access | Supabase SQL migrations, generated types and `supabase-js`; no ORM initially |
| Jobs | Inngest Free behind `JobDispatcher`, initiated through a transactional Postgres outbox |
| AI | Vercel AI SDK Core behind `EnrichmentProvider`; versioned structured output and provenance |
| Scheduling | Exact-pinned `ts-fsrs` behind `Scheduler`; authoritative server commit and immutable Review Events |
| Tests | Vitest, Testing Library selectively, Playwright and pgTAP/Supabase database tests |
| Telemetry | Explicit PostHog events and redacted Sentry errors/traces; no captured Learner content |
| Delivery | GitHub Actions, Vercel previews/production and CI-built extension artifacts |

## UI direction: stock shadcn with Ghim colors

Ghim uses the stock shadcn `base-nova` component source on Base UI. Component typography, spacing, radius, shadows, motion and variants remain at their generated defaults. The only visual override is the semantic color palette: forest green, cream and muted mustard or rust accents.

Web and extension share the semantic palette and stock primitives, not whole layouts. Product-specific modules such as the heatmap, streak, badge and rank compose those primitives without restyling them.

## Data and authority

- The web app and extension call the Ghim API; neither client performs authoritative Learner mutations directly against Postgres.
- The extension content script captures selection/context only. Its background worker owns auth, API calls, idempotency and an offline retry outbox.
- `record_review` atomically records the immutable Review Event, updates the Memory Track projection and writes downstream ledger/outbox effects. The server computes the authoritative schedule.
- SQL migrations in `supabase/migrations` are the only schema source of truth. Database constraints and RLS enforce invariants in addition to Zod validation.
- Captured sentences remain private. Tokens, captures, translations, deck names and article URLs never enter analytics or ordinary logs.

## Free-first infrastructure policy

Use free tiers during development and private beta. Upgrade based on a concrete trigger rather than pre-paying:

- Vercel: upgrade when commercial use makes the Hobby terms unsuitable or required capacity/features demand it.
- Supabase: upgrade when quota, inactivity behavior, backups or recovery objectives require it. Maintain logical dumps while automatic backups are unavailable.
- Inngest: stay free while execution/concurrency limits are safe; alert before exhaustion and retain the outbox/adapter escape path.
- PostHog and Sentry: stay within free tiers and remain removable from the critical path.

Free-tier exhaustion must degrade enrichment or telemetry safely; it must not corrupt review history or Learner Data.

## Delivery phases

### Phase 0 — foundation

1. Pin Node 24 and npm; scaffold workspaces, Turbo tasks, Next.js and WXT builds.
2. Establish the Ghim semantic palette and stock Base UI/shadcn primitives without building full product screens.
3. Add Supabase local development, SQL migrations, generated types, RLS and database tests.
4. Add Hono `/api/v1`, Google Auth actor normalization, error envelope and API contract tests.
5. Integrate pinned `ts-fsrs`, immutable review schema, atomic review commands and golden replay fixtures.

### Phase 1 — Core Learning Loop

1. Implement manual and extension Capture with offline retry and idempotency.
2. Implement enrichment through the transactional outbox, Inngest and a schema-validated provider adapter.
3. Implement Daily Review, Quên/Nhớ, relearning display, undo and conflict handling.
4. Add privacy-safe events/errors, Vercel previews and deterministic extension ZIP artifacts.

### Phase 2 — only after measured pressure

- Add Redis only when rate-limit or cache contention is measured.
- Add more form/query state libraries only to surfaces that need them.
- Replace Inngest with a queue worker if its economics or limits become unsuitable.
- Split a backend deployable only when scaling or security profiles actually diverge.
- Add Firefox automation, Safari, personalized optimization and bulk scheduler migrations after their prerequisites.

## Verification gates

Every pull request runs formatting, linting, type checking, unit tests, local database reset/tests and production builds for web and extension. Critical Playwright paths cover Google auth smoke, Capture, enrichment status, Daily Review, undo and the extension offline queue. Paid AI providers are replaced by schema-safe fixtures in ordinary CI.

The detailed primary-source comparison and current version notes live in [`docs/research/tech-stack.md`](../research/tech-stack.md). Exact package versions and free-tier terms must be verified again when the repository is scaffolded or the product launches.
