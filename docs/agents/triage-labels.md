# Triage roles on Trello

Matt Pocock's skills use five canonical triage roles. The current Trello connector cannot create the matching labels, so the board workflow below is the authoritative representation until those labels are added manually.

| Canonical role | Current Trello representation | Meaning |
| --- | --- | --- |
| `needs-triage` | **Inbox** | Maintainer needs to evaluate the card |
| `needs-info` | **Decisions**, with `Needs info:` in the description | Waiting for a human answer |
| `ready-for-agent` | **Ready**, unassigned | Fully specified and safe for an AFK agent |
| `ready-for-human` | **Ready**, assigned to a human | Requires human implementation or live input |
| `wontfix` | **Done**, with `Resolution: Won't fix` | Intentionally will not be actioned |

If actual labels are later created, use these exact strings by default and update this file to make labels authoritative.

