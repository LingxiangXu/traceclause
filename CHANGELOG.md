# Changelog

## 0.1.0 — 2026-09-18

First public preview for local, single-user use.

### Added

- PDF, DOCX and UTF-8 TXT/Markdown import, source locations and SHA-256 fingerprints.
- Requirement extraction, BM25 retrieval and negative-expression/numerical reminders.
- Evidence selection, human decisions, rationale, history and stale-revision checks.
- Markdown, CSV and JSON exports and original-file downloads.
- Chinese interface, synthetic demo data, Windows startup script and Docker Compose configuration.
- 25 automated tests, ten evaluation examples and four cross-platform CI combinations.
- English README, user guide, API examples, architecture, evaluation notes, roadmap, example review and contribution templates.

### Fixed

- Chinese benchmark output failing on English Windows console encodings.
- Package discovery accidentally considering runtime data directories.

### Known limitations

No OCR, semantic retrieval, version-impact analysis or manual requirement creation UI. One selected passage per requirement. No authentication or parser sandbox; not intended as a public network service. Docker build/runtime has not been validated.
