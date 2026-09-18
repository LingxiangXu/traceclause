# API examples

These examples describe v0.1.0 at `http://127.0.0.1:8765`. Interactive documentation is at `/docs` and the schema at `/openapi.json`. This local-only release has no authentication.

Run commands from the project directory. Examples use Bash; in Windows PowerShell use `curl.exe` and combine multiline commands into one line.

## Health

```bash
curl http://127.0.0.1:8765/api/health
```

```json
{"status":"ok","version":"0.1.0","engine":"char-bm25-v1"}
```

## Create a demo task

```bash
curl -X POST http://127.0.0.1:8765/api/demo
```

Returns HTTP 201 and a complete session. Every call creates a new task. Replace `SESSION_ID` below with the returned `id`.

## Import files

```bash
curl -X POST http://127.0.0.1:8765/api/sessions \
  -F "requirement=@traceclause/samples/requirements.md" \
  -F "response=@traceclause/samples/response.md"
```

Both fields are required file uploads. See the [user guide](user-guide.md) for limits. The response has the same structure as a demo task.

## List and inspect tasks

```bash
curl http://127.0.0.1:8765/api/sessions
curl http://127.0.0.1:8765/api/sessions/SESSION_ID
```

The list returns identifiers, creation times, filenames, clause counts and reviewed counts. A full snapshot contains:

| Field | Meaning |
| --- | --- |
| id / created_at / revision | Identifier, UTC creation time and revision |
| engine | Engine version used at task creation |
| requirement / response | Filename, SHA-256, source blocks and parsing warnings |
| rows[].clause | Requirement text, block, location and character offsets |
| rows[].status / reason | Automatic hint category and explanation |
| rows[].candidates | Quotations, block_id, score, lexical coverage and shared terms |
| rows[].review | Human decision, note and evidence_id |
| audit | Timestamp, clause identifier and before/after review values |

## Save a review

```bash
curl -X PUT http://127.0.0.1:8765/api/sessions/SESSION_ID/reviews/0 \
  -H "Content-Type: application/json" \
  -d '{"revision":0,"decision":"supported","note":"The source explicitly describes Excel batch import.","evidence_id":0}'
```

This example applies to the first clause of a newly created, unmodified demo. Read the current revision, clause.id and response.blocks[].id for real requests instead of assuming zero.

- decision: `pending`, `supported`, `partial`, `unsupported`, `missing` or `excluded`.
- supported, partial and unsupported require a valid evidence_id.
- Every non-pending decision requires a nonempty note, up to 2,000 characters.
- evidence_id can reference any response block, not just retrieved candidates.
- Success returns the updated session, increments revision and appends an audit event.
- On HTTP 409, fetch and inspect the latest snapshot before deciding what to submit.

## Export and download

```bash
curl -o review.md "http://127.0.0.1:8765/api/sessions/SESSION_ID/export?format=md"
curl -o review.csv "http://127.0.0.1:8765/api/sessions/SESSION_ID/export?format=csv"
curl -o review.json "http://127.0.0.1:8765/api/sessions/SESSION_ID/export?format=json"
curl -OJ http://127.0.0.1:8765/api/sessions/SESSION_ID/source/requirement
curl -OJ http://127.0.0.1:8765/api/sessions/SESSION_ID/source/response
```

CSV is UTF-8 with a BOM. JSON excludes original binary bytes; use the source endpoints for those. Run downloads in a separate directory to avoid filename collisions.

## Errors

| Status | Cause |
| --- | --- |
| 404 | Unknown task or clause |
| 409 | Stale revision |
| 422 | Invalid upload, extraction failure, invalid fields, missing evidence or rationale |

Business errors usually return `{"detail":"Error description"}`; parameter validation may return an array as detail. Handle both. Current application-generated messages are Chinese.
