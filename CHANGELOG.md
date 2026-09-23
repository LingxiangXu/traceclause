# Changelog

## 0.2.0 — 2026-09-23

Local, single-user preview. See the [release notes](docs/releases/v0.2.0.md) for upgrade and validation details.

### Added

- Manual requirement creation from exact source spans, editing and 2–20-way splitting.
- Stable clause IDs, retained split parents, original quotations and before/after history. Edited and split requirements return to pending; unrelated reviews stay unchanged.
- Multiple evidence selections per decision and complete selected-evidence exports.
- Autosaved browser-local review/editor drafts, task/window isolation, refresh recovery, stale-draft comparison and storage-failure notices.
- English/Chinese interface and Markdown/CSV labels without translating source content.
- A separate 14-document synthetic evaluation set with extraction, retrieval and source-span metrics, including retained failures.
- Python regression coverage and five Node draft-store tests in cross-platform CI.

### Compatibility

- v0.1 snapshots are normalized additively; original files and earlier events remain intact. Back up before upgrading. Downgrading should use the v0.1 backup.
- Legacy single `evidence_id` requests remain accepted; new clients should use `evidence_ids`. JSON includes archived split parents, so clients must filter nonempty `superseded_by` for active counts.
- Saved reports exclude browser drafts. The BM25 engine and its thresholds are unchanged.

### Known limitations

No OCR, semantic retrieval, document replacement, cross-version impact analysis, accounts or parser sandbox. Synthetic metrics are not production accuracy. Docker and macOS runtime have not been validated.

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
