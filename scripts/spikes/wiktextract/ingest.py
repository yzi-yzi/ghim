#!/usr/bin/env python3
"""Stream a raw Wiktextract JSONL dump into a disposable SQLite model."""

from __future__ import annotations

import argparse
import gzip
import json
import re
import sqlite3
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Iterator, Optional

from wordfreq import top_n_list


WORD_RE = re.compile(r"^[a-z]+(?:[-'][a-z]+)*$")

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE lexical_unit (
  id INTEGER PRIMARY KEY,
  headword TEXT NOT NULL UNIQUE,
  frequency_rank INTEGER NOT NULL UNIQUE,
  found INTEGER NOT NULL DEFAULT 0 CHECK (found IN (0, 1))
);

CREATE TABLE lexical_entry (
  id INTEGER PRIMARY KEY,
  lexical_unit_id INTEGER NOT NULL REFERENCES lexical_unit(id),
  part_of_speech TEXT,
  etymology_number INTEGER,
  etymology_text TEXT,
  source_page TEXT NOT NULL,
  raw_json_bytes INTEGER NOT NULL
);

CREATE TABLE sense (
  id INTEGER PRIMARY KEY,
  lexical_entry_id INTEGER NOT NULL REFERENCES lexical_entry(id),
  ordinal INTEGER NOT NULL,
  gloss TEXT,
  raw_gloss TEXT,
  tags_json TEXT NOT NULL,
  topics_json TEXT NOT NULL,
  UNIQUE (lexical_entry_id, ordinal)
);

CREATE TABLE form (
  id INTEGER PRIMARY KEY,
  lexical_entry_id INTEGER NOT NULL REFERENCES lexical_entry(id),
  form TEXT NOT NULL,
  tags_json TEXT NOT NULL
);

CREATE TABLE pronunciation (
  id INTEGER PRIMARY KEY,
  lexical_entry_id INTEGER NOT NULL REFERENCES lexical_entry(id),
  ipa TEXT,
  audio_filename TEXT,
  ogg_url TEXT,
  mp3_url TEXT,
  tags_json TEXT NOT NULL
);

CREATE TABLE example (
  id INTEGER PRIMARY KEY,
  sense_id INTEGER NOT NULL REFERENCES sense(id),
  text TEXT NOT NULL,
  translation TEXT,
  reference TEXT
);

CREATE TABLE translation (
  id INTEGER PRIMARY KEY,
  lexical_entry_id INTEGER NOT NULL REFERENCES lexical_entry(id),
  language_code TEXT NOT NULL,
  word TEXT NOT NULL,
  source_sense TEXT,
  romanization TEXT,
  tags_json TEXT NOT NULL
);

CREATE INDEX lexical_entry_unit_idx ON lexical_entry(lexical_unit_id);
CREATE INDEX lexical_entry_identity_idx ON lexical_entry(
  lexical_unit_id,
  COALESCE(part_of_speech, ''),
  COALESCE(etymology_number, -1),
  source_page
);
CREATE INDEX sense_entry_idx ON sense(lexical_entry_id);
CREATE INDEX translation_language_idx ON translation(language_code);
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--target-count", type=int, default=7500)
    parser.add_argument(
        "--source-url",
        default="https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz",
    )
    parser.add_argument("--dump-date", default="2026-09-02")
    parser.add_argument("--extracted-date", default="2026-09-09")
    parser.add_argument("--wiktextract-commit", default="ccec6f1")
    parser.add_argument(
        "--source-text-license", default="CC BY-SA 4.0 and GFDL"
    )
    parser.add_argument(
        "--source-copyright-url",
        default="https://en.wiktionary.org/wiki/Wiktionary:Copyrights",
    )
    return parser.parse_args()


def common_headwords(count: int) -> list[str]:
    if count < 1:
        raise ValueError("target-count must be positive")

    # Ask for surplus candidates because wordfreq also contains punctuation,
    # numbers, abbreviations, and multi-word strings outside this spike's scope.
    candidates = top_n_list("en", max(count * 3, 10000), ascii_only=True)
    selected: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        word = candidate.casefold()
        if word in seen or not WORD_RE.fullmatch(word):
            continue
        seen.add(word)
        selected.append(word)
        if len(selected) == count:
            return selected
    raise RuntimeError(f"wordfreq returned only {len(selected)} usable headwords")


def open_jsonl(path: Path) -> Iterable[str]:
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8")
    return path.open("r", encoding="utf-8")


def json_text(value: Any) -> str:
    return json.dumps(value or [], ensure_ascii=False, separators=(",", ":"))


