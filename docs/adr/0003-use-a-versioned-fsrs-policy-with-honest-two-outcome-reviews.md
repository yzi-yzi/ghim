# Use a versioned FSRS policy with honest two-outcome reviews

Ghim will schedule each Memory Track independently with FSRS-6 through a pinned `ts-fsrs` release, hidden desired retention of 0.90, and a versioned Scheduler Policy. The MVP asks only whether the Learner forgot or remembered before reveal, mapping Quên to Again and Nhớ to Good. Review Events are immutable source data; the current Memory Track state is a replayable projection. Recognition and Production never share state, even when they belong to the same Vocabulary Item.

## Consequences

Due and overdue tracks come before relearning and new material, and a Review Backlog pauses new items by default. A failed review creates one short relearning step; exact timing remains a prototype hypothesis. Non-scheduling Practice cannot change the schedule or earn scheduler-derived streak credit. Daily Completion is based on Due Tracks in the Learner's timezone rather than session length or XP. Default parameters apply until enough eligible history exists for evaluated per-Learner optimization; parameter changes apply prospectively, while bulk rescheduling and algorithm upgrades require explicit, auditable migrations. Repeated failures trigger material repair and may pause a track, but never destroy Learner Data.
