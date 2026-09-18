# Roadmap

The goal is measurable progress in extraction, retrieval, constraint review and change tracking. These are planned directions, not shipped capabilities or delivery-date commitments.

## Shipped: v0.1.0 local review baseline

- [x] Document import, source locations and file fingerprints.
- [x] Explainable lexical retrieval, manual evidence selection and review history.
- [x] Markdown, CSV and JSON export.
- [x] Synthetic examples, cross-platform tests and local setup documentation.

## v0.2: Extraction and retrieval quality

- [ ] Manually add, split and correct requirements while preserving sources.
- [ ] Create an annotated test set separate from development examples.
- [ ] Compare BM25, locally runnable vector retrieval and hybrid approaches.
- [ ] Support multiple selected passages per requirement.

Acceptance: publish extraction precision/recall, Recall@k and per-case regressions; demonstrate manual recovery of omitted requirements with traceable exports.

## v0.3: Constraint review

- [ ] Extract numbers, units, comparison operators and time ranges.
- [ ] Identify the scope of negative statements and exceptions.
- [ ] Distinguish uncertainty from explicit discrepancies.

Acceptance: evaluate unit conversion, bounds, negation and conditional statements separately; report false positives, false negatives and unresolved cases while retaining human decisions.

## v0.4: Document change impact

- [ ] Align added, removed and modified requirements and evidence.
- [ ] Link prior decisions to their supporting passages.
- [ ] Mark affected decisions for re-review after document changes.

Acceptance: measure alignment and affected-decision detection on document pairs with known changes; unchanged decisions must not be invalidated without cause.

## v0.5: Document structure and references

- [ ] Evaluate Docling or other layout-aware parsing options.
- [ ] Handle mixed text/scanned PDF pages.
- [ ] Support cross-page tables and source-region references.

Acceptance: evaluate scans, columns and tables separately; report citation-location correctness and resource requirements.

## Outside current scope

Multi-user approvals, hosted document storage, automatic compliance certification, autonomous acceptance decisions and production handling of untrusted files are outside v0.1. Any expansion requires separate requirements and architecture discussion.
