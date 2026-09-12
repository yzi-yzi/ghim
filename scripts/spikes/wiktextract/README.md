# Wiktextract ingestion spike

This throwaway spike tests whether the raw English-Wiktionary Wiktextract feed
can support Ghim's lexical-unit and sense model for 5,000–10,000 common English
headwords.

It deliberately writes the downloaded dump and generated SQLite database
outside the repository. Do not commit either artifact.

## Reproduce

```bash
python3 -m venv /private/tmp/ghim-wiktextract-venv
/private/tmp/ghim-wiktextract-venv/bin/pip install \
  -r scripts/spikes/wiktextract/requirements.txt

curl --fail --location --continue-at - \
  --output /private/tmp/raw-wiktextract-data.jsonl.gz \
  https://kaikki.org/dictionary/raw-wiktextract-data.jsonl.gz

/private/tmp/ghim-wiktextract-venv/bin/python \
  scripts/spikes/wiktextract/ingest.py \
  --input /private/tmp/raw-wiktextract-data.jsonl.gz \
  --database /private/tmp/ghim-wiktextract-spike.sqlite3 \
  --report /private/tmp/ghim-wiktextract-spike-report.md \
  --target-count 7500
```

The importer recreates the output database on each run. Its report records
coverage, anomalies, rejected fields, elapsed time, and storage footprint.

## Scope boundaries

- English entries only (`lang_code == "en"`).
- Frequency ranking selects headwords; it is not product vocabulary policy.
- Quotations are counted but not imported as learner examples.
- Audio metadata is stored as source URLs only; audio files are not downloaded.
- Wiktionary text license/provenance is recorded at snapshot level in the spike;
  production records need field-level origin and modification metadata.
- Vietnamese translations measure source coverage only. They do not replace the
  contextual EN→VI enrichment pipeline.
