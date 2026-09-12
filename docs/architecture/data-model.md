# Learner data model

The authoritative schema lives in `supabase/migrations/`. This document explains
the boundaries; it is not a second schema source.

## Ownership and lifecycle

- `learners.id` is the matching `auth.users.id`. Account deletion must first run
  an explicit Learner Data deletion workflow; foreign keys deliberately restrict
  silent cascading deletion.
- Global `lexical_units`, `lexical_senses`, `lexical_evidence`, Starter Decks and
  `scheduler_policies` are readable reference data. Learners cannot mutate them.
- `learner_starter_decks` records a Learner choosing a Starter Deck without
  eagerly copying its entries. Learner-owned Vocabulary Items are instantiated
  lazily by the later Library workflow.
- A Capture first creates a private `vocabulary_encounter`. It becomes linked to
  a `vocabulary_item` only after enrichment or confirmation identifies one
  Lexical Unit and Sense.
- `vocabulary_items` own accepted `learning_materials` and independent
  `memory_tracks`; Decks organize items through `deck_memberships` without
  copying scheduling state.
- Archive timestamps preserve history. Review, entitlement-usage and motivation
  ledgers are append-only; Review correction is represented by a separate row.

## Atomic commands

- `capture_vocabulary_encounter` validates the Learner supplied by the trusted
  API, makes concurrent retries idempotent, preserves the original capture time,
  stores optional manual context and writes an enrichment outbox event in one
  transaction.
- `adopt_starter_deck` records or reactivates a Starter Deck choice without
  eagerly creating Learner-owned items.
- `commit_review_event` locks one Memory Track, checks its optimistic version,
  derives the Learner Day from the stored IANA timezone, canonicalizes the
  resulting projection, appends the immutable Review Event and emits a downstream
  outbox event in one transaction. The scheduler ticket remains responsible for
  computing and validating the FSRS result supplied by the trusted API.
- This ticket deliberately does not seed an active Scheduler Policy. The
  scheduler ticket must commit the exact pinned `ts-fsrs` parameters and golden
  replay fixtures together before a policy can become authoritative.
- `private.claim_outbox_events` uses `FOR UPDATE SKIP LOCKED`, short leases and a
  bounded batch. It is available only to `service_role` workers.

## Access control

Every `public` table has RLS enabled. Authenticated reads are owner-scoped using
`(select auth.uid())`; captured context and review history have no anonymous
access. Critical writes are withheld from table grants and go through atomic
functions. Anonymous access is limited to global lexical evidence and Starter
Deck reference data.

Atomic mutation functions are executable only by `service_role`; browser clients
cannot call them with their publishable key. The Hono API authenticates the actor
and passes the matching Learner ID through this trusted boundary. The secret key
must never be shipped to either client.

Data API grants are explicit because Supabase no longer guarantees that new
tables are automatically exposed. `supabase/config.toml` mirrors that behavior
locally with `auto_expose_new_tables = false`.
