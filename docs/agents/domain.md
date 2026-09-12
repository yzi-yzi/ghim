# Domain docs

Ghim uses a single-context domain documentation layout.

## Before exploring, read these

- `CONTEXT.md` at the repository root, when present.
- Relevant ADRs under `docs/adr/`, when present.

If either location does not exist, proceed silently. Domain-modeling work creates and updates these files only when vocabulary or decisions have actually been resolved.

## Use the glossary's vocabulary

When code, tickets, specs, or tests name a domain concept, use the term defined in `CONTEXT.md`. Avoid introducing synonyms the glossary explicitly rejects. If the required concept is missing, treat that as a domain-modeling question rather than casually inventing terminology.

## Flag ADR conflicts

Surface any conflict with an existing ADR explicitly. Do not silently override a recorded architectural decision.

## Layout

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

