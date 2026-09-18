# Evaluation

This page describes the evidence behind v0.1.0 and its limits. Development-example performance must not be presented as production accuracy.

## Baseline

The char-bm25-v1 engine retrieves Chinese bigrams and English tokens using BM25, then applies thresholds and a few hint rules. The [dataset](../benchmarks/cases.json) has ten hand-authored cases with requirements, response blocks, expected first evidence and expected hint categories.

| Metric | Definition | Baseline |
| --- | --- | --- |
| First evidence hit | Expected first usable block among nine evidence-bearing cases | 7/9, 77.8% |
| Hint category agreement | Expected candidate / conflict / missing across all ten cases | 8/10, 80% |

The script calls the first metric top1_recall_on_relevant. Every case has one annotated relevant block, so it is effectively a first-hit rate. A missing status is treated as no usable candidate. This is not a general multi-relevant-document Recall@k implementation.

## Retained failures

| Requirement, translated | Response, translated | Observation |
| --- | --- | --- |
| Real-time message push | Notifications arrive immediately through WebSocket | Insufficient shared wording; evidence missed |
| Identity authentication | Login checks an account and password | Insufficient shared tokens; evidence missed |

The numerical-discrepancy case expects candidate status: numerical checks prompt inspection rather than decide compliance. Hint agreement is not the accuracy of a human compliance judgment.

## Reproduce

```bash
python -m pip install -e ".[dev]"
python benchmarks/evaluate.py
```

JSON output includes expected/actual blocks and per-case outcomes. The script uses UTF-8 output across Windows language settings. It reports metrics but does not enforce a release-blocking quality threshold.

Run implementation tests with `python -m pytest -q`. The 25 tests cover parsing, quotations, invalid input, persistence, stale updates and exports, not semantic quality. Cross-platform results are available in [Actions](https://github.com/LingxiangXu/traceclause/actions/workflows/ci.yml).

## Independent evaluation plan

The following process is proposed, not completed:

1. Collect authorized public or synthetic documents and record sources and permissions.
2. Annotate requirement boundaries, all relevant evidence, locations and constraint discrepancies.
3. Use independent annotators, resolve disagreements and report agreement.
4. Split development/test sets by document source to reduce template leakage.
5. Report extraction precision/recall, Recall@k, citation-location correctness and constraint-specific errors separately.
6. Compare lexical, vector and hybrid retrieval, including runtime, memory and cost.

The current cases overlap with development material and have not undergone this process. Retain difficult cases; do not remove failures to improve headline metrics.