def first_text(value: Any) -> Optional[str]:
    if isinstance(value, list):
        return next((item for item in value if isinstance(item, str) and item), None)
    return value if isinstance(value, str) and value else None


def source_page(entry: dict[str, Any]) -> str:
    return str(entry.get("word") or "")


def normalized_examples(
    sense: dict[str, Any], stats: Counter[str]
) -> Iterator[dict[str, Optional[str]]]:
    for value in sense.get("examples") or []:
        if not isinstance(value, dict):
            continue
        if value.get("type") == "quotation":
            stats["quotations_rejected"] += 1
            continue
        text = value.get("text")
        if not isinstance(text, str) or not text.strip():
            continue
        yield {
            "text": text.strip(),
            "translation": first_text(value.get("translation")),
            "reference": first_text(value.get("ref")),
        }


def iter_translations(entry: dict[str, Any]) -> Iterator[dict[str, Any]]:
    for value in entry.get("translations") or []:
        if not isinstance(value, dict):
            continue
        lang_code = value.get("code") or value.get("lang_code")
        word = value.get("word")
        if isinstance(lang_code, str) and isinstance(word, str) and word.strip():
            yield {
                "language_code": lang_code,
                "word": word.strip(),
                "source_sense": first_text(value.get("sense")),
                "romanization": first_text(value.get("roman")),
                "tags": value.get("tags"),
            }


