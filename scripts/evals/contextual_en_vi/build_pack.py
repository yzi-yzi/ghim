#!/usr/bin/env python3
"""Build a private stratified contextual EN→VI evaluation pack."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import random
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from wordfreq import zipf_frequency


DUMP_DATE = "2026-09-02"
EXTRACTED_DATE = "2026-09-09"
WIKTEXTRACT_COMMIT = "ccec6f1"
LICENSE = "CC BY-SA 4.0 and GFDL"
TOKEN_RE = re.compile(r"[A-Za-z]+(?:['’-][A-Za-z]+)*")
PROPER_NAME_RE = re.compile(r"^[A-Z][A-Za-z]*(?:[ '\-][A-Za-z]+)*$")
SPACE_RE = re.compile(r"\s+")

QUOTAS = {
    "polysemy": 70,
    "multiword": 40,
    "inflection": 50,
    "proper_noun": 30,
    "difficult_context": 60,
}


@dataclass
class Reservoir:
    capacity: int
    random: random.Random
    seen: int = 0
    values: List[Dict[str, Any]] = field(default_factory=list)

    def add(self, value: Dict[str, Any]) -> None:
        self.seen += 1
        if len(self.values) < self.capacity:
            self.values.append(value)
            return
        index = self.random.randrange(self.seen)
        if index < self.capacity:
            self.values[index] = value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--seed", type=int, default=20260912)
    parser.add_argument("--max-records", type=int)
    return parser.parse_args()


def jsonl(path: Path) -> Iterable[str]:
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("r", encoding="utf-8")


def first_string(value: Any) -> Optional[str]:
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, list):
        return next(
            (item.strip() for item in value if isinstance(item, str) and item.strip()),
            None,
        )
    return None


def clean_context(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    text = SPACE_RE.sub(" ", value).strip()
    words = TOKEN_RE.findall(text)
    if len(words) < 5 or len(words) > 32 or len(text) > 240:
        return None
    if "http://" in text or "https://" in text:
        return None
    return text


def senses_for(entry: Dict[str, Any]) -> List[Dict[str, Any]]:
    senses: List[Dict[str, Any]] = []
    for ordinal, raw in enumerate(entry.get("senses") or [], start=1):
        if not isinstance(raw, dict):
            continue
        gloss = first_string(raw.get("glosses"))
        if not gloss:
            continue
        senses.append(
            {
                "id": f"s{ordinal}",
                "gloss": gloss,
                "raw_gloss": first_string(raw.get("raw_glosses")),
                "tags": raw.get("tags") or [],
                "topics": raw.get("topics") or [],
                "form_of": [
                    item.get("word")
                    for item in raw.get("form_of") or []
                    if isinstance(item, dict) and isinstance(item.get("word"), str)
                ],
                "_raw": raw,
            }
        )
    return senses


def pronunciations(entry: Dict[str, Any]) -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []
    seen = set()
    for sound in entry.get("sounds") or []:
        if not isinstance(sound, dict):
            continue
        item = {
            "ipa": first_string(sound.get("ipa")),
            "audio_url": first_string(sound.get("mp3_url"))
            or first_string(sound.get("ogg_url")),
            "tags": sound.get("tags") or [],
        }
        key = (item["ipa"], item["audio_url"], tuple(item["tags"]))
        if key in seen or not any((item["ipa"], item["audio_url"])):
            continue
        seen.add(key)
        result.append(item)
        if len(result) == 8:
            break
    return result


def route_category(
    word: str, pos: str, sense: Dict[str, Any], sense_count: int, context: str
) -> Optional[str]:
    token_count = len(TOKEN_RE.findall(context))
    if " " in word and 2 <= len(word.split()) <= 5 and zipf_frequency(word, "en") >= 2.5:
        return "multiword"
    if (
        pos in {"name", "proper-noun", "proper_noun"}
        and PROPER_NAME_RE.fullmatch(word)
        and zipf_frequency(word, "en") >= 2.5
    ):
        return "proper_noun"
    if sense["form_of"] and zipf_frequency(word, "en") >= 3.0:
        return "inflection"
    if sense_count >= 2 and token_count <= 11 and zipf_frequency(word, "en") >= 3.5:
        return "difficult_context"
    if sense_count >= 2 and zipf_frequency(word, "en") >= 3.5:
        return "polysemy"
    return None


def public_sense(sense: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in sense.items() if key != "_raw"}


def candidate_case(
    entry: Dict[str, Any], senses: List[Dict[str, Any]], sense: Dict[str, Any],
    example: Dict[str, Any], category: str,
) -> Optional[Dict[str, Any]]:
    context = clean_context(example.get("text"))
    word = first_string(entry.get("word"))
    if not context or not word:
        return None
    # `type=example` and no reference excludes embedded citations/quotations.
    if example.get("type") != "example" or example.get("ref"):
        return None
    lemma = sense["form_of"][0] if sense["form_of"] else word
    candidate_senses = senses[:12]
    if sense not in candidate_senses:
        candidate_senses = senses[:11] + [sense]
    fingerprint = hashlib.sha256(
        f"{category}\0{word}\0{context}\0{sense['id']}".encode("utf-8")
    ).hexdigest()
    return {
        "case_id": fingerprint[:16],
        "category": category,
        "target_surface": word,
        "expected_lemma": lemma,
        "expected_sense_id": sense["id"],
        "context": context,
        "part_of_speech": entry.get("pos"),
        "candidate_senses": [public_sense(value) for value in candidate_senses],
        "pronunciation_candidates": pronunciations(entry),
        "source": {
            "type": "wiktionary_usage_example",
            "page": word,
            "url": f"https://en.wiktionary.org/wiki/{word.replace(' ', '_')}",
            "dump_date": DUMP_DATE,
            "extracted_date": EXTRACTED_DATE,
            "wiktextract_commit": WIKTEXTRACT_COMMIT,
            "license": LICENSE,
        },
    }


def write_jsonl(path: Path, values: List[Dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for value in values:
            handle.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")))
            handle.write("\n")


def main() -> int:
    args = parse_args()
    if not args.input.is_file():
        raise SystemExit(f"input not found: {args.input}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)
    reservoirs = {
        name: Reservoir(capacity=quota, random=random.Random(rng.randrange(2**63)))
        for name, quota in QUOTAS.items()
    }
    seen_contexts = set()
    scanned = 0

    with jsonl(args.input) as handle:
        for line in handle:
            scanned += 1
            if args.max_records and scanned > args.max_records:
                break
            if scanned % 500_000 == 0:
                counts = " ".join(
                    f"{name}={reservoir.seen}" for name, reservoir in reservoirs.items()
                )
                print(f"scanned={scanned:,} candidates[{counts}]", flush=True)
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if entry.get("lang_code") != "en":
                continue
            word = first_string(entry.get("word"))
            pos = first_string(entry.get("pos")) or ""
            if not word or len(word) > 60:
                continue
            senses = senses_for(entry)
            if not senses:
                continue
            for sense in senses:
                raw_sense = sense["_raw"]
                for example in raw_sense.get("examples") or []:
                    if not isinstance(example, dict):
                        continue
                    context = clean_context(example.get("text"))
                    if not context:
                        continue
                    category = route_category(word, pos, sense, len(senses), context)
                    if not category:
                        continue
                    context_key = hashlib.sha256(context.encode("utf-8")).digest()
                    if context_key in seen_contexts:
                        continue
                    case = candidate_case(entry, senses, sense, example, category)
                    if not case:
                        continue
                    seen_contexts.add(context_key)
                    reservoirs[category].add(case)

    missing = {
        name: reservoir.capacity - len(reservoir.values)
        for name, reservoir in reservoirs.items()
        if len(reservoir.values) < reservoir.capacity
    }
    if missing:
        raise SystemExit(f"insufficient eligible cases: {missing}")

    gold = []
    for name in QUOTAS:
        gold.extend(sorted(reservoirs[name].values, key=lambda value: value["case_id"]))
    rng.shuffle(gold)
    requests = [
        {
            key: value
            for key, value in case.items()
            if key not in {"expected_lemma", "expected_sense_id"}
        }
        for case in gold
    ]
    write_jsonl(args.output_dir / "gold.jsonl", gold)
    write_jsonl(args.output_dir / "requests.jsonl", requests)
    manifest = {
        "case_count": len(gold),
        "quotas": QUOTAS,
        "seed": args.seed,
        "records_scanned": scanned,
        "source": {
            "dump_date": DUMP_DATE,
            "extracted_date": EXTRACTED_DATE,
            "wiktextract_commit": WIKTEXTRACT_COMMIT,
            "license": LICENSE,
        },
        "candidate_counts": {
            name: reservoir.seen for name, reservoir in reservoirs.items()
        },
    }
    (args.output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
