# User guide

This guide covers v0.2.0, a local single-user application. Follow the [quick start](../README.md#quick-start). Choose **English** or **中文** in the top bar; this preference is remembered in the current browser. Source documents and your own writing are never translated automatically.

## Try the demo

Click **Try the demo** or **Load demo**. Each click creates a separate task containing eight requirements and seven response passages. Demo source documents are Chinese and synthetic; switching the interface to English intentionally leaves these quotations unchanged.

Inspect Excel batch import, the 30-day versus 7-day backup retention discrepancy, and explicitly unsupported offline entry. Automatic hints identify material to check; they are not compliance decisions. The [original example review](examples/review-report.md) is a v0.1 walkthrough.

## Import documents and check completeness

Click **New review**, select a requirements file and corresponding response or proposal, then import.

| Format | Preparation | Source reference |
| --- | --- | --- |
| PDF | Selectable text; run external OCR for scans; remove password protection | Page |
| DOCX | Body paragraphs and ordinary tables | Paragraph or table row |
| TXT / Markdown | UTF-8; preferably one requirement sentence per item | Line |

Limits: 10 MB per file, 200 PDF pages, 5,000 extracted blocks and 500,000 extracted characters per document, and 500 active requirements per task. Each task has one fixed requirements file and one fixed response file.

Use **View source** and download the original files to check completeness. Text/Markdown headings beginning with # are skipped by the parser. DOCX headers, footers, text boxes and nested tables are not fully covered. Manual addition can recover requirements from parsed source blocks; it cannot recover text that the parser never extracted. Prepare a readable document and create another task in that case.

## Correct requirements

- **Add requirement:** choose a source passage, select its text and click **Use selected text**, or enter a start/end range. Adapt the requirement wording if necessary and save. The exact original quotation and location remain separate from your wording. Positions count Unicode characters, starting at zero; the end is exclusive.
- **Edit requirement:** correct wording. Saving retains the original quotation, records the earlier text and review, reruns lexical retrieval for this requirement, and resets its decision to pending. Unrelated reviews remain unchanged.
- **Split requirement:** enter 2–20 distinct requirements, one per line. The original becomes an archived parent; children receive new stable identifiers and pending decisions. Each child inherits the parent's source range. Expand the child's history to inspect its ancestors and earlier decisions.

A task with readable source text but no automatically extracted requirements is still created. Use **Add requirement** to start reviewing it. Requirement text is limited to 4,000 characters per item. Manual correction requires judgment; the app does not verify that rewritten wording follows from its source.

## Inspect evidence and save a decision

Select a requirement to inspect up to three lexical candidates. Check one or more evidence boxes, or use **Find evidence in full response** to select additional passages. Up to 100 distinct response passages can be saved per review.

| Automatic hint | Meaning |
| --- | --- |
| Candidate evidence | Related wording was found; coverage remains unconfirmed |
| Possible conflict | A negative or limiting expression needs inspection in context |
| Evidence not found | No sufficiently related passage was retrieved; a paraphrase or parsing issue may be responsible |

Lexical coverage is not a compliance probability. Check each condition, value, unit and exception yourself.

| Decision | Suggested use | Evidence required? |
| --- | --- | --- |
| Pending | Review incomplete or needs repeating | No |
| Supported | Selected passages adequately support the requirement | Yes |
| Partial | Some conditions are covered; explain the gaps | Yes |
| Unsupported | An explicit contradiction or shortfall exists | Yes |
| Evidence not found | No corresponding statement found after inspection | No |
| Excluded | This item is not a requirement for the review | No |

Every non-pending decision needs a rationale, up to 2,000 characters. Click **Save review** to commit it to the database. Selecting evidence or typing a rationale only saves a browser draft. Expand **Requirement and review history** for previous text, decisions, rationales and evidence. Times are stored in UTC and shown in the browser's local timezone.

## Drafts and competing updates

Review and requirement-editor drafts save as you type. Switching requirements/tasks or refreshing the page retains them in this browser. Review drafts reopen with their requirement; use **Drafts for this task → Resume draft** for editor drafts or another window's recoverable work.

Drafts are separate from saved reviews and reports. Separate windows retain separate drafts. Opening an item can recover the newest available draft when this window has none. A successful save removes only this window's draft; another window's draft is retained for comparison. **Discard this window's draft** removes only the current review draft, after confirmation.

If a save is rejected because the task changed elsewhere, use **Reload latest task (keep drafts)**. Compare the current requirement and saved review, then choose **Compared: keep draft and continue** if the draft is still valid. Save again. The app never silently rebases stale drafts. A draft for a split parent remains readable for copying, but cannot be saved against the archived parent.

If browser storage fills or fails, a warning asks you to copy your work, and in-app switching is blocked. Closing the page prompts where the browser supports it. Browser crashes or clearing site data can still lose unsaved work. Drafts do not move between browser profiles, machines or different site addresses/ports.

## Export

Click **Export review**, choose English or Chinese labels, then a format:

- **Markdown:** active requirements, original quotations, every selected evidence passage, rationales and complete change history. Pending items can show a clearly marked unconfirmed top candidate.
- **CSV:** active requirements and selected evidence only; multiple passages occupy one cell, in selection order. UTF-8 with a BOM.
- **JSON:** the full saved snapshot, including archived parents, fingerprints, candidates and history. Language-neutral keys and original content; no original binary file bytes.

Unsaved drafts are excluded. Language selection changes system labels and locations, not quotations, filenames or rationales. Download original files from the source viewer. Report re-import is not implemented.

## Backup and upgrade

The default database is data/traceclause.sqlite3 relative to the server's working directory; TRACECLAUSE_DB can override it. Stop the service before copying it. Back up before upgrading, and preserve the current database separately before restoring.

v0.2 reads v0.1 snapshots using additive defaults and persists the updated schema on the next successful mutation. Original file bytes and old review events remain intact. To downgrade, restore the pre-upgrade database: v0.1 clients do not correctly understand split parents or multiple evidence passages.

Database backups do not contain browser drafts. Save intended reviews before backup and copy unfinished editor text separately. Use the same project directory and site address after restart.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Page unavailable | Confirm the server is running and use its printed local address |
| Port in use | Check for an existing instance or choose another port; browser drafts stay tied to the original address |
| PDF has no text | Run external OCR and re-import |
| Requirements missing | Inspect the parsed source and manually add requirements |
| Relevant evidence not retrieved | Select it from the full response |
| Different numbers still produce a candidate hint | Numerical rules prompt inspection; make a human decision |
| Save disabled after reload | Compare the stale draft with current saved content, then explicitly continue |
| Source document changed | Create a new task; document replacement/impact analysis is not implemented |
| Several users need access | This release has no accounts or permissions; keep it local and single-user |

Report unresolved issues using [synthetic reproduction material](https://github.com/LingxiangXu/traceclause/issues/new/choose).
