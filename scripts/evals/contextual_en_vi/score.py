#!/usr/bin/env python3
"""Score objective checks and prepare/consume a blinded human-review CSV."""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path
from typing import Any, Dict, Iterable, List


REVIEW_FIELDS = [
    "case_id", "category", "target_surface", "context", "expected_gloss_en",
    "contextual_meaning_vi", "short_explanation_vi", "collocations",
    "sense_correct_auto", "semantic_accuracy_0_to_2",
    "natural_vietnamese_0_to_2", "b1_b2_appropriateness_0_to_2",
    "concision_distinctiveness_0_to_2", "collocations_useful_0_to_2",
    "error_severity_none_minor_major_critical", "reviewer_notes",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold", required=True, type=Path)
    parser.add_argument("--outputs", required=True, type=Path)
    parser.add_argument("--review-csv", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--input-usd-per-million", required=True, type=float)
    parser.add_argument("--output-usd-per-million", required=True, type=float)
    return parser.parse_args()


def jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def existing_reviews(path: Path) -> Dict[str, Dict[str, str]]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as handle:
        return {row["case_id"]: row for row in csv.DictReader(handle)}


def expected_gloss(case: Dict[str, Any]) -> str:
    expected = case["expected_sense_id"]
    return next(
        (sense["gloss"] for sense in case["candidate_senses"] if sense["id"] == expected),
        "",
    )


def usage_tokens(record: Dict[str, Any], name: str) -> int:
    usage = record.get("usage") or {}
    aliases = {
        "input": ("input_tokens", "prompt_tokens"),
        "output": ("output_tokens", "completion_tokens"),
    }
    return int(next((usage[key] for key in aliases[name] if usage.get(key) is not None), 0))


def mean_rating(rows: List[Dict[str, str]], field: str) -> float:
    values = [float(row[field]) for row in rows if row.get(field, "").strip()]
    return statistics.mean(values) if values else 0.0


def main() -> int:
    args = parse_args()
    gold = {case["case_id"]: case for case in jsonl(args.gold)}
    outputs = {row["case_id"]: row for row in jsonl(args.outputs)}
    old_reviews = existing_reviews(args.review_csv)
    review_rows: List[Dict[str, str]] = []
    objective = []

    for case_id, case in gold.items():
        output = outputs.get(case_id) or {}
        enrichment = output.get("enrichment") or {}
        selected = enrichment.get("selected_sense_id")
        allowed_senses = {sense["id"] for sense in case["candidate_senses"]}
        allowed_ipa = {item.get("ipa") for item in case["pronunciation_candidates"]}
        allowed_audio = {
            item.get("audio_url") for item in case["pronunciation_candidates"]
        }
        sense_correct = (
            enrichment.get("decision") == "matched"
            and selected == case["expected_sense_id"]
        )
        hallucinated = (
            (selected is not None and selected not in allowed_senses)
            or any(
                sense_id not in allowed_senses
                for sense_id in enrichment.get("evidence_sense_ids") or []
            )
            or (enrichment.get("ipa") is not None and enrichment.get("ipa") not in allowed_ipa)
            or (
                enrichment.get("audio_url") is not None
                and enrichment.get("audio_url") not in allowed_audio
            )
        )
        blank = (
            output.get("ok") is not True
            or enrichment.get("decision") != "matched"
            or not enrichment.get("contextual_meaning_vi")
        )
        objective.append(
            {
                "case_id": case_id,
                "ok": output.get("ok") is True,
                "sense_correct": sense_correct,
                "hallucinated": hallucinated,
                "blank": bool(blank),
                "latency_ms": output.get("latency_ms") or 0,
                "input_tokens": usage_tokens(output, "input"),
                "output_tokens": usage_tokens(output, "output"),
            }
        )
        prior = old_reviews.get(case_id, {})
        review_rows.append(
            {
                "case_id": case_id,
                "category": case["category"],
                "target_surface": case["target_surface"],
                "context": case["context"],
                "expected_gloss_en": expected_gloss(case),
                "contextual_meaning_vi": enrichment.get("contextual_meaning_vi") or "",
                "short_explanation_vi": enrichment.get("short_explanation_vi") or "",
                "collocations": " | ".join(enrichment.get("collocations") or []),
                "sense_correct_auto": "yes" if sense_correct else "no",
                "semantic_accuracy_0_to_2": prior.get("semantic_accuracy_0_to_2", ""),
                "natural_vietnamese_0_to_2": prior.get("natural_vietnamese_0_to_2", ""),
                "b1_b2_appropriateness_0_to_2": prior.get("b1_b2_appropriateness_0_to_2", ""),
                "concision_distinctiveness_0_to_2": prior.get("concision_distinctiveness_0_to_2", ""),
                "collocations_useful_0_to_2": prior.get("collocations_useful_0_to_2", ""),
                "error_severity_none_minor_major_critical": prior.get("error_severity_none_minor_major_critical", ""),
                "reviewer_notes": prior.get("reviewer_notes", ""),
            }
        )

    args.review_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.review_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=REVIEW_FIELDS)
        writer.writeheader()
        writer.writerows(review_rows)

    total = len(objective)
    completed = sum(row["ok"] for row in objective)
    sense_correct = sum(row["sense_correct"] for row in objective)
    hallucinated = sum(row["hallucinated"] for row in objective)
    blank = sum(row["blank"] for row in objective)
    latencies = [row["latency_ms"] for row in objective if row["ok"]]
    input_tokens = sum(row["input_tokens"] for row in objective)
    output_tokens = sum(row["output_tokens"] for row in objective)
    cost = (
        input_tokens * args.input_usd_per_million
        + output_tokens * args.output_usd_per_million
    ) / 1_000_000
    reviewed = [
        row for row in review_rows if row["natural_vietnamese_0_to_2"].strip()
    ]
    pct = lambda value, denominator=total: 0 if not denominator else value / denominator
    sorted_latencies = sorted(latencies)
    p95 = sorted_latencies[min(len(sorted_latencies) - 1, int(len(sorted_latencies) * 0.95))] if sorted_latencies else 0
    successful = sum(
        1
        for row, review in zip(objective, review_rows)
        if row["sense_correct"]
        and not row["hallucinated"]
        and not row["blank"]
        and review["natural_vietnamese_0_to_2"].strip()
        and all(
            float(review[field]) == 2
            for field in (
                "semantic_accuracy_0_to_2", "natural_vietnamese_0_to_2",
                "b1_b2_appropriateness_0_to_2",
                "concision_distinctiveness_0_to_2",
            )
        )
    )
    report = f"""# Contextual EN→VI measured results

> Private evaluation artifacts are stored outside git. This report contains aggregate metrics only.

- Cases: {total}; provider-completed: {completed} ({pct(completed):.1%})
- Sense accuracy: {sense_correct}/{total} ({pct(sense_correct):.1%})
- Blank/abstain/error rate: {blank}/{total} ({pct(blank):.1%})
- Evidence hallucination rate: {hallucinated}/{total} ({pct(hallucinated):.1%})
- Median latency: {statistics.median(latencies) if latencies else 0:.0f} ms; p95: {p95:.0f} ms
- Tokens: {input_tokens:,} input / {output_tokens:,} output
- Estimated total cost: ${cost:.4f}
- Human-reviewed: {len(reviewed)}/{total}
- Mean Vietnamese naturalness: {mean_rating(reviewed, 'natural_vietnamese_0_to_2'):.2f}/2
- Mean contextual accuracy: {mean_rating(reviewed, 'semantic_accuracy_0_to_2'):.2f}/2
- Mean B1–B2 appropriateness: {mean_rating(reviewed, 'b1_b2_appropriateness_0_to_2'):.2f}/2
- Mean concision/distinctiveness: {mean_rating(reviewed, 'concision_distinctiveness_0_to_2'):.2f}/2
- Mean collocation usefulness: {mean_rating(reviewed, 'collocations_useful_0_to_2'):.2f}/2
- Successful Enrichments: {successful}; cost per successful: ${cost / successful if successful else 0:.4f}
"""
    args.report.write_text(report, encoding="utf-8")
    print(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
