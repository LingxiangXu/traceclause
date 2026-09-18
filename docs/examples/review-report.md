# Example review: equipment management proposal

This is an English, manually written walkthrough of the synthetic demo. It is not an application-generated report, an independent evaluation or evidence of a real customer's acceptance. Actual v0.1.0 report labels are Chinese.

Sources: [requirements](../../traceclause/samples/requirements.md) and [response](../../traceclause/samples/response.md). English wording below translates their meaning; consult those files for exact quotations.

## Review overview

| Requirement | Response evidence, translated | Illustrative human decision | Rationale |
| --- | --- | --- | --- |
| Excel batch import | Import includes a template, validation and failure details | Supported | The proposal explicitly describes the requested capability |
| Searchable user-operation logs | Logs include operator, time and action, with operator-based queries | Pending | Candidate evidence exists; human review is incomplete |
| Role-based data permissions | Permissions are assigned by role, including view/edit access | Pending | Inspect the required scope before deciding |
| Repair work-order transitions and history | Work orders support transitions; equipment details show repair history | Pending | Candidate has not been confirmed |
| Daily backups retained for at least 30 days | Daily backups retained for 7 days | Unsupported | Daily frequency is covered; the retention period is too short |
| Excel export | Export includes selectable fields | Pending | Candidate available for review |
| Offline entry and synchronization | Offline entry is unsupported; operations require connectivity | Unsupported | The response explicitly excludes a required capability |
| SMS notifications | No corresponding statement found | Missing | Absence of a statement is distinct from explicit contradiction |

## References for reviewed items

- Batch import: requirements line 3; response line 3.
- Backup retention: requirements line 7; response line 7.
- Offline entry: requirements line 9; response line 9.
- SMS notifications: requirements line 10; no selected response passage.

## What an actual export adds

Markdown exports include task identifier, timestamps, revision, engine version, filenames, SHA-256 fingerprints, exact quotations, automatic hints, rationales, selected evidence and saved history. Unreviewed clauses remain pending. When no passage is selected, a leading candidate may be shown explicitly as unconfirmed.

Create a demo task, save decisions and export a report to inspect the actual output. A proposal's statement supports a review of its wording; it does not prove that implemented software delivers that behavior.
