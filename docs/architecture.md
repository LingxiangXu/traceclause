# Architecture and review semantics

## Automatic hints and human decisions

Retrieval identifies passages worth inspecting. Human review determines whether evidence supports a requirement. Lexical similarity cannot establish numerical constraints, scope or the target of a negation.

Automatic statuses are `candidate`, `conflict` and `missing`. Conflict is a keyword-level hint; missing means no sufficiently related passage was found. All reviews start as pending. Matching never automatically produces a pass/fail decision.

Human decisions are supported, partial, unsupported, missing, excluded and pending. The first three require a selected response passage. Every non-pending decision requires a rationale.

## Data model

A session contains fixed requirements and response documents with filenames, SHA-256 fingerprints, source blocks and warnings. Original bytes are stored as SQLite BLOBs; parsed snapshots, matches and review history are JSON.

Each clause references a requirements block and exact start/end character offsets. Candidates reference response blocks and record BM25 score, lexical coverage and shared terms. Reviews store evidence_id and rationale. Quoted report text comes from stored source text, not generated text.

```text
Browser (HTML / CSS / JavaScript)
              |
          FastAPI API
              |
     +--------+---------+
     |        |         |
  parsing  matching   SQLite
     |        |         |
  blocks   candidates  files, snapshots, review history
```

## Consistency

Review writes use a SQLite `BEGIN IMMEDIATE` transaction to read the snapshot, check revision, append history and update the snapshot. Clients submit the revision they read; stale values receive HTTP 409.

History has timestamps and before/after values, but no authenticated identities, cryptographic signatures or independent append-only storage. It is not tamper-evident audit evidence.

## Retrieval baseline

Chinese text is split into character bigrams, English and numbers into tokens. A small set of generic terms is removed. BM25 uses k1=1.5 and b=0.75 and returns the top three response blocks.

The top candidate needs lexical coverage of at least 0.22 and two shared tokens to receive a candidate hint. These are development heuristics, not calibrated probabilities. Negation rules inspect the top passage; numerical reminders check number presence, not units or inequalities.

Each task records its engine version. Algorithm changes do not silently recompute saved tasks. Future vector or model-based approaches should be compared with this deterministic baseline.

## API

| Request | Purpose |
| --- | --- |
| GET /api/health | Health and engine version |
| GET /api/sessions | Task summaries |
| POST /api/sessions | Multipart requirement and response files |
| POST /api/demo | Independent demo task |
| GET /api/sessions/{id} | Full snapshot |
| PUT /api/sessions/{id}/reviews/{clause_id} | Save revision, decision, note and evidence_id |
| GET /api/sessions/{id}/source/{kind} | Original file download |
| GET /api/sessions/{id}/export?format=md/csv/json | Report export |

See [API examples](api.md) and the running server's `/docs`. Large-scale processing, background jobs, multi-user authentication and parser isolation are not implemented.
