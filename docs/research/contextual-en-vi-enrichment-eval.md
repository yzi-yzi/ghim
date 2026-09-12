# Contextual English→Vietnamese enrichment evaluation

> Status: private 250-case pack, 50-case anchor, runner, validator, and scorer
> ready; no paid provider calls have been made because this environment has no
> provider API key.
>
> Verified against primary sources on 2026-09-12. Vendor capabilities, prices,
> model aliases, and data terms can change; re-check them immediately before the
> run. Sections labelled **Recommendation** are Ghim decisions proposed from the
> sourced facts. Empty result fields are intentional.

## Decision this evaluation must support

Decide whether the first production `EnrichmentProvider` can use OpenAI
`gpt-5.6-luna` to turn grounded lexical evidence plus a real English encounter
into:

- the contextually correct Ghim Sense, or an explicit ambiguous/no-match result;
- a short, natural Vietnamese meaning useful to a B1–B2 learner;
- schema-valid material with enough provenance to inspect and reproduce;
- acceptable cost, latency, refusal, and retry rates for asynchronous Capture.

This is not a general machine-translation benchmark. It evaluates the exact
Ghim task and contract described in [`CONTEXT.md`](../../CONTEXT.md), using the
lexical-evidence boundary validated by the
[Wiktextract spike](./wiktextract-ingest-spike.md). It does not evaluate FSRS
or generated examples. Sense choice and Vietnamese meaning are the primary
gate; evidence-bound IPA/audio selection and collocation usefulness are
secondary diagnostics required by the ticket.

## Executive result

**Result:** _Not run._

**Decision:** _Pending: adopt Luna / use a stronger model for some cases / change
prompt or evidence / reject the approach._

**Reason:** _Fill after the blinded human review and operational measurements._

### Preparation completed on 2026-09-12

- Built 250 private, unique Wiktionary usage-example encounters after scanning
  all 10,913,996 records in the pinned raw dump.
- Quotas: 70 polysemy, 40 multiword, 50 inflection, 30 proper-noun, and 60
  difficult/short-context cases.
- Validated that all expected Senses occur in supplied evidence, every ID and
  context is unique, and the blinded request file leaks no gold fields.
- Frozen gold hash: `33426b5745fa2063bdc481592a461b3aff14cb5de111ed7938383042f64f89b9`.
- Frozen request hash: `738b9ba774b731437fa23726a4d15d08ef9de20673ff233692b77108837e8ca6`.
- Frozen 50-case hard-slice request hash:
  `3800deaf90f35a570bfb76031ea8214d7192b208c23d2e46c9c4334993575179`.
- Full contexts and outputs remain under `/private/tmp/ghim-en-vi-eval`; they are
  intentionally absent from git.

## Verified provider and evaluation facts

### OpenAI Responses API

- `gpt-5.6-luna` is positioned for cost-sensitive, high-volume work and supports
  multilingual text, the Responses API, and Structured Outputs. Its standard
  text prices are **$0.20/1M input tokens, $0.02/1M cached input tokens, and
  $1.20/1M output tokens**. The model has no free API tier
  ([official model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna)).
