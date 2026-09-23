# Roadmap

The goal is measurable progress in extraction, retrieval, constraint review and change tracking. Future items are directions, not delivery-date commitments.

## Shipped: v0.1.0 local review baseline

- [x] Import, source locations and file fingerprints.
- [x] Explainable lexical retrieval, manual evidence selection and review history.
- [x] Markdown, CSV and JSON reports.
- [x] Synthetic examples, cross-platform tests and English project documentation.

## Shipped: v0.2.0 requirement correction and review continuity

- [x] Manually add, edit and split requirements while retaining original quotations and earlier decisions.
- [x] Multiple selected evidence passages per requirement and report.
- [x] Browser-local drafts, task/window isolation and explicit conflict reconciliation.
- [x] English/Chinese interface and report labels, preserving source content.
- [x] Separate synthetic evaluation set reporting exact extraction precision/recall, Hit@1, macro Recall@3 and text source-span reproduction.

The new set is separate from demo/development examples, but is not independently expert annotated. See [evaluation](docs/evaluation.md). The BM25 engine remains unchanged; semantic retrieval was deliberately deferred from this release.

## Next: retrieval and constraint evaluation

- [ ] Independently annotate authorized document sets and report agreement.
- [ ] Compare BM25, locally runnable vector retrieval and hybrid approaches.
- [ ] Extract numbers, units, comparison operators and time ranges.
- [ ] Identify the scope of negation, conditions and exceptions.

Acceptance: report per-case improvements/regressions, retrieval metrics and resource use. Evaluate units, bounds, negation and conditions separately, including false positives and unresolved cases. Human decisions remain authoritative.

## Later: document change impact

- [ ] Align added, removed and modified requirements and evidence.
- [ ] Link prior decisions to supporting passages across document versions.
- [ ] Mark affected decisions for re-review after replacement.

Acceptance: measure alignment and affected-decision detection against known changes; unchanged decisions must not be invalidated without cause.

## Later: document structure and references

- [ ] Evaluate layout-aware parsing options.
- [ ] Handle mixed text/scanned PDF pages and cross-page tables.
- [ ] Preserve source-region references.

Acceptance: evaluate scans, columns and tables separately; report location correctness and resource requirements.

## Outside current scope

Multi-user approvals, hosted document storage, automatic compliance certification, autonomous acceptance decisions and production processing of untrusted files require separate requirements and architecture work.
