# API examples

These examples describe v0.2.0 at http://127.0.0.1:8765. Interactive documentation is at /docs and the schema at /openapi.json. This local-only release has no authentication.

Commands use Bash; in PowerShell use curl.exe and combine multiline commands into one line. Read the actual task revision and IDs before mutations.

## Create and inspect

~~~bash
curl http://127.0.0.1:8765/api/health
curl -X POST http://127.0.0.1:8765/api/demo
curl -X POST http://127.0.0.1:8765/api/sessions \
  -F "requirement=@traceclause/samples/requirements.md" \
  -F "response=@traceclause/samples/response.md"
curl http://127.0.0.1:8765/api/sessions
curl http://127.0.0.1:8765/api/sessions/SESSION_ID
~~~

Health returns version 0.2.0 and engine char-bm25-v1. Each demo/import creates an independent task with HTTP 201. Readable documents with zero extracted requirements are accepted for manual completion; textless/invalid documents still fail.

| Snapshot field | Meaning |
| --- | --- |
| id / created_at / revision | Identifier, UTC creation time and transaction revision |
| schema_version | 2 after additive normalization |
| engine | Retrieval engine |
| requirement / response | Filename, SHA-256, parsed blocks and warnings |
| rows[].clause | Stable id, current text, block_id, location, start/end, source_text, origin and version |
| rows[].clause.parent_id | Present on split children; retained through later edits |
| rows[].superseded_by | Child IDs for archived split parents; empty for active rows |
| rows[].status / reason / candidates | Automatic hint and retrieved evidence |
| rows[].review | Decision, note, evidence_ids and legacy evidence_id |
| audit | UTC at, kind (add/edit/split/review), clause_id and full before/after values |

Clause IDs are zero-based and stable, not array positions. UI labels add one (id 0 is REQ-001). Filter out nonempty superseded_by for active lists/counts. Old audit events may omit kind and represent reviews.

## Save multiple evidence passages

~~~bash
curl -X PUT http://127.0.0.1:8765/api/sessions/SESSION_ID/reviews/0 \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{"revision":0,"decision":"partial","note":"Two passages cover different parts; constraints still need review.","evidence_ids":[0,1]}'
~~~

- Decisions: pending, supported, partial, unsupported, missing, excluded.
- Supported, partial and unsupported require at least one valid response block ID.
- Non-pending decisions require a nonblank note, maximum 2,000 characters.
- At most 100 evidence IDs; duplicates are removed while preserving order. Any response block may be selected.
- Legacy evidence_id is accepted when evidence_ids is absent. Supplying both non-null is rejected. Returned evidence_id mirrors the first selected passage for older clients; use evidence_ids for complete coverage.
- Success returns the updated snapshot and increments revision once. HTTP 409 means fetch, inspect and explicitly reconcile before retrying.

## Add, edit and split requirements

These are independent request examples, not a sequence: replace revision and source spans with current values.

~~~bash
curl -X POST http://127.0.0.1:8765/api/sessions/SESSION_ID/clauses \
  -H "Content-Type: application/json" \
  -d '{"revision":0,"block_id":0,"start":0,"end":5,"text":"Human-corrected requirement linked to this quotation."}'

curl -X PATCH http://127.0.0.1:8765/api/sessions/SESSION_ID/clauses/0 \
  -H "Content-Type: application/json" \
  -d '{"revision":0,"text":"Revised requirement wording."}'

curl -X POST http://127.0.0.1:8765/api/sessions/SESSION_ID/clauses/0/split \
  -H "Content-Type: application/json" \
  -d '{"revision":0,"parts":["The system must record user actions.","The system must filter actions by operator."]}'
~~~

Add returns HTTP 201; edit/split return 200. All return a full snapshot. start/end count Unicode code points within the requirements block, zero-based with exclusive end. The range must select nonblank source text. Requirement text is trimmed and limited to 1–4,000 characters.

Editing preserves the exact original source span and quotation, increments clause version, reretrieves evidence and resets only that review. An unchanged-text edit returns 422 without incrementing revision.

Splitting accepts 2–20 distinct nonblank parts, archives the parent with its prior review, and creates children with inherited source spans and pending decisions. No active clause IDs are reused. Parent mutation endpoints return 404 after splitting. Add/split enforce 500 active requirements; failed requests do not partially modify a task.

## Reports and original files

~~~bash
curl -o review.md "http://127.0.0.1:8765/api/sessions/SESSION_ID/export?format=md&lang=en"
curl -o review.csv "http://127.0.0.1:8765/api/sessions/SESSION_ID/export?format=csv&lang=zh"
curl -o review.json "http://127.0.0.1:8765/api/sessions/SESSION_ID/export?format=json"
curl -OJ http://127.0.0.1:8765/api/sessions/SESSION_ID/source/requirement
curl -OJ http://127.0.0.1:8765/api/sessions/SESSION_ID/source/response
~~~

lang accepts en/zh, default zh for v0.1 compatibility. Markdown/CSV translate system labels only. JSON is the full language-neutral saved snapshot, including archived parents, without original binary bytes. Browser drafts are never sent to these exports. Run downloads in a separate directory to avoid collisions.

## Errors

| Status | Cause |
| --- | --- |
| 404 | Unknown task, clause or archived parent mutation |
| 409 | Stale revision |
| 422 | Invalid file, source span, split parts, fields, capacity, evidence or rationale |

Business errors use a string detail. Framework field-validation errors may use an array; handle both. Send Accept-Language: en for English business errors; Chinese is the default. Framework validation text follows FastAPI/Pydantic defaults.
