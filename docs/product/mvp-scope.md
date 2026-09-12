# Ghim MVP scope

Status: locked for specification on 2026-09-12.

## Product promise

Ghim helps Vietnamese B1–B2 learners turn vocabulary encountered while reading real English into useful, contextual study material and recall it later without configuring a scheduler. The MVP proves one loop: encounter → capture → enrich → review when due → recognize on re-encounter.

The primary interaction is the linear capture flow selected in the core-loop prototype. Review uses a focused, one-decision-at-a-time presentation. FSRS stays correct and server-authoritative but is described only in plain language.

## In scope

### Account and ownership

- Google-only sign-in through Supabase Auth for web and the Chrome extension.
- One Learner account, an explicit IANA timezone, private Learner Data, and row-level security on every learner-owned table.
- Account deletion and machine-readable export of decks, items, encounters, accepted learning material, memory tracks, and review history.

### Decks and library

- A small set of curated Starter Decks so a new Learner can begin without authoring cards.
- Personal decks with create, rename, archive, restore, and explicit delete behavior.
- One Vocabulary Item may belong to multiple decks without duplicating its Memory Track.
- A basic private Library showing item readiness, deck membership, next review, and enrichment or confirmation state.

### Capture

- Manual entry on the web for a word or multiword expression, with optional sentence and target deck.
- Chrome extension capture from an explicit text selection, preserving the selected Surface Form, source URL/title, a minimal surrounding context, target deck, timestamp, and client-generated idempotency key.
- Saving succeeds before enrichment begins. Online capture acknowledges immediately; offline extension capture enters a visible local outbox and retries safely.
- Repeating the same command cannot create duplicate Encounters. A same-Sense capture appends an Encounter; ambiguous or different-Sense input requires confirmation rather than silently merging.

### Enrichment and correction

- Asynchronous, versioned enrichment grounded in local lexical evidence and the captured context.
- A Ready item contains a canonical Lexical Unit, part of speech, selected Sense, contextual Vietnamese meaning, Primary Context, Recognition prompt, and provenance. IPA and licensed or generated audio are included when valid evidence exists and may backfill later.
- States visible to the Learner are Enrichment Pending, Needs Confirmation, Ready, and a recoverable failure state with a retry path.
- Weak evidence fails closed. Generated content is never presented as verified source material.
- Learners can correct meaning/context and archive, restore, or delete their own item. Refresh never silently overwrites an accepted edit.
- Free beta meters Successful Enrichments against the provisional 300-per-calendar-month guardrail. Capture and due review remain available when quota, provider, or budget is exhausted.

### Daily Review

- Recognition is the only scheduling direction required for MVP. Production practice remains outside the core MVP.
- A due-first queue orders overdue/due tracks by lowest retrievability, then due relearning, then new material. A backlog pauses new material by default.
- Each prompt shows stable context, then reveals the contextual Vietnamese meaning. The only scheduling outcomes shown are Quên and Nhớ; response time never infers a grade.
- A failed review creates one short relearning step. The exact initial interval remains a measured product parameter.
- Review Events are immutable. One-step undo voids the last event and restores/replays authoritative state.
- Daily Completion means no due-now or overdue Recognition tracks remain in the Learner Day; future intraday relearning is shown separately.

### Motivation

- A review activity heatmap, current streak, simple XP total, rank, and badge ladder are visible.
- Scheduler-derived credit comes only from honest due work and Daily Completion. Practice, early review, repeated commands, capture spam, or changing Quên to Nhớ cannot farm progress.
- No daily challenges, competitive leaderboard, social comparison, purchasable streak repair, or reward that pressures a Learner to misrate memory.

## End-to-end journeys

1. A new Learner signs in with Google, confirms timezone, chooses a Starter Deck, and sees the first short session without learning FSRS terminology.
2. While reading, the Learner selects a word, chooses a deck in the extension, receives an immediate saved/offline-queued confirmation, and later sees Pending, Needs Confirmation, or Ready in the Library.
3. The Learner manually adds a word or expression when browser capture is unavailable and receives the same domain behavior as extension capture.
4. The Learner opens Today, reveals each answer, selects Quên or Nhớ, can undo the latest answer, and receives a plain-language completion or relearning message.
5. The Learner corrects weak material without losing Encounters or review state, and can archive, export, or explicitly delete Learner Data.
6. When an AI/provider/quota failure occurs, Capture and Review still work; enrichment remains pending with a truthful status and later retry.

## Non-functional requirements

