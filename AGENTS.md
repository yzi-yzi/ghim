# Ghim agent guide

Ghim is a Vietnamese-first English vocabulary learning product built around simple capture, high-quality generated study material, and FSRS scheduling hidden behind approachable UX.

## Agent skills

### Issue tracker

Product decisions and implementation work are tracked on the Ghim Trello board. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default Matt Pocock triage roles; until matching Trello labels are created, represent them using the workflow mapping in `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

## Product principles

- Optimize first for Vietnamese learners of English who find Anki too complex and lighter flashcard apps too shallow.
- Keep FSRS scheduling correct while hiding scheduler complexity from learners.
- Make capturing a word from a browser or entering one manually extremely simple.
- Treat context, Vietnamese meaning, pronunciation, examples, and useful word forms as learning material, not decorative metadata.
- Motivation mechanics such as streaks, XP, ranks, badges, and the activity heatmap must reinforce genuine study behavior and must never distort FSRS ratings or encourage premature reviews.

## Working flow

- Medium feature: `grill-with-docs` -> `implement` -> `code-review`.
- Multi-session feature: `grill-with-docs` -> `to-spec` -> `to-tickets` -> implement one ticket at a time.
- Difficult bug: `diagnosing-bugs` -> implement the authorized fix -> regression test.
- Ambiguous epic: `wayfinder` -> `to-spec` -> `to-tickets` -> implement.

