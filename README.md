# TraceClause

[![Tests](https://github.com/LingxiangXu/traceclause/actions/workflows/ci.yml/badge.svg)](https://github.com/LingxiangXu/traceclause/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB.svg)](pyproject.toml)

**Trace every review decision to its source.**

TraceClause is a local document requirements and evidence review workbench. Compare a requirements document with a proposal or response, inspect retrieved quotations, record human decisions, and export a traceable report.

Version 0.1.0 is an early, single-user baseline. The interface is currently Chinese. It requires no model API key and makes no external AI calls with document content. Automatic hints identify material to inspect; they do not establish compliance or verify that a described feature actually works.

![Review workbench](docs/screenshot.png)

## Features

- Text-based PDF, DOCX, UTF-8 TXT and Markdown import.
- PDF page references, DOCX paragraph/table-row references and text line references.
- Original file bytes, SHA-256 fingerprints and exact requirement quotation offsets.
- Chinese character-bigram and English word BM25 retrieval with up to three candidates, shared terms and lexical coverage.
- Separate candidate, possible-conflict and missing-evidence hints. Numerical discrepancies may trigger a review reminder.
- Human review with a selected source passage, written rationale and change history.
- SQLite persistence and revision checks that reject stale updates.
- Markdown, CSV and JSON exports, plus sample documents and a small transparent benchmark.

## Quick start

Use Python 3.11 or newer. Windows PowerShell:

```powershell
git clone https://github.com/LingxiangXu/traceclause.git
cd traceclause
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
.\.venv\Scripts\python.exe -m uvicorn traceclause.app:app --host 127.0.0.1 --port 8765
```

macOS / Linux:

```bash
git clone https://github.com/LingxiangXu/traceclause.git
cd traceclause
python3 -m venv .venv
.venv/bin/python -m pip install -e .
.venv/bin/python -m uvicorn traceclause.app:app --host 127.0.0.1 --port 8765
```

Open <http://127.0.0.1:8765> and click **先看看演示** to create a demo review. **新建核验任务** imports your own pair of documents. Select a clause, inspect a candidate passage, write a rationale, and save a review. **导出核验报告** exports the results.

A Docker Compose configuration is included (`docker compose up --build`), but container build/runtime validation has not yet been performed for this release. The published CI covers Python tests on Windows and Linux, not Docker or macOS.

## Limits and data handling

Files and reviews remain in `data/traceclause.sqlite3`, relative to the working directory. `TRACECLAUSE_DB` overrides that path. Stop the service before copying the database for backup. The data directory is excluded from Git; exported reports may still contain your source text.

This release has no authentication, tenant isolation or parser sandbox. Keep it on a trusted local machine, bound to `127.0.0.1`. Audit history is not signed or tamper-evident.

- Up to 10 MB per file, 200 PDF pages, 5,000 extracted blocks, 500,000 extracted characters and 500 extracted requirements per task.
- No OCR for scanned PDFs. Complex PDF reading order and tables may be inaccurate.
- DOCX page numbers are not inferred; headers, footers, text boxes and nested tables are not fully covered.
- Requirement extraction is heuristic and may miss clauses. There is no manual clause creation/editing UI yet.
- Matching is lexical, not semantic entailment. Paraphrases may be missed. Numeric checks do not compare units or inequalities.
- A human decision can reference one evidence passage. Document replacement and cross-version impact analysis are planned, not implemented.

## Tests and evaluation

```bash
python -m pip install -e ".[dev]"
python -m pytest -q
python benchmarks/evaluate.py
```

The application baseline has 25 tests, verified across Windows/Linux with Python 3.11/3.13. A 10-case hand-authored smoke benchmark finds the expected first evidence block for 7 of 9 evidence-bearing cases (77.8%) and the expected hint category for 8 of 10 cases (80%). Two paraphrase failures are retained. These examples overlap with development material and are not an independent evaluation of real-world accuracy.

## Documentation and contribution

| Resource | What it covers |
| --- | --- |
| [User guide](docs/user-guide.md) | Import, review, export, storage and troubleshooting |
| [API examples](docs/api.md) | Requests, validation and errors |
| [Architecture](docs/architecture.md) | Retrieval, references and consistency |
| [Evaluation](docs/evaluation.md) | Metrics, failures and limitations |
| [Roadmap](ROADMAP.md) | Planned work and acceptance criteria |
| [Changelog](CHANGELOG.md) | Version history |
| [Example review](docs/examples/review-report.md) | An English walkthrough using synthetic documents |

To contribute, reproduce an issue with synthetic or authorized public documents, add meaningful regression coverage for behavior changes, and run the tests. Retrieval changes should report both improvements and regressions on the benchmark. Do not publish private customer documents, personal data or credentials in issues. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Code is licensed under the [MIT License](LICENSE). Demo documents were written for this project.
