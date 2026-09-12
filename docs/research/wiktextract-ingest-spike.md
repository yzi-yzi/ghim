# Wiktextract raw-ingestion spike

**Decision:** proceed with Kaikki/Wiktextract as Ghim's lexical backbone. The
raw feed comfortably passes the lexical viability gate, but Vietnamese
translations, examples, and audio must remain optional enrichment layers with
their own quality and license controls.

## What was tested

On 2026-09-12, the spike streamed the official 2.86 GB compressed raw feed into
a disposable SQLite schema. The snapshot was extracted on 2026-09-09 from the
English Wiktionary dump dated 2026-09-02 with Wiktextract commit `ccec6f1`.
Kaikki publishes this feed as JSONL and says it is normally refreshed at least
weekly ([official raw downloads](https://kaikki.org/dictionary/rawdata.html)).

The target set was 7,500 common English tokens selected at runtime with
`wordfreq==3.1.1`, then restricted to lowercase alphabetic headwords with
internal apostrophes/hyphens. That ranking is only a reproducible sampling
mechanism; it is not starter-deck policy.

The importer scanned 10,913,996 raw records in 4.7 minutes without expanding
the 23.1 GB JSONL to disk. The generated SQLite database was 122.8 MB.

## Results

| Field | Target headwords | Coverage of 7,474 found |
|---|---:|---:|
| Entry found | 7,474 / 7,500 | 99.7% of targets |
| Part of speech | 7,474 | 100.0% |
| At least one Sense | 7,474 | 100.0% |
| At least one normalized gloss | 7,474 | 100.0% |
| IPA | 7,010 | 93.8% |
| Inflected forms | 5,804 | 77.7% |
| Usage examples (not quotations) | 4,999 | 66.9% |
| Vietnamese translation | 3,527 | 47.2% |
| Audio filename or URL | 6,834 | 91.4% |

Imported volume:

- 21,081 Lexical Entries and 76,088 Senses;
- 34,834 Forms and 81,349 Pronunciation records;
- 34,128 usage Examples after rejecting 50,712 quotations;
- 1,085,919 translations, including 9,787 Vietnamese candidates.

The accepted gate was at least 95% target coverage, at least 90% with a
glossed Sense, and no systemic parser failure. The measured result passes all
three.

## Mapping into the Ghim model

| Raw Wiktextract | Spike model | Production implication |
|---|---|---|
| `word` | Lexical Unit headword | Normalize and resolve a captured token before lookup. |
| One English/POS raw record | Lexical Entry | Preserve raw-record identity; POS plus etymology is not unique. |
| `senses[]` | Sense | Keep normalized and raw gloss, tags, topics, and source order. |
| `forms[]` | Form | Filter sentinel/empty values and expose only learner-useful forms. |
| `sounds[]` | Pronunciation | Separate IPA from audio asset metadata and accent tags. |
| `senses[].examples[]` | Example candidate | Only `type=example` is eligible by default; reject quotations. |
| Entry-level `translations[]` | Translation candidate | `sense` is free text and needs a separate Sense-alignment step. |

The source includes no stable ID for the product's canonical Sense. Production
ingestion should therefore create immutable source evidence first, then align
it to Ghim Senses in a versioned follow-up process. It must not silently replace
learner-edited material when a weekly dump changes.

## Important anomalies

The 26 missing targets were `iii`, `von`, and 24 possessive tokens such as
`world's`, `children's`, and `government's`. This is mainly a token-to-lemma
normalization problem, not missing common vocabulary. Starter vocabulary and
capture lookup should lemmatize possessives before lexical lookup and should
not treat a corpus-frequency token list as a list of dictionary headwords.

Other observations:

- 36 of 76,088 Senses lacked a normalized gloss. These should enter a
  quarantine/inspection path rather than being learner-visible.
- 299 weak identity groups contained 309 additional records sharing the same
  `(headword, POS, etymology, source page)` tuple. All were retained. A source
  record hash or snapshot-local ordinal is required for idempotent imports.
- 27,427 `sounds[]` objects contained only fields such as rhyme, homophone,
  or enPR and were correctly excluded from the IPA/audio table.
- Vietnamese translation coverage is useful as a hint but insufficient as the
  learner-facing EN→VI layer. Translation `sense` values are English free text,
  not foreign keys to `senses[]`.
- Usage examples fell from an apparent 81.4% to 66.9% after correctly excluding
  embedded quotations. This validates the default-deny quotation policy.

Database checks found zero orphan Senses and zero orphan Translations. Sample
Vietnamese mappings—including `to → để/cho/đến`, `and → và`, and `of → của/về`—
also confirmed that entry-level translation extraction is working.

## Provenance and licensing

Wiktionary text is available under CC BY-SA 4.0 and GFDL; attribution, license
links, ShareAlike obligations for adaptations, and separately licensed embedded
material still apply ([Wiktionary copyright policy](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)).

The spike records source URL, dump date, extraction date, extractor commit, and
source-text license at snapshot level. Production needs `origin`, source page,
revision/snapshot, license, attribution, and modified status at field or source
record level. Source evidence, Ghim/AI-generated enrichment, and learner-edited
material must remain distinct.

Audio URLs only prove discoverability. Commons licensing is per file, so Ghim
must resolve each file page and persist author, license/version, attribution,
verification time, and a media hash before caching or redistributing audio
([Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)).

## Recommendation for production architecture

1. Download and verify a pinned raw snapshot in a background data job.
2. Stream English records into immutable, versioned source-evidence tables.
3. Quarantine malformed/glossless data and retain a source record hash.
4. Normalize a captured surface form to candidate Lexical Units.
5. Align entry-level translation hints to canonical Senses asynchronously.
6. Use grounded EN→VI enrichment when the source lacks an appropriate learner
   gloss; preserve provenance and user edits.
7. Verify Commons licenses per audio asset or fall back to Google TTS.

The production importer should not run in a Vercel request. It belongs in a
repeatable background/import job with staged tables, idempotent promotion, and
metrics for coverage drift between snapshots.

## Reproduction artifacts

The runnable importer, fixture, pinned dependency, and commands live in
[`scripts/spikes/wiktextract/`](../../scripts/spikes/wiktextract/README.md).
The 2.86 GB raw dump and 122.8 MB SQLite result are intentionally kept out of
the repository under `/private/tmp`.
