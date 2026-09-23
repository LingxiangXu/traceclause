"""Translate system labels only. Source text and human rationales stay unchanged."""
import re

DECISIONS = {
    "zh": {"pending": "待复核", "supported": "证据充分", "partial": "部分覆盖", "unsupported": "明确不满足", "missing": "未找到证据", "excluded": "非要求条款"},
    "en": {"pending": "Pending", "supported": "Supported", "partial": "Partial", "unsupported": "Unsupported", "missing": "Evidence not found", "excluded": "Excluded"},
}
STATUS = {"zh": {"candidate": "候选证据", "conflict": "疑似冲突", "missing": "未找到证据"},
          "en": {"candidate": "Candidate evidence", "conflict": "Possible conflict", "missing": "Evidence not found"}}
TRANSLATIONS = {
    "核验任务不存在。": "Review task not found.",
    "条款不存在。": "Requirement not found.",
    "任务已在其他窗口更新，请重新打开任务后再保存。": "This task has changed. Reload it before saving; your draft is retained.",
    "证据段落不存在。": "Evidence passage not found.",
    "该结论需要选择一段原文证据。": "Select at least one source passage for this decision.",
    "请填写复核依据，便于追溯。": "Enter a review rationale.",
    "文件为空或超过 10 MB。": "The file is empty or exceeds 10 MB.",
    "请先解除 PDF 密码保护。": "Remove PDF password protection before import.",
    "第一版最多处理 200 页 PDF。": "A PDF may contain at most 200 pages.",
    "DOCX 解压后过大。": "The expanded DOCX is too large.",
    "支持 PDF、DOCX、UTF-8 TXT 和 Markdown 文件。": "Supported formats: PDF, DOCX, UTF-8 TXT and Markdown.",
    "文件解析失败，请检查格式或文件是否损坏。": "Unable to parse the file. Check its format and integrity.",
    "未提取到文字。扫描 PDF 请先进行 OCR。": "No text extracted. Run OCR on scanned PDFs first.",
    "文档过长，请拆分为不超过 50 万字、5000 个段落的文件。": "Split documents into at most 500,000 characters and 5,000 blocks.",
    "第一版每次最多核验 500 条要求，请拆分需求文件。": "Split requirements into at most 500 active clauses per task.",
    "DOCX 使用段落与表格定位；未推测分页。": "DOCX references use paragraphs and table rows; page numbers are not inferred.",
    "未检索到足够相关的原文；这不等同于不满足要求。": "No sufficiently related passage was retrieved; this does not establish noncompliance.",
    "找到词面相关的候选原文，需人工确认覆盖范围与约束。": "Lexically related evidence found. Verify scope and constraints manually.",
    "候选原文出现否定或范围限制表述，需人工判断是否冲突。": "The candidate contains a negative or limiting expression. Inspect its scope.",
    "找到候选原文，但要求中的数值未完整出现，请重点核对数值与单位。": "Some required numbers are absent from the candidate. Check values and units.",
}


def translate(text, lang):
    if lang == "zh":
        return {
            "Use evidence_ids or legacy evidence_id, not both.": "请使用 evidence_ids 或旧版 evidence_id，不能同时提供。",
            "Invalid source span.": "原文引用范围无效。",
            "Source quotation must not be blank.": "原文引用不能为空。",
            "The requirement text has not changed.": "要求文字未发生变化。",
            "Split parts must be distinct.": "拆分后的条款不能重复。",
        }.get(text, text)
    if text in TRANSLATIONS:
        return TRANSLATIONS[text]
    text = re.sub(r"第 (\d+) 页无可提取文字，可能需要 OCR。", r"Page \1 has no extractable text; OCR may be needed.", text)
    text = re.sub(r"表 (\d+) · 第 (\d+) 行", r"Table \1 · Row \2", text)
    for unit, label in [("行", "Line"), ("页", "Page"), ("段", "Paragraph")]:
        text = re.sub(rf"第 (\d+) {unit}", rf"{label} \1", text)
    return text
