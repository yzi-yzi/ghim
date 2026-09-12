# Issue tracker: Trello

Product decisions, specs, and implementation tickets for this repository live on the [Ghim Trello board](https://trello.com/b/orZGX7xx/ghim).

Board ID: `ari:cloud:trello::board/workspace/60c1d7892d5e9d1a3ee68529/6aa40c4e40093dde1859b1f5`

## Workflow

| List | Purpose |
| --- | --- |
| Inbox | Untriaged ideas, bugs, and requests |
| Decisions | Wayfinder maps and unresolved product or technical decisions |
| Ready | Specified, unblocked work that can be started |
| In Progress | Work currently claimed by a person or agent |
| Review & Verify | Implementation awaiting review, tests, or product verification |
| Done | Resolved decisions and completed work |

Move cards from left to right as their state changes. Claim work by assigning the card and moving it to **In Progress** before making changes.

## Card conventions

- A card is the canonical issue or ticket. Refer to it by its linked title, not only by its ID.
- Put the decision question or acceptance criteria in the description.
- Record relevant repo files, specifications, prototypes, and external research as links in the description.
- Put durable resolution details in the description before moving a card to **Done**.
- Use title prefixes such as `[Map]`, `[Decision]`, `[Research]`, and `[Prototype]` until dedicated labels are available.

## When a skill says "publish to the issue tracker"

Create a card on this Trello board. Use **Decisions** for unresolved product or architecture questions, **Ready** for specified executable work, and **Inbox** when triage is still needed.

## When a skill says "fetch the relevant ticket"

Read the Trello card description, attachments, checklist, and current list. Follow links only as needed.

## Wayfinding operations

Trello does not expose native child issues or dependency relationships through the current connector, so this repository uses explicit linked-card conventions:

- **Map:** one card in **Decisions** prefixed `[Map]`. Its description contains Destination, Notes, Decisions so far, Not yet specified, and Out of scope.
- **Child ticket:** a separate card in **Decisions** with `Part of: [map title](map URL)` in its description. The map links back to every live child card.
- **Blocking:** use `Blocked by: [card title](card URL)` in the child description. A card is unblocked only after every linked blocker is in **Done**.
- **Frontier:** child cards that remain in **Decisions**, have no unresolved blocker, and are unassigned.
- **Claim:** assign the card and move it to **In Progress** before work begins.
- **Resolve:** add a concise resolution to the card description, move it to **Done**, then add a one-line linked gist under the map's **Decisions so far** section.

Do not silently invent Trello dependencies, comments, or labels that the connector cannot write. Preserve the same information through descriptions and links.

