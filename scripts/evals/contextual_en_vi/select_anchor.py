#!/usr/bin/env python3
"""Freeze a 50-case hard slice for the stronger-model anchor run."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List


ANCHOR_QUOTAS = {"difficult_context": 30, "polysemy": 10, "multiword": 10}


def jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()
    cases = list(jsonl(args.gold))
    anchor: List[Dict[str, Any]] = []
    for category, count in ANCHOR_QUOTAS.items():
        eligible = sorted(
            (case for case in cases if case["category"] == category),
            key=lambda case: case["case_id"],
        )
        if len(eligible) < count:
            raise SystemExit(f"need {count} {category} cases; found {len(eligible)}")
        anchor.extend(eligible[:count])
    requests = [
        {
            key: value
            for key, value in case.items()
            if key not in {"expected_lemma", "expected_sense_id"}
        }
        for case in anchor
    ]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for case in requests:
            handle.write(json.dumps(case, ensure_ascii=False, separators=(",", ":")))
            handle.write("\n")
    manifest = {
        "case_count": len(requests),
        "quotas": ANCHOR_QUOTAS,
        "source_gold_sha256": file_hash(args.gold),
        "requests_sha256": file_hash(args.output),
        "case_ids": [case["case_id"] for case in requests],
    }
    args.manifest.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
