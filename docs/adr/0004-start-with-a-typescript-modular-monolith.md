# Start with a TypeScript modular monolith

Ghim will use Node.js 24 LTS, npm workspaces and Turborepo with two clients—Next.js web and a WXT browser extension—sharing pure domain, scheduler and API packages. A Hono REST interface connects both clients to server-authoritative Supabase/Postgres data. Durable enrichment runs through a transactional outbox and an Inngest adapter; FSRS-6 runs behind a pinned `ts-fsrs` adapter. Infrastructure begins on free tiers and upgrades only when quota, reliability, recovery or provider terms require it.

## Consequences

The initial system has one application backend rather than microservices. Domain and scheduler modules stay independent of frameworks, and explicit seams exist only where production/test or provider alternatives are real: scheduling, enrichment and job dispatch. SQL migrations remain the authoritative schema, with RLS and atomic Postgres functions protecting Learner data and review invariants. Google is the only login method in the MVP. UI uses Tailwind CSS 4 and shadcn/ui on Base UI, while Ghim owns a Vintage Library visual language inspired by forest-green reading rooms, cream paper, bookshelves, card catalogs and library stamps. Commercial terms, backup needs and measured load—not an arbitrary date—trigger paid infrastructure.
