# Evaluation

v0.2 adds a separate synthetic set while keeping char-bm25-v1 unchanged. These small, hand-authored sets do not establish production accuracy.

## v0.2 separate set

[Dataset](../benchmarks/holdout-v02.json) · [Evaluator](../benchmarks/evaluate_holdout.py) · [Recorded results](../benchmarks/holdout-v02-results.json)

The set contains 14 short synthetic documents and 15 annotated requirements. Scenarios include libraries, museums, cold-chain monitoring, irrigation, textiles, transport and archives. It does not reuse the v0.1 demo documents. Requirement boundaries and relevant response block IDs were authored for this release; there was no independent expert annotation, agreement measurement or external validation. The engine was not tuned against this set.

| Metric | Definition | v0.2 baseline |
| --- | --- | --- |
| Exact extraction precision | Extracted clauses exactly matching a gold requirement / all extracted clauses | 12/13, 92.3% |
| Exact extraction recall | Exactly recovered gold requirements / all gold requirements | 12/15, 80.0% |
| Source-span reproduction | Extracted text equals its source block slice | 13/13, 100% |
| Retrieval Hit@1 | First usable retrieved block belongs to annotated evidence | 11/13, 84.6% |
| Macro Recall@3 | Mean fraction of annotated evidence blocks found in the top three, per evidence-bearing gold query | 84.6% |
| Missing-evidence detection | Missing status on cases annotated without relevant evidence | 2/2, 100% |

Retrieval uses gold requirement queries to separate retrieval failures from extraction failures. A missing status counts as no usable candidates even if the engine returned weak lexical matches. Macro Recall@3 includes a case requiring two evidence blocks; it is not the same metric as the original single-block smoke benchmark.

Source-span reproduction checks text offsets only. It does not measure PDF page/layout correctness, OCR, source authenticity or semantic equivalence. Two no-evidence cases are far too few to estimate a reliable false-positive rate.

## Retained failures and limitations

- An English line with two requirement sentences is extracted as one compound item: one false-positive boundary and two missed gold boundaries.
- An implicit English requirement without an extraction trigger is missed.
- Two paraphrase queries miss annotated relevant evidence.
- The set has short text fixtures only, limited domain/wording diversity and synthetic evidence labels.

Manual add/edit/split now provides a traceable recovery workflow for extraction misses; it does not improve automatic extraction scores. No failure was removed to improve the reported baseline. This public set becomes development data if future changes are tuned against it; add a fresh test set for subsequent claims.

## v0.1 development smoke benchmark

The [original dataset](../benchmarks/cases.json) has ten hand-authored examples that overlap development material.

| Metric | Definition | Unchanged result |
| --- | --- | --- |
| First evidence hit | Expected first usable block among nine evidence-bearing cases | 7/9, 77.8% |
| Hint category agreement | Expected candidate/conflict/missing over ten cases | 8/10, 80% |

Its top1_recall_on_relevant field is a first-hit rate with one annotated block per case, not general multi-relevant Recall@k. Real-time push versus WebSocket wording, and identity authentication versus account/password wording remain failures. Hint agreement is not compliance-judgment accuracy.

## Reproduce

~~~bash
python -m pip install -e ".[dev]"
python -m pytest -q
python benchmarks/evaluate.py
python benchmarks/evaluate_holdout.py
node --test tests/test_drafts.cjs
~~~

Evaluators print UTF-8 JSON with per-case expected/actual outcomes. They report metrics without enforcing release-blocking quality thresholds. Regression tests exercise parsing, compatibility, transactions, source references, evidence, exports and draft storage; passing tests do not validate semantic quality. Node 24 is used for the draft tests only.

[GitHub Actions](https://github.com/LingxiangXu/traceclause/actions/workflows/ci.yml) runs Python 3.11/3.13 on Windows/Linux and the draft tests. Local browser checks cover source correction, multiple evidence, draft recovery, language switching and competing saves. Browser checks are manual automation observations, not an unattended CI browser suite.

## Next evaluation work

Collect authorized documents with recorded permissions; independently annotate boundaries and all relevant evidence; adjudicate disagreements and report agreement. Split by source/template. Evaluate PDF references, constraint discrepancies and end-to-end extraction plus retrieval separately. Compare lexical/vector/hybrid methods with per-case regressions and runtime, memory and cost.
