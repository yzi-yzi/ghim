# Ghim

**Gặp từ nào, nhớ từ đó.**

Ghim is a Vietnamese-first English vocabulary learning product. It combines effortless word capture, useful Vietnamese learning context, and FSRS-based spaced repetition in a much simpler experience than a traditional flashcard tool.

The project is moving from product discovery into foundation work. Work is tracked on the [Ghim Trello board](https://trello.com/b/orZGX7xx/ghim).

## Initial product direction

- Curated starter decks and extremely simple personal decks.
- Add words manually or capture highlighted words from the web through a browser extension.
- Enrich captured words with contextual Vietnamese meaning, pronunciation, audio, examples, useful forms, and collocations.
- Generate recognition and production practice automatically.
- Schedule reviews with FSRS while keeping scheduler controls out of the learner's way.
- Support healthy motivation through an activity heatmap, streaks, XP, levels, ranks, badges, and daily challenges without distorting review quality.

## Local development

Requirements:

- Node.js 24.20.0 (see `.nvmrc`)
- npm 11.19.0
- Docker Desktop for the local Supabase/Postgres stack

```bash
nvm use
npm install
npm run dev
```

The web app runs at [http://localhost:3000](http://localhost:3000).

Run every local quality gate with:

```bash
npm run check
```

### Local database

SQL migrations under `supabase/migrations/` are the only database schema source
of truth. The local stack requires only Postgres for database work; application
services can be enabled later when their tickets need them.

```bash
# Start Postgres and apply the current migrations and seed.
npm run db:start

# Rebuild from an empty database, run pgTAP (including RLS isolation), run
# database lint/advisors, and confirm the committed TypeScript types match.
npm run db:verify

# Stop the local stack when finished.
npm run db:stop
```

Create each future migration with `npx supabase migration new <name>`, then run
`npm run db:verify`. Do not edit the remote database as the source of truth.

## Workspace

```text
apps/web/                 Next.js application
apps/extension/           WXT browser extension for Chrome and Edge
packages/domain/          Product rules and vocabulary language
packages/scheduler/       Scheduling boundary
packages/api/             API contracts and error envelopes
packages/data/            Persistence boundary
packages/ui/              Shared UI language and tokens
packages/observability/   Privacy-safe telemetry boundary
```

Authentication UI, Capture UI/API behavior, FSRS integration, and enrichment are
implemented in their dedicated tickets. The learner-data schema and its atomic
Capture, Review, and outbox boundaries live under `supabase/`.
