#!/usr/bin/env python3
"""Create a private pre-generation sheet for human gold confirmation."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any, Dict, Iterable


FIELDS = [
    "case_id", "category", "target_surface", "context", "candidate_senses",
    "provisional_expected_sense_id", "review_decision_matched_ambiguous_no_match",
    "acceptable_sense_ids", "acceptable_vietnamese_glosses",
    "essential_semantic_components", "unacceptable_interpretations",
    "difficulty_easy_medium_hard", "reviewer_notes",
]


def jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def existing(path: Path) -> Dict[str, Dict[str, str]]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as handle:
        return {row["case_id"]: row for row in csv.DictReader(handle)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    prior = existing(args.output)
    rows = []
    for case in jsonl(args.gold):
        old = prior.get(case["case_id"], {})
        candidates = " || ".join(
            f"{sense['id']}: {sense['gloss']}" for sense in case["candidate_senses"]
        )
        row = {
            "case_id": case["case_id"],
            "category": case["category"],
            "target_surface": case["target_surface"],
            "context": case["context"],
            "candidate_senses": candidates,
            "provisional_expected_sense_id": case["expected_sense_id"],
        }
        for field in FIELDS[6:]:
            row[field] = old.get(field, "")
        rows.append(row)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows)} cases to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