- `gpt-5.6-terra`, the proposed quality anchor, costs **$2.00/1M input,
  $0.20/1M cached input, and $12.00/1M output tokens**
  ([official model page](https://developers.openai.com/api/docs/models/gpt-5.6-terra)).
- Responses Structured Outputs can constrain supported output to a supplied JSON
  Schema. A caller must still handle refusals and incomplete responses instead
  of assuming every response contains usable structured data
  ([Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)).
- A Response exposes `id`, `created_at`, returned `model`, `status`, actual
  `service_tier`, and token `usage`; actual service tier can differ from the
  requested value
  ([Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)).
  The official Node SDK also exposes the server's `x-request-id`, including via
  `.withResponse()`
  ([openai-node configuration](https://github.com/openai/openai-node/blob/main/docs/configuration.md)).
- OpenAI says API content is not used to train or improve models unless the
  customer opts in. Default abuse-monitoring logs can contain prompts and
  responses and are retained for up to 30 days. Responses application state is
  stored by default, so this evaluation must explicitly send `store: false`;
  Zero Data Retention and Modified Abuse Monitoring require approval
  ([OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)).
- The current Luna model page does not publish a distinct dated snapshot. This
  evaluation must not invent one: it records both the requested model ID and the
  returned `response.model`, together with all Ghim-controlled versions.

### Evaluation practice

OpenAI's current evaluation guidance recommends task-specific tests reflecting
real-world distributions, typical and edge cases, expert human labels, explicit
pass/fail thresholds, and randomized blinded human review. It warns against
generic metrics and “vibe-based” evaluation and recommends classification or
pairwise comparison where possible
([official evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)).

For the Vietnamese wording rubric, Ghim adapts only the relevant parts of MQM:
Accuracy, Terminology, Linguistic Conventions, Style, and Audience
Appropriateness. MQM explicitly permits implementers to choose the granularity
appropriate to their environment
([MQM official typology](https://www.themqm.org/mqm-pillars/typology/)).

### Optional provider comparator, not part of the initial gate

Google documents `gemini-3.5-flash-lite` as a stable, high-throughput model that
supports Structured Outputs and is optimized in part for translation
([official model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)).
Its paid standard price is $0.30/1M input and $2.50/1M output/thinking tokens;
its free tier may use content to improve Google products
([official pricing](https://ai.google.dev/gemini-api/docs/pricing)). Unpaid-service
terms permit product improvement and human review and say not to submit
sensitive, confidential, or personal information
([Gemini API terms](https://ai.google.dev/gemini-api/terms)).

**Recommendation:** do not send private learner encounters to Gemini's free
tier. Add Gemini later only on licensed/public cases, or through a paid project,
if OpenAI fails the gate or a real second-provider need appears. Ghim's internal
`EnrichmentProvider` seam already allows that comparison without changing the
domain model.

## Recommended experimental design

### Run size and model matrix

Use **250 unique English encounters** and produce no more than **300 paid model
outputs**:

| Run | Encounters | Purpose |
|---|---:|---|
| `gpt-5.6-luna` candidate | 250 | Primary quality, cost, and latency estimate |
| `gpt-5.6-terra` anchor | 50 | Blinded comparison on the hardest fixed slice |
| **Total** | **300 outputs** | Within the ticket's 200–300 evaluation size |

The 50-case anchor slice must be selected before generation from the ambiguity,
phrasal/idiomatic, noisy-context, and no-supported-Sense strata. Do not select it
after seeing Luna's answers.

Do not add uncounted warm-up calls. Interleave the 50 anchor pairs in randomized
order so time-of-day or provider-load drift does not systematically favor one
model, and retain temporal position so the first-call effect remains visible.

### Encounter corpus

Use encounters that resemble the beachhead user: a Vietnamese B1–B2 learner
reading English for work, study, or self-development. Freeze an immutable
`eval-set-v1` before generating outputs.

The frozen pack uses the ticket's required mutually exclusive primary strata:

| Stratum | Count | Inclusion rule |
|---|---:|---|
| Polysemous/close competing Senses | 70 | At least two supplied glossed Senses; common English expression |
| Multiword expression | 40 | Two to five tokens with corpus-frequency evidence |
| Inflected capture | 50 | Wiktextract `form_of` evidence supplies the expected lemma |
| Proper noun | 30 | Proper-name POS with corpus-frequency evidence |
| Difficult/short context | 60 | At least two Senses and a context of at most 11 tokens |
| **Total** | **250** | |

Each case also retains POS, candidate English Senses, pronunciation candidates,
source page, license, dump/extractor provenance, and context length. Report by
primary stratum and overall. Because the set deliberately over-samples hard
cases, do not claim its raw score is the natural production success rate.

#### Source and privacy rules

- Prefer consented research captures whose exact text may be used for this eval,
  or public/licensed sentences with retained source and license metadata.
- Assign a random `case_id`; remove participant ID, URL, page title, email,
  account numbers, names, and unrelated surrounding content.
- Keep only the highlighted expression, its sentence, and at most one adjacent
  sentence when required to disambiguate. A human performs the redaction before
  any provider sees the case.
- Store the raw consented corpus separately with restricted access. The run
  dataset contains redacted text only. Never commit private encounters.
- Log hashes and IDs in ordinary application telemetry, never full encounter or
  generated text.

### Gold labels before model output

The builder records the source Sense containing each licensed usage example as
a **provisional expected Sense**. This is reproducible evidence, not an
adjudicated human gold label. Two qualified bilingual reviewers must
independently confirm every case before seeing model output. At least one should
have English-teaching, translation, or lexicographic experience with Vietnamese
learners. They receive the expression, minimal context, and the exact candidate
English Senses supplied to the model.

For each case they record:

- `gold_decision`: `matched | ambiguous | no_match`;
- `acceptable_sense_ids`: one or more IDs, never a forced single ID when two
  candidates are genuinely indistinguishable from the available context;
- one or more acceptable Vietnamese glosses as examples, not as a string-match
  oracle;
- essential semantic components and explicitly unacceptable interpretations;
- adjudicated difficulty and notes.

Disagreements are resolved by a third reviewer or a documented joint
adjudication. Preserve both initial labels and the adjudicated gold label. Cases
that cannot be adjudicated are retained as diagnostic cases but excluded from
the exact Sense denominator.

## Fixed generation contract

### Inputs

Every model receives the same fields and ordering:

1. highlighted surface form and normalized Lexical Unit candidate;
2. redacted sentence and optional adjacent sentence;
3. candidate English Senses with stable IDs, POS, short English gloss, and only
   the lexical evidence available in production;
4. learner locale `vi-VN` and target level `B1–B2`;
5. instructions to treat encounter text as quoted data, never as instructions.

Do not leak gold labels, reference Vietnamese glosses, reviewer notes, source
identity, or another model's output into generation.

### Structured output

Use one versioned JSON Schema with strict mode and local validation:

```json
{
  "decision": "matched | ambiguous | no_match",
  "selected_sense_id": "string | null",
  "contextual_meaning_vi": "string | null",
  "short_explanation_vi": "string | null",
  "evidence_sense_ids": ["string"],
  "confidence": "high | medium | low",
  "warnings": ["string"]
}
```

Schema invariants:

- `matched` requires exactly one supplied `selected_sense_id` and a non-empty
  Vietnamese meaning;
- `ambiguous` requires at least two supplied evidence IDs and no fabricated
  choice;
- `no_match` requires a null selected ID and meaning;
- no returned ID may fall outside the supplied candidate list;
- reject HTML/Markdown, control characters, excessive length, and extra fields.

Structured Outputs guarantees shape, not semantic correctness. The human rubric
below remains the quality source of truth.

### Frozen request configuration

Record before the run:

| Field | Luna | Terra anchor |
|---|---|---|
| Requested model | `gpt-5.6-luna` | `gpt-5.6-terra` |
| Endpoint | Responses API | Responses API |
| `store` | `false` | `false` |
| Reasoning effort | `[freeze value]` | `[freeze value]` |
| Service tier | `default` | `default` |
| Prompt version + SHA-256 | `[fill]` | same |
| Schema version + SHA-256 | `[fill]` | same |
| Evidence snapshot/version | `[fill]` | same |
| AI SDK/OpenAI SDK version | `[fill]` | same |

Do not tune prompt, schema, examples, or parameters after inspecting scored
outputs. A change creates a new named run; it never overwrites the old run.

## Human evaluation rubric

Provider and model identity are hidden. Output order is randomized. Two
reviewers score independently; an adjudicator resolves all critical/Major
disagreements and a random 20% of the rest. Give reviewers a short calibration
set with concrete pass, minor, major, ambiguous, and no-match examples before
the scored set.

### A. Sense decision — primary metric

| Label | Rule |
|---|---|
| Exact | Decision is correct and selected ID is in `acceptable_sense_ids` |
| Acceptable overlap | Correct general interpretation but candidate is materially broader/narrower than the gold Sense |
| Wrong | Wrong Sense, forced match, missed supported Sense, or false ambiguity |

The headline **Sense exact rate** counts only `Exact`. Report the other two
separately; never average a wrong Sense away with fluent Vietnamese.

### B. Contextual Vietnamese meaning

For cases whose decision should be `matched`, label each dimension `2 = pass`,
`1 = minor edit`, or `0 = major edit/wrong`:

| Dimension | 2 — pass | 1 — minor edit | 0 — major/critical |
|---|---|---|---|
| Semantic accuracy | Preserves the contextual Sense and essential distinctions | Slight imprecision without changing the interpretation | Mistranslation, omission/addition that changes meaning, or unsupported claim |
| Natural Vietnamese | Idiomatic, grammatical `vi-VN` | Understandable but awkward or locally inconsistent | Misleading, broken, or unnatural enough to impede learning |
| B1–B2 appropriateness | Immediately understandable to the target learner | Needs a small simplification | More obscure than the English item, circular, or unexplained jargon |
| Concision/distinctiveness | Short enough for review and distinguishes the Sense | Removable wording or small ambiguity | Sentence translation/dictionary dump that hides what should be learned |

Tag errors with the adapted MQM category
`accuracy | terminology | linguistic_conventions | style | audience` and severity
`minor | major | critical`. A **critical** error is a confidently wrong Sense or
Vietnamese gloss likely to teach the learner the wrong meaning.

### C. Learner-ready decision

An output is `learner_ready_without_edit` only when all are true:

- exact Sense decision;
- no critical or major error;
- all four Vietnamese dimensions score `2`;
- schema and local invariants pass;
- no unsafe/private content is echoed beyond the allowed context.

Also record whether a reviewer can fix it with `none | small wording edit |
sense/regeneration required`. This separates useful confirmation UX from a
provider failure.

### Reviewer agreement

Before adjudication report:

- raw agreement and Cohen's kappa for categorical Sense decision;
- exact agreement and weighted kappa for each 0–2 Vietnamese dimension;
- critical/Major disagreement count and adjudication rate.

If Sense kappa is below **0.70** or exact agreement below **85%**, pause the
provider decision, revise the rubric/examples, and independently re-score a
fresh calibration slice. Low agreement means the measurement is not stable;
it does not mean the model automatically failed.

## Operational measurement

### Attempt log

Retain one local restricted record per attempt:

- `run_id`, `case_id`, provider, endpoint, requested model, returned model;
- provider response ID, `x-request-id`, created/completed timestamps, actual
  service tier;
- prompt/schema/evidence/app versions and hashes; exact request parameters;
- monotonic start/end time, end-to-end milliseconds, and time to first event if
  streaming;
- HTTP status, attempt number, retry reason, response status, refusal/block or
  incomplete reason;
- input, cached-input, cache-write, output, reasoning, and total tokens where
  returned;
- dated price-table version, calculated cost, raw-output hash, local validation
  result, and parser version.

Do not use provider timestamps as the latency stopwatch: they are not a
documented millisecond-duration metric. Use the same machine, region, network
path, non-streaming mode, and concurrency for comparisons. Report first attempt
separately from one bounded retry; retries are part of successful-enrichment
cost and user-visible completion latency.

### Metrics

Report count plus 95% Wilson interval for primary proportions, and never hide
the denominator:

- Sense exact, acceptable-overlap, and wrong rates;
- learner-ready-without-edit rate;
- major and critical error rates;
- `ambiguous` and `no_match` precision/recall;
- schema-valid first-attempt and after-one-retry rates;
- refusal, incomplete, timeout, HTTP error, and retry rates;
- p50/p90/p95/max end-to-end latency, first attempt and eventual success;
- tokens/output and USD/success at p50, p95, and total;
- every metric by primary stratum, plus the 50-case paired Luna/Terra delta.

For Luna at the verified list price, calculate each attempt as:

```text
uncached_input = input_tokens - cached_input_tokens - cache_write_tokens
cost_usd = uncached_input * 0.20 / 1_000_000
         + cached_input_tokens * 0.02 / 1_000_000
         + cache_write_tokens * 0.25 / 1_000_000
         + output_tokens * 1.20 / 1_000_000
```

The Luna page states that cache writes cost 1.25 times uncached input. Re-check
that rate and every other token category on the run date, keep them in the
versioned price table, and reconcile calculated totals against the provider
usage/billing dashboard; do not treat the formula as an invoice.

## Proposed pre-registered gate

Freeze the gate before looking at scored outputs:

| Signal | Proposed minimum | Why |
|---|---:|---|
| Sense exact | ≥90% overall and ≥80% in the 50-case hard slice | Wrong Sense corrupts the item |
| Critical error | ≤2% overall; no recurring error class | Avoid confidently teaching the wrong meaning |
| Learner-ready without edit | ≥85% | Confirmation remains exceptional, not routine copy-editing |
| Schema valid | ≥98% first attempt; ≥99.5% after one retry | Async pipeline must remain predictable |
| Operational success | ≥99% after one retry | Failed captures may queue, not disappear |
| Luna cost per success | ≤$0.001 at measured p95 | Caps model cost near $0.30 for 300 monthly successes |
| Latency | p95 ≤10 s first attempt; p99 eventual ≤30 s | Enrichment is async but should feel prompt |

**Recommendation:** adopt Luna only if every correctness/safety gate passes.
Cost and latency never compensate for a Sense or critical-error failure. If Luna
misses quality but Terra materially clears it on the paired slice, route only a
pre-registered difficult/low-confidence class to a stronger model and run a new
full eval of that routing policy. If both miss the same cases, improve candidate
Sense evidence or the product's `Needs Confirmation` boundary before changing
providers.

## Results template

### Run manifest

| Field | Value |
|---|---|
| Eval set/version/hash | `eval-set-v1` / `33426b57…64f89b9` |
| Run date and region | `[fill]` |
| Luna requested / returned model | `[fill]` |
| Terra requested / returned model | `[fill]` |
| Prompt/schema/evidence versions | `[fill]` |
| Reviewer roles | `[fill; no personal data]` |
| Paid outputs attempted | `0; blocked on API key and human gold confirmation` |

### Quality

| Metric | Luna overall | Luna hard slice | Terra hard slice | Gate |
|---|---:|---:|---:|---:|
| Sense exact | `[fill]` | `[fill]` | `[fill]` | 90% / 80% hard |
| Learner-ready without edit | `[fill]` | `[fill]` | `[fill]` | 85% |
| Major errors | `[fill]` | `[fill]` | `[fill]` | `[report]` |
| Critical errors | `[fill]` | `[fill]` | `[fill]` | ≤2% |
| Ambiguous/no-match precision | `[fill]` | `[fill]` | `[fill]` | `[report]` |
| Ambiguous/no-match recall | `[fill]` | `[fill]` | `[fill]` | `[report]` |

### Reliability, latency, and cost

| Metric | Luna | Terra anchor | Gate |
|---|---:|---:|---:|
| First-attempt schema valid | `[fill]` | `[fill]` | 98% |
| Success after one retry | `[fill]` | `[fill]` | 99% |
| p50 / p95 / max latency | `[fill]` | `[fill]` | p95 ≤10 s |
| Input / cached / output tokens | `[fill]` | `[fill]` | `[report]` |
| Total model cost | `[fill]` | `[fill]` | `[report]` |
| USD per successful enrichment | `[fill]` | `[fill]` | Luna p95 ≤$0.001 |

### Reviewer agreement

| Metric | Before adjudication |
|---|---:|
| Sense raw agreement / kappa | `[fill]` |
| Accuracy weighted kappa | `[fill]` |
| Natural Vietnamese weighted kappa | `[fill]` |
| Audience appropriateness weighted kappa | `[fill]` |
| Critical/Major disagreements | `[fill]` |

### Error analysis

| Error cluster | Count | Severity | Affected strata | Likely cause | Proposed action |
|---|---:|---|---|---|---|
| `[fill]` | | | | prompt / evidence / model / validator | |

## Execution checklist

- [ ] Re-check model pages, pricing, and data controls on the run date.
- [x] Verify source license and exclude quotations/private captures from the pack.
- [x] Freeze and hash `eval-set-v1`, blinded requests, hard slice, prompt, and schema.
- [ ] Complete independent gold labels and adjudication before generation.
- [x] Configure `store: false`, restricted local output, and no payload telemetry.
- [ ] Approve a hard provider spend cap; do not run from an unrestricted key.
- [ ] Run exactly the randomized, pre-registered manifest; do not add untracked calls.
- [ ] Preserve every failure and retry; never rerun only bad cases until they pass.
- [ ] Blind and randomize outputs; complete independent human scoring.
- [ ] Compute intervals, agreement, per-stratum metrics, cost, and latency.
- [ ] Record the decision and promote accepted cases into a versioned regression set.
