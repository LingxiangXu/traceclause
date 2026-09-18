# User guide

This guide covers v0.1.0, a local single-user application. Follow the [quick start](../README.md#quick-start) first. Documentation is English; the current interface, errors and exported report labels are Chinese.

## Try the demo

Open <http://127.0.0.1:8765> and choose **先看看演示** (Try the demo) or **体验演示数据** (Load demo data). Each click creates a separate task containing eight requirements and seven response passages.

Inspect these cases:

| Requirement | Response | Review consideration |
| --- | --- | --- |
| Excel batch import | Explicit import, template and validation support | Check whether all required conditions are covered |
| Backups retained for at least 30 days | Backups retained for 7 days | Record the numerical discrepancy |
| Offline entry and synchronization | Offline entry is explicitly unsupported | Inspect the conflict hint and make a human decision |

All demo content is synthetic. See the [example review](examples/review-report.md).

## Import your documents

Click **新建核验任务** (New review), select **需求文件** (Requirements) and **响应文件** (Response), then **导入并开始核验** (Import and review). A response can be a proposal, response statement or acceptance document.

| Format | Preparation | Source reference |
| --- | --- | --- |
| PDF | Selectable text; apply OCR externally to scans; remove password protection | Page number |
| DOCX | Prefer body paragraphs and ordinary tables | Paragraph or table row |
| TXT / Markdown | UTF-8; explicit requirement statements, one sentence per item | Line number |

Limits: 10 MB per file, 200 PDF pages, 5,000 extracted blocks and 500,000 extracted characters per document, and 500 extracted requirements per task. Each task contains one requirements file and one response file.

Text/Markdown lines beginning with `#` are skipped; do not put the only requirement statement in a heading. DOCX text boxes, headers, footers and nested tables are not fully covered. Use **查看原文** (View source) and compare with the original file to check completeness.

## Inspect candidate evidence

Search requirements or filter pending, reviewed, possible-conflict and missing-evidence items. Selecting a clause shows its source reference and up to three candidate passages.

| Automatic hint | Meaning |
| --- | --- |
| 候选证据 — Candidate evidence | A lexically related passage was found; coverage has not been established |
| 疑似冲突 — Possible conflict | A candidate contains a negative or limiting expression; inspect its scope |
| 未找到证据 — Evidence not found | Retrieval found no sufficiently related passage; parsing or paraphrasing may be responsible |

Lexical coverage is not the probability that a requirement is satisfied. Check each condition in compound requirements. To choose other evidence, click **在响应全文中查找证据** (Find evidence in the full response), then **选择此段作为证据** (Select this passage).

## Save a human decision

Select an evidence radio button, choose **复核结论** (Review decision), write **复核依据** (Rationale), and click **保存复核结果** (Save review). Evidence selection alone does not save it. Save before switching requirements.

| Decision | Suggested use | Evidence required? |
| --- | --- | --- |
| 待复核 — Pending | Incomplete review or a review that must be repeated | No |
| 证据充分 — Supported | The selected passage adequately supports the requirement | Yes |
| 部分覆盖 — Partial | Some conditions are covered; explain the gap | Yes |
| 明确不满足 — Unsupported | An explicit contradiction or shortfall exists | Yes |
| 未找到证据 — Missing | No corresponding statement was found after inspection | No |
| 非要求条款 — Excluded | Extracted text is not a requirement for this review | No |

Every non-pending decision requires a rationale of up to 2,000 characters. Each requirement can currently reference one selected passage. Expand **查看本条复核历史** (View review history) to inspect saved changes. Timestamps are stored in UTC and displayed in browser-local time.

If another window has updated the task, an outdated save is rejected. Preserve unsaved text separately, reopen the task from recent tasks, inspect the latest decision, and submit the intended update.

## Export

Click **导出核验报告** (Export report):

- **Markdown:** readable requirements, evidence, rationale and change history.
- **CSV:** a filterable checklist; includes selected evidence, not all candidates.
- **JSON:** the full parsed snapshot, fingerprints, candidates and history, without original binary file bytes.

Unreviewed items remain pending. Reports do not verify actual software behavior or acceptance facts. Download original files from the source viewer. Report re-import is not implemented.

## Storage, backup and restart

The default database is `data/traceclause.sqlite3`, relative to the server's working directory. It includes original documents and review records. Stop the service before copying it for backup. Before restoring, stop the service and preserve the current database separately.

On Windows, run `./start.ps1` or repeat the README's server command. Always use the same project directory to avoid accidentally opening a different database. Recent tasks come from the database; browser storage remembers the last selected task only.

Back up data before upgrades. Cross-version migration is not guaranteed; read the [changelog](../CHANGELOG.md).

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Page unavailable | Confirm that the server is running and use its printed local address |
| Port in use | Check for an existing instance, or use port 8766 and its matching URL |
| PDF has no text | Apply OCR externally if the source is scanned or uncopyable |
| No requirements detected | Use explicit requirement statements; manual clause creation is not implemented |
| A requirement was omitted | Compare the source, prepare clearer UTF-8 text and create a new task |
| Relevant evidence not retrieved | Inspect the full response and select it manually |
| Different numbers still produce candidate status | Numerical rules prompt inspection, not an automatic decision |
| A document has changed | Create a new task; decisions are not automatically transferred or invalidated |
| Several users need access | This release has no accounts or permissions and is for local single-user use |

Report unresolved issues using [synthetic reproduction material](https://github.com/LingxiangXu/traceclause/issues/new/choose).
