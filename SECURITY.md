# Security and deployment scope

TraceClause v0.2 is a single-user local application. It has no authentication, tenant isolation, cryptographic audit signatures, parser sandbox, or production reverse-proxy configuration. Bind to 127.0.0.1. Do not expose it directly to the Internet or an untrusted network.

Uploaded documents and extracted content are stored in a local SQLite file, including original file bytes. The data directory is excluded from Git. There are no remote AI calls or document-content telemetry. Anyone with access to the local service or database can access the documents.

Unsaved review and requirement drafts are stored in browser local storage and may contain document text and rationales. They are not encrypted, synced to the server or included in database backups. Other tabs on the same origin and anyone with access to the browser profile may read them. Clearing site data removes drafts. Reports contain saved document content; inspect them before sharing.

The parser rejects unsupported formats, oversized files, large DOCX expanded payloads and textless PDFs. These limits are not a complete defense against malicious documents. Use trusted documents in this release; isolation and stronger resource limits are future work.

For a suspected vulnerability, report privately using GitHub private vulnerability reporting if enabled. If unavailable, open a minimal issue requesting a private reporting channel, without exploit details or sensitive files.