def reset_database(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    connection = sqlite3.connect(path)
    connection.executescript(SCHEMA)
    return connection


def insert_entry(
    connection: sqlite3.Connection,
    lexical_unit_id: int,
    entry: dict[str, Any],
    raw_bytes: int,
    stats: Counter[str],
) -> None:
    etymology_text = first_text(entry.get("etymology_texts")) or first_text(
        entry.get("etymology_text")
    )
    cursor = connection.execute(
        """
        INSERT INTO lexical_entry(
          lexical_unit_id, part_of_speech, etymology_number, etymology_text,
          source_page, raw_json_bytes
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            lexical_unit_id,
            entry.get("pos"),
            entry.get("etymology_number"),
            etymology_text,
            source_page(entry),
            raw_bytes,
        ),
    )
    entry_id = int(cursor.lastrowid)
    stats["entries"] += 1
    if not entry.get("pos"):
        stats["entries_missing_pos"] += 1

    senses = entry.get("senses") or []
    if not senses:
        stats["entries_missing_senses"] += 1
    for ordinal, sense_value in enumerate(senses, start=1):
        if not isinstance(sense_value, dict):
            stats["malformed_senses"] += 1
            continue
        gloss = first_text(sense_value.get("glosses"))
        raw_gloss = first_text(sense_value.get("raw_glosses"))
        sense_cursor = connection.execute(
            """
            INSERT INTO sense(
              lexical_entry_id, ordinal, gloss, raw_gloss, tags_json, topics_json
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id,
                ordinal,
                gloss,
                raw_gloss,
                json_text(sense_value.get("tags")),
                json_text(sense_value.get("topics")),
            ),
        )
        sense_id = int(sense_cursor.lastrowid)
        stats["senses"] += 1
        if not gloss:
            stats["senses_missing_gloss"] += 1

        for example_value in normalized_examples(sense_value, stats):
            connection.execute(
                """INSERT INTO example(sense_id, text, translation, reference)
                   VALUES (?, ?, ?, ?)""",
                (
                    sense_id,
                    example_value["text"],
                    example_value["translation"],
                    example_value["reference"],
                ),
            )
            stats["examples"] += 1

    for translation_value in iter_translations(entry):
        connection.execute(
            """
            INSERT INTO translation(
              lexical_entry_id, language_code, word, source_sense,
              romanization, tags_json
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id,
                translation_value["language_code"],
                translation_value["word"],
                translation_value["source_sense"],
                translation_value["romanization"],
                json_text(translation_value["tags"]),
            ),
        )
        stats["translations"] += 1
        if translation_value["language_code"] == "vi":
            stats["vietnamese_translations"] += 1

    for form_value in entry.get("forms") or []:
        if not isinstance(form_value, dict):
            stats["malformed_forms"] += 1
            continue
        form = form_value.get("form")
        if not isinstance(form, str) or not form.strip() or form == "-":
            stats["forms_rejected"] += 1
            continue
        connection.execute(
            "INSERT INTO form(lexical_entry_id, form, tags_json) VALUES (?, ?, ?)",
            (entry_id, form.strip(), json_text(form_value.get("tags"))),
        )
        stats["forms"] += 1

    for sound_value in entry.get("sounds") or []:
        if not isinstance(sound_value, dict):
            stats["malformed_sounds"] += 1
            continue
        ipa = first_text(sound_value.get("ipa"))
        audio_filename = first_text(sound_value.get("audio"))
        ogg_url = first_text(sound_value.get("ogg_url"))
        mp3_url = first_text(sound_value.get("mp3_url"))
        if not any((ipa, audio_filename, ogg_url, mp3_url)):
            stats["sounds_rejected"] += 1
            continue
        connection.execute(
            """
            INSERT INTO pronunciation(
              lexical_entry_id, ipa, audio_filename, ogg_url, mp3_url, tags_json
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                entry_id,
                ipa,
                audio_filename,
                ogg_url,
                mp3_url,
                json_text(sound_value.get("tags")),
            ),
        )
        stats["pronunciations"] += 1
        if ipa:
            stats["ipa_records"] += 1
        if audio_filename or ogg_url or mp3_url:
            stats["audio_records"] += 1


def scalar(connection: sqlite3.Connection, query: str) -> int:
    row = connection.execute(query).fetchone()
    return int(row[0]) if row else 0


def percent(numerator: int, denominator: int) -> str:
    return "0.0%" if denominator == 0 else f"{numerator / denominator:.1%}"


def build_report(
    args: argparse.Namespace,
    connection: sqlite3.Connection,
    stats: Counter[str],
    elapsed: float,
    lines_read: int,
) -> str:
    targets = scalar(connection, "SELECT COUNT(*) FROM lexical_unit")
    found = scalar(connection, "SELECT COUNT(*) FROM lexical_unit WHERE found = 1")
    entries = scalar(connection, "SELECT COUNT(*) FROM lexical_entry")
    senses = scalar(connection, "SELECT COUNT(*) FROM sense")
    db_bytes = args.database.stat().st_size
    input_bytes = args.input.stat().st_size

    coverage_queries = {
        "part of speech": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry WHERE part_of_speech IS NOT NULL",
        "at least one sense": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry e JOIN sense s ON s.lexical_entry_id=e.id",
        "at least one gloss": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry e JOIN sense s ON s.lexical_entry_id=e.id WHERE s.gloss IS NOT NULL",
        "IPA": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry e JOIN pronunciation p ON p.lexical_entry_id=e.id WHERE p.ipa IS NOT NULL",
        "forms": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry e JOIN form f ON f.lexical_entry_id=e.id",
        "examples": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry e JOIN sense s ON s.lexical_entry_id=e.id JOIN example x ON x.sense_id=s.id",
        "Vietnamese translation": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry e JOIN translation t ON t.lexical_entry_id=e.id WHERE t.language_code='vi'",
        "audio metadata": "SELECT COUNT(DISTINCT lexical_unit_id) FROM lexical_entry e JOIN pronunciation p ON p.lexical_entry_id=e.id WHERE p.audio_filename IS NOT NULL OR p.ogg_url IS NOT NULL OR p.mp3_url IS NOT NULL",
    }
    coverage = [
        (label, scalar(connection, query)) for label, query in coverage_queries.items()
    ]

    lines = [
        "# Wiktextract raw-ingestion spike report",
        "",
        "> Generated by `scripts/spikes/wiktextract/ingest.py`. The SQLite database is a disposable spike artifact, not a production schema.",
        "",
        "## Snapshot and run",
        "",
        f"- Source: [{args.source_url}]({args.source_url})",
        f"- Wiktionary dump: `{args.dump_date}`; extracted: `{args.extracted_date}`; Wiktextract: `{args.wiktextract_commit}`",
        f"- Source text license: {args.source_text_license} ([policy]({args.source_copyright_url}))",
        f"- Compressed input: {input_bytes / 1_000_000_000:.2f} GB",
        f"- JSONL records scanned: {lines_read:,}",
        f"- Target headwords: {targets:,}; found: {found:,} ({percent(found, targets)})",
        f"- Imported: {entries:,} lexical entries and {senses:,} senses",
        f"- Elapsed: {elapsed / 60:.1f} minutes; SQLite: {db_bytes / 1_000_000:.1f} MB",
        "",
        "## Field coverage by target headword",
        "",
        "| Field | Headwords | Coverage of found |",
        "|---|---:|---:|",
    ]
    lines.extend(
        f"| {label} | {value:,} | {percent(value, found)} |"
        for label, value in coverage
    )
    lines.extend(
        [
            "",
            "## Mapping tested",
            "",
            "- `word` → Lexical Unit headword; each raw English/POS record → Lexical Entry.",
            "- `senses[]` → Sense; first normalized gloss is the display candidate while raw gloss and tags remain available.",
            "- `forms[]` → inflected Form; `sounds[]` → Pronunciation/audio-source metadata.",
            "- `senses[].examples[]` with `type=example` → candidate Example; entry-level `translations[]` → source Translation awaiting Sense alignment.",
            "- Dump date, extractor commit, source URL, and per-entry source page provide minimum provenance.",
            "",
            "## Anomalies and rejected fields",
            "",
            "- Repeated `(headword, POS, etymology, page)` identities are retained because that tuple is not a safe raw-record key.",
            f"- Entries missing POS: {stats['entries_missing_pos']:,}; entries missing senses: {stats['entries_missing_senses']:,}",
            f"- Senses missing normalized gloss: {stats['senses_missing_gloss']:,}; malformed senses: {stats['malformed_senses']:,}",
            f"- Empty/sentinel forms rejected: {stats['forms_rejected']:,}; malformed forms: {stats['malformed_forms']:,}",
            f"- Empty sounds rejected: {stats['sounds_rejected']:,}; malformed sounds: {stats['malformed_sounds']:,}",
            f"- Quotations rejected from learner examples: {stats['quotations_rejected']:,}",
            "- Categories, descendants, derived/related terms, Wikipedia links, and full raw objects are intentionally not modeled in this spike.",
            "- Audio URLs prove discoverability, not redistribution rights. A separate Commons license-verification step remains mandatory.",
            "",
            "## Product interpretation",
            "",
            "- Wiktextract is suitable as the lexical backbone if headword, POS, sense, gloss, and pronunciation coverage are strong.",
            "- Vietnamese translation and example coverage should be treated as opportunistic. Ghim still needs grounded contextual EN→VI enrichment.",
            "- The production importer should be versioned, idempotent, preserve source lineage, and quarantine malformed records instead of silently dropping them.",
            "- Frequency rank is sampling metadata only; starter-deck curation needs its own pedagogical policy.",
            "",
            "## Viability gate",
            "",
            "Evaluate after the measured coverage table is populated. Recommended gate: proceed when ≥95% of targets are found, ≥90% have a glossed sense, and the raw mapping has no systemic parser failures. Sparse Vietnamese translations or licensed audio are expected and should not fail the lexical-source decision.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    if not args.input.is_file():
        print(f"input does not exist: {args.input}", file=sys.stderr)
        return 2

    started = time.monotonic()
    words = common_headwords(args.target_count)
    connection = reset_database(args.database)
    connection.executemany(
        "INSERT INTO lexical_unit(headword, frequency_rank) VALUES (?, ?)",
        ((word, rank) for rank, word in enumerate(words, start=1)),
    )
    target_ids = {
        word: unit_id
        for unit_id, word in connection.execute("SELECT id, headword FROM lexical_unit")
    }
    connection.executemany(
        "INSERT INTO metadata(key, value) VALUES (?, ?)",
        (
            ("source_url", args.source_url),
            ("dump_date", args.dump_date),
            ("extracted_date", args.extracted_date),
            ("wiktextract_commit", args.wiktextract_commit),
            ("source_text_license", args.source_text_license),
            ("source_copyright_url", args.source_copyright_url),
            ("target_count", str(args.target_count)),
        ),
    )

    stats: Counter[str] = Counter()
    lines_read = 0
    with open_jsonl(args.input) as source:
        for line in source:
            lines_read += 1
            if lines_read % 250_000 == 0:
                connection.commit()
                print(
                    f"scanned={lines_read:,} found={stats['found_headwords']:,} entries={stats['entries']:,}",
                    flush=True,
                )
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                stats["malformed_json"] += 1
                continue
            if entry.get("lang_code") != "en":
                continue
            word_value = entry.get("word")
            if not isinstance(word_value, str):
                continue
            normalized = word_value.casefold()
            lexical_unit_id = target_ids.get(normalized)
            if lexical_unit_id is None:
                continue
            found_update = connection.execute(
                "UPDATE lexical_unit SET found = 1 WHERE id = ? AND found = 0",
                (lexical_unit_id,),
            )
            if found_update.rowcount:
                stats["found_headwords"] += 1
            insert_entry(
                connection,
                lexical_unit_id,
                entry,
                len(line.encode("utf-8")),
                stats,
            )

    connection.commit()
    connection.execute("PRAGMA optimize")
    connection.commit()
    elapsed = time.monotonic() - started
    report = build_report(args, connection, stats, elapsed, lines_read)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(report, encoding="utf-8")
    print(report)
    connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
