# Architecture and review semantics

## Automatic hints and human decisions

Retrieval identifies passages worth inspecting. Human review determines whether evidence supports a requirement. Lexical similarity cannot establish numerical constraints, scope or the target of a negation.

Automatic statuses are candidate, conflict and missing. Conflict is a keyword-level hint; missing means no sufficiently related passage was found. All new or revised requirements start pending. Matching never produces an automatic pass/fail decision. Supported, partial and unsupported decisions need selected evidence; every non-pending decision needs a rationale.

## Documents, requirements and revisions

A session contains fixed requirements/response documents with filenames, SHA-256 fingerprints, source blocks and warnings. Original file bytes are SQLite BLOBs. Parsed documents, matches and history are one JSON snapshot.

Each clause has a stable ID and an immutable source anchor: requirements block ID, location, zero-based Unicode code-point start/end offsets, and exact source_text. Current text is separate from that quotation. Editing changes text and clause version while preserving the source. Splitting retains the parent and its previous review with superseded_by child IDs. Children retain parent_id and the original anchor; only active rows appear in counts and current report sections.

Reviews store an ordered evidence_ids list and rationale. A legacy evidence_id field mirrors the first selected block. New clients must not use this single field as the complete evidence set. JSON exports include archived parents and all audit events.

v0.1 snapshots are normalized in memory using additive defaults. Reads do not rewrite stored payloads; the next successful mutation persists schema_version 2. Original BLOBs and historical review events are untouched. This is forward compatibility for existing data, not a guarantee of safe downgrade.

~~~text
Browser: interface + per-task/item/window drafts
                    |
                FastAPI
                    |
      +-------------+-------------+
      |             |             |
   parsing       matching     reporting
      |             |             |
   blocks       candidates     exports
                    |
                  SQLite
         files, snapshots, history
~~~

## Transactional edits and audit history

All review, add, edit and split mutations use BEGIN IMMEDIATE to read the latest snapshot, compare the submitted revision, validate the operation, append history and write once. Success increments revision once; stale writes return HTTP 409. Invalid requests roll back without partial children or audit events.

Edit and split rerun matching only for affected requirements and reset their reviews to pending. Other saved decisions are preserved. Split parents cannot be mutated again, but remain available in JSON and ancestry history.

Audit events store time, kind, clause ID and complete before/after values. The UI shows readable text/decision/evidence changes, including ancestors of split children. Markdown includes all events; JSON retains full snapshots. There are no authenticated reviewer identities, signatures or independent append-only storage, so this history is not tamper-evident audit evidence.

## Browser drafts and localization

Drafts are browser-local, separate from SQLite. Keys include task, item and window identity. They store the source revision, clause version for reviews, text/decision and selected evidence. Writes are synchronous on form input. Reload/switch restores local work; a new window may recover the newest available draft. Other windows' copies are not deleted by a successful save.

A stale draft requires explicit comparison and continuation before saving. Server revision checks still apply after that comparison. Storage failures are surfaced and in-app switching is blocked so the user can copy or save work. Browser data clearing, profile loss and crashes are not recoverable backups.

The interface uses a small English/Chinese dictionary. Reports independently select label language. Original quotations, filenames and human rationales are not translated. JSON stays language-neutral. Business errors honor English Accept-Language; framework validation uses its default messages.

## Retrieval baseline

The unchanged char-bm25-v1 engine splits Chinese into character bigrams, and English/numbers into tokens. Generic terms are removed. BM25 uses k1=1.5 and b=0.75 and returns up to three blocks.

The top candidate needs lexical coverage of at least 0.22 and two shared tokens. These are development heuristics, not calibrated probabilities. Negation rules inspect the top passage; numerical reminders check number presence, not units or inequalities.

Each task records its engine. Future algorithm changes must define how existing tasks are handled; opening a saved task does not silently recompute it. See [evaluation](evaluation.md) and [API examples](api.md).