- **Privacy:** captured text, translations, deck names, tokens, and source URLs never enter ordinary logs, analytics, session replay, or error payloads. Only explicit redacted telemetry is allowed.
- **Isolation:** RLS and database tests prove one Learner cannot read or mutate another Learner's data. Authoritative mutations run through the Ghim API and atomic Postgres functions.
- **Integrity:** capture idempotency, immutable Review Events, atomic schedule updates, undo replay, outbox delivery, quota accounting, and motivation ledgers have deterministic tests.
- **Resilience:** provider failure, retry, duplicate delivery, browser restart, expired auth, offline capture, and stale review commands have explicit recoverable outcomes. No accepted capture disappears silently.
- **Performance:** local capture acknowledgement appears within 300 ms; online API capture and review commands target p95 under 800 ms excluding enrichment; ordinary web routes target Core Web Vitals “good” in production sampling.
- **Accessibility:** keyboard-only capture/review, visible focus, semantic labels, reduced motion, and WCAG 2.2 AA contrast for supported light-theme states.
- **Compatibility:** responsive web supports current Chrome, Edge, Safari, and Firefox; the extension ships Chrome MV3 first and produces an Edge artifact from the same source.
- **Operations:** migrations are reproducible; CI uses provider fixtures; production has redacted error reporting, cost/queue health signals, logical database backup instructions, and circuit breakers before beta invitations expand.

## Private-beta success and guardrail metrics

These are product hypotheses to validate, not vanity launch claims.

- At least 80% of moderated beachhead users complete extension capture and their first review without operator instruction.
- At least 95% of explicit capture commands are acknowledged successfully or visibly queued; confirmed duplicate Vocabulary Encounters stay below 1%.
- At least 80% of reviewed enrichment outputs are accepted without a meaning or Sense correction after the blinded eval establishes the provider threshold.
- At least 50% of activated Learners complete due work on three separate days in their first seven days.
- After 4–6 weeks, at least 60% of a Learner's sampled mature items are recognized in an unseen real-content sentence without lookup.
- Zero confirmed cross-account data exposure, silent capture loss, fabricated Ready material after a confidence failure, or motivation credit from non-scheduling practice.
- Infrastructure remains inside explicit spend caps; exhaustion degrades enrichment, never Capture, Review, export, or deletion.

## MVP release acceptance

- All six journeys pass automated happy-path coverage where feasible and documented manual release checks elsewhere.
- Chrome extension selection capture, offline retry, Google auth, API idempotency, enrichment state transitions, Library correction, due Review, undo, heatmap/streak/rank credit, export, and deletion pass end-to-end verification.
- Database reset, migrations, generated types, RLS/pgTAP, unit/integration tests, web production build, Chrome/Edge extension builds, and deterministic extension packaging pass in CI.
- The 200–300-case contextual EN→VI evaluation selects the beta provider/model and confidence gates before real generated enrichment is enabled for beta users. Until then the product runs only fixtures or keeps enrichment pending.
- Privacy copy, provider attribution, licenses, support/recovery path, known beta limitations, and rollback steps are documented.

## Out of scope

- Native mobile apps, Safari extension, Firefox extension release, and general Anki compatibility.
- Password/email login, organization accounts, classroom/teacher administration, social feeds, public deck marketplace, deck sharing, and collaborative editing.
- Anki/Quizlet import, arbitrary card templates, custom scheduling parameters, bulk rescheduling, and learner-visible FSRS controls.
- Production-direction scheduling, spelling/writing drills, AI tutor/chat, grammar curriculum, exam courses, and audiovisual-first learning flows.
- Payments, exact Pro pricing, ads, lifetime plans, daily challenges, leaderboards, streak repair, and competitive rewards.
- Full SynapsePro or Anki HeatMap visual parity; Ghim implements its own motivation behavior and stock shadcn visual system.

## Source decisions

- Trello: beachhead/JTBD, Free Core, vocabulary model, FSRS policy, core-loop prototype, and technical architecture child decisions under the Ghim MVP map.
- [`docs/adr/0001-keep-the-core-learning-loop-free.md`](../adr/0001-keep-the-core-learning-loop-free.md)
- [`docs/adr/0002-model-vocabulary-by-sense-not-by-card.md`](../adr/0002-model-vocabulary-by-sense-not-by-card.md)
- [`docs/adr/0003-use-a-versioned-fsrs-policy-with-honest-two-outcome-reviews.md`](../adr/0003-use-a-versioned-fsrs-policy-with-honest-two-outcome-reviews.md)
- [`docs/adr/0004-start-with-a-typescript-modular-monolith.md`](../adr/0004-start-with-a-typescript-modular-monolith.md)
- [`docs/adr/0005-use-stock-shadcn-styling.md`](../adr/0005-use-stock-shadcn-styling.md)
