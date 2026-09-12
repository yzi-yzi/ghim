# Contextual EN→VI enrichment evaluation

This evaluation is deliberately two-stage:

1. Build a private, deterministic, license-safe pack from raw Wiktextract.
2. Run a provider, compute objective checks, then complete blinded human review.

Full source contexts, model outputs, and reviewer sheets stay outside git under
`/private/tmp`. The repository contains only the generator, runner, scorer,
schema, and aggregate report.

## Build 250 cases

Reuse the virtualenv and raw dump from the Wiktextract spike:

```bash
/private/tmp/ghim-wiktextract-venv/bin/python \
  scripts/evals/contextual_en_vi/build_pack.py \
  --input /private/tmp/raw-wiktextract-data.jsonl.gz \
  --output-dir /private/tmp/ghim-en-vi-eval
```

The quotas are 70 polysemy, 40 multiword expressions, 50 inflections, 30
proper nouns, and 60 difficult/short contexts.

Freeze the pre-registered 50-case stronger-model anchor before generation:

```bash
/private/tmp/ghim-wiktextract-venv/bin/python \
  scripts/evals/contextual_en_vi/select_anchor.py \
  --gold /private/tmp/ghim-en-vi-eval/gold.jsonl \
  --output /private/tmp/ghim-en-vi-eval/anchor-requests.jsonl \
  --manifest /private/tmp/ghim-en-vi-eval/anchor-manifest.json
```

Before any provider call, have a bilingual reviewer complete the private gold
confirmation sheet:

```bash
/private/tmp/ghim-wiktextract-venv/bin/python \
  scripts/evals/contextual_en_vi/prepare_gold_review.py \
  --gold /private/tmp/ghim-en-vi-eval/gold.jsonl \
  --output /private/tmp/ghim-en-vi-eval/gold-review.csv
```

The provisional Sense comes from the Wiktionary Sense containing the usage
example. It is evidence for the reviewer, not a substitute for human judgment.

## Run a provider

The runner uses the OpenAI Responses API and strict JSON Schema. It resumes by
case ID, logs latency and token usage, and never sends quotations or private
captured text.

```bash
export OPENAI_API_KEY=...
export GHIM_EVAL_MODEL=...

/private/tmp/ghim-wiktextract-venv/bin/python \
  scripts/evals/contextual_en_vi/run_openai.py \
  --input /private/tmp/ghim-en-vi-eval/requests.jsonl \
  --output /private/tmp/ghim-en-vi-eval/outputs.jsonl
```

Run the anchor file separately with `--model gpt-5.6-terra` and a distinct
output path. The primary 250 plus the 50-case anchor produce 300 paid outputs.

Do not put secrets in command arguments, shell history, reports, or git.

## Score and review

```bash
/private/tmp/ghim-wiktextract-venv/bin/python \
  scripts/evals/contextual_en_vi/score.py \
  --gold /private/tmp/ghim-en-vi-eval/gold.jsonl \
  --outputs /private/tmp/ghim-en-vi-eval/outputs.jsonl \
  --review-csv /private/tmp/ghim-en-vi-eval/human-review.csv \
  --report /private/tmp/ghim-en-vi-eval/results.md \
  --input-usd-per-million 0 \
  --output-usd-per-million 0
```

Fill the reviewer columns without looking at provider/model metadata, then run
the same command again. Replace the zero price placeholders with official
prices for the exact model snapshot used.
