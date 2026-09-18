# Contributing to TraceClause

Contributions are welcome, especially reproducible failures, independently annotated examples and focused improvements.

## Getting started

Read the [user guide](docs/user-guide.md), [architecture](docs/architecture.md) and [roadmap](ROADMAP.md). Install Python 3.11+, create a virtual environment and run:

```bash
python -m pip install -e ".[dev]"
python -m pytest -q
```

Use the [issue templates](https://github.com/LingxiangXu/traceclause/issues/new/choose) for bugs or suggestions. Include environment, minimal reproduction steps and expected versus actual behavior. Discuss large architecture changes first; small fixes can go directly to a PR.

## Submitting changes

1. Fork the repository and create a descriptive branch from main.
2. Make the smallest change that addresses the issue.
3. Add meaningful regression coverage for behavior changes and run relevant checks.
4. Update affected documentation and examples.
5. Open a PR against main using the provided template.

Backend code is in traceclause/, frontend assets in traceclause/static/, and tests in tests/. Keep the frontend free of build steps until a concrete requirement justifies a change. Explain new dependencies and avoid unrelated refactoring.

Documentation-only changes need content and link checks, not new application tests. Documentation is English; the current interface is Chinese. UI internationalization is separate work.

Never commit virtual environments, databases, logs, customer documents, personal data or credentials. Use synthetic or explicitly authorized public reproduction files.

## Evaluation contributions

Run `python benchmarks/evaluate.py` for retrieval changes. Report regressions as well as improvements; never delete difficult examples to improve metrics. Provide sources and permissions, requirement text, relevant evidence and expected outcomes for new cases.

See [evaluation notes](docs/evaluation.md). Priorities include omitted-clause correction, independent evaluation data, paraphrases, PDF references and constraint extraction.

## Review, licensing and communication

Changes are merged after maintainer review; no response time is guaranteed. Keep discussion respectful and focused on evidence.

Only contribute material you are entitled to publish. Code contributions use the project's MIT license. For vulnerabilities follow [SECURITY.md](SECURITY.md), rather than publishing sensitive details in an issue.
