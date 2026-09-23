const words = {
  before: ["修改前", "Before"],
  after: ["修改后", "After"],
  subtitle: ["有据 · 文档证据核验", "Document evidence review"],
  workspace: ["工作空间", "Workspace"],
  newTask: ["＋ 新建核验任务", "＋ New review"],
  reviews: ["证据核验", "Evidence reviews"],
  recent: ["最近任务", "Recent tasks"],
  refresh: ["刷新任务", "Refresh tasks"],
  local: ["本地工作空间", "Local workspace"],
  localNote: [
    "文件与复核记录保存在本机",
    "Files and reviews stay on this machine",
  ],
  edition: ["开源版", "Open source"],
  demo: ["体验演示数据 ↗", "Load demo ↗"],
  heading: [
    "让每一项结论，都有据可查。",
    "Trace every decision to its source.",
  ],
  intro: [
    "从要求到响应，再到原文证据。在同一处完成核对与复核。",
    "Requirements, responses and evidence. Review them in one place.",
  ],
  export: ["↓ 导出核验报告", "↓ Export review"],
  welcome: [
    "把要求和响应，放在一起核对。",
    "Bring requirements and responses together.",
  ],
  welcomeNote: [
    "上传两份文件，查找证据、记录复核依据并导出报告。",
    "Import two documents, inspect evidence, record decisions and export a report.",
  ],
  first: ["创建第一个核验任务 →", "Create your first review →"],
  tryDemo: ["先看看演示", "Try the demo"],
  import: ["导入文件", "Import documents"],
  inspect: ["对照原文", "Inspect source evidence"],
  decide: ["记录结论", "Record decisions"],
  requirements: ["需求文件", "Requirements file"],
  response: ["响应材料", "Response file"],
  view: ["查看原文 ↗", "View source ↗"],
  blocks: ["个原文片段", "source passages"],
  total: ["有效要求", "Active requirements"],
  complete: ["请核对完整性", "Check completeness"],
  candidate: ["候选证据", "Candidate evidence"],
  conflict: ["疑似冲突", "Possible conflict"],
  missing: ["未找到证据", "Evidence not found"],
  pending: ["待复核", "Pending"],
  reviewed: ["已复核", "Reviewed"],
  supported: ["证据充分", "Supported"],
  partial: ["部分覆盖", "Partial"],
  unsupported: ["明确不满足", "Unsupported"],
  excluded: ["非要求条款", "Excluded"],
  priority: ["建议优先核对", "Review first"],
  manual: ["可手动查找", "Inspect full source"],
  clauseReview: ["条款核验", "Requirement review"],
  hintMethod: [
    "词面检索提供候选 · 最终结论由你确认",
    "Lexical candidates · Human decisions",
  ],
  search: ["搜索要求条款…", "Search requirements…"],
  filter: ["筛选条款", "Filter requirements"],
  all: ["全部条款", "All requirements"],
  add: ["＋ 补录条款", "＋ Add requirement"],
  edit: ["编辑条款", "Edit requirement"],
  split: ["拆分条款", "Split requirement"],
  empty: ["没有符合条件的条款", "No matching requirements"],
  noClauses: [
    "尚无条款。请从需求原文补录。",
    "No requirements yet. Add one from the source.",
  ],
  footnote: [
    "提取结果可能遗漏。修改条款会重新核验；词面覆盖率不是满足要求的概率。",
    "Extraction may miss requirements. Edited clauses need re-review; lexical coverage is not a compliance probability.",
  ],
  evidence: ["原文证据", "Source evidence"],
  selectMany: ["可选择多段证据", "Select one or more passages"],
  coverage: ["词面覆盖", "Lexical coverage"],
  chosen: ["人工选定", "Manually selected"],
  terms: ["匹配词", "Shared terms"],
  noEvidence: [
    "没有候选段落，可打开响应全文手动选择。",
    "No candidates. Inspect the full response to select evidence.",
  ],
  findEvidence: [
    "在响应全文中查找证据 ↗",
    "Find evidence in full response ↗",
  ],
  review: ["人工复核", "Human review"],
  decision: ["复核结论", "Decision"],
  rationale: ["复核依据", "Rationale"],
  noteHint: [
    "说明覆盖范围、缺口或差异…",
    "Explain coverage, gaps or discrepancies…",
  ],
  save: ["保存复核结果 ✓", "Save review ✓"],
  saved: ["复核结果已保存。", "Review saved."],
  history: ["查看条款与复核历史", "Requirement and review history"],
  noHistory: ["暂无修改记录。", "No saved changes."],
  original: ["原始引用（保持不变）", "Original quotation (unchanged)"],
  adapted: ["人工修订的要求", "Manually revised requirement"],
  close: ["关闭", "Close"],
  cancel: ["关闭并保留草稿", "Close and keep draft"],
  uploadCancel: ["取消", "Cancel"],
  uploadNote: [
    "选择需求文件与对应的方案或响应材料。",
    "Choose requirements and their corresponding proposal or response.",
  ],
  requirementHint: [
    "明确的要求句更容易提取；遗漏可补录",
    "Explicit requirements are easier to extract; omissions can be added",
  ],
  responseHint: [
    "技术方案、响应说明或验收材料",
    "Proposal, response statement or acceptance material",
  ],
  limits: [
    "每份最多 10 MB；支持文字型 PDF、DOCX、UTF-8 TXT / MD。扫描 PDF 需先 OCR。",
    "Up to 10 MB per file. Text PDFs, DOCX, UTF-8 TXT / MD. Scan PDFs need external OCR.",
  ],
  upload: ["导入并开始核验 →", "Import and review →"],
  loading: ["正在处理…", "Processing…"],
  uploaded: ["导入完成。", "Documents imported."],
  exportNote: [
    "导出仅包含已保存记录，草稿不计入报告；未复核条款保持待复核。",
    "Exports include saved records only. Drafts are excluded; unreviewed items stay pending.",
  ],
  reportLang: ["报告语言", "Report language"],
  md: ["Markdown 报告", "Markdown report"],
  mdNote: [
    "要求、全部选定证据、人工依据与历史",
    "Requirements, all selected evidence, rationales and history",
  ],
  csv: ["CSV 核验清单", "CSV checklist"],
  csvNote: ["用于筛选与整理的表格", "A table for filtering and further review"],
  json: ["JSON 完整记录", "JSON snapshot"],
  jsonNote: [
    "完整原文与历史，字段和内容不翻译",
    "Complete sources and history; keys and content stay unchanged",
  ],
  download: ["↓ 下载原始文件", "↓ Download original file"],
  select: ["选择此段作为证据", "Select this passage"],
  selectedEvidence: ["已选为证据", "Passage selected"],
  fromSource: ["从此段补录条款", "Add requirement from this passage"],
  sourceSpan: ["原始引用范围", "Original quotation range"],
  sourceHelp: [
    "在下方选择起止位置，或选择原文中的文字后点击“使用选中文字”。",
    "Choose start/end positions below, or select source text and use the selection.",
  ],
  useSelection: ["使用选中文字", "Use selected text"],
  start: ["起始字符（从 0 开始）", "Start character (zero-based)"],
  end: ["结束字符（不包含）", "End character (exclusive)"],
  clauseText: ["要求文字", "Requirement text"],
  splitText: [
    "拆分后的要求（每行一条，至少两条）",
    "Split requirements (one per line, at least two)",
  ],
  editHelp: [
    "原始引用会保留。保存后旧结论进入历史，新条款需重新复核。",
    "The original quotation is retained. Previous decisions stay in history; revised requirements need re-review.",
  ],
  saveClause: ["保存条款", "Save requirement"],
  clauseSaved: [
    "条款已保存，需要重新复核。",
    "Requirement saved and ready for re-review.",
  ],
  draft: ["草稿已保存在此浏览器", "Draft saved in this browser"],
  draftNone: ["填写后自动保存草稿", "Drafts save as you type"],
  draftError: [
    "浏览器无法保存草稿，请先复制内容；关闭或切换可能丢失。",
    "Draft storage failed. Copy your text before closing or switching.",
  ],
  drafts: ["本任务草稿", "Drafts for this task"],
  resume: ["恢复草稿", "Resume draft"],
  stale: [
    "草稿基于旧修订。请核对当前条款和已保存结论后再继续。",
    "This draft is based on an older revision. Compare the current requirement and saved review before continuing.",
  ],
  rebase: ["已核对，保留草稿继续", "Compared: keep draft and continue"],
  current: ["当前已保存结论", "Current saved decision"],
  discard: ["删除本窗口草稿", "Discard this window’s draft"],
  discardConfirm: [
    "确认删除本窗口的这份草稿？",
    "Discard this draft from the current window?",
  ],
  archivedDraft: [
    "条款已拆分，草稿仅供查阅和复制。",
    "The requirement was split; this draft is available for reading and copying.",
  ],
  conflictRefresh: [
    "重新载入最新任务（保留草稿）",
    "Reload latest task (keep drafts)",
  ],
  noTasks: ["还没有核验任务", "No review tasks yet"],
  noChanges: ["要求文字未发生变化。", "The requirement text has not changed."],
  invalid: [
    "提交内容无效，请检查填写内容。",
    "Invalid submission. Check the fields.",
  ],
  unavailable: ["服务暂时不可用。", "Service unavailable."],
  incomplete: [
    "请先选择需求原文中的有效范围。",
    "Select a valid requirement source span.",
  ],
  noSelection: [
    "请在原文区域选中文字。",
    "Select text inside the source passage.",
  ],
  emptyParts: [
    "请填写至少两条不同的要求，每条一行。",
    "Enter at least two distinct requirements, one per line.",
  ],
  updateConflict: [
    "任务已更新，草稿已保留；请载入最新版本。",
    "Task updated elsewhere. Draft retained; reload the latest version.",
  ],
  changes: ["变更", "Change"],
  added: ["补录", "Added"],
  edited: ["编辑", "Edited"],
  splitEvent: ["拆分", "Split"],
};
let language =
  localStorage.getItem("traceclause-language") ||
  (navigator.language.startsWith("zh") ? "zh" : "en");
if (!["zh", "en"].includes(language)) language = "en";
function t(key) {
  return words[key]?.[language === "zh" ? 0 : 1] ?? key;
}
const reasonTranslations = {
  "未检索到足够相关的原文；这不等同于不满足要求。":
    "No sufficiently related passage was retrieved; this does not establish noncompliance.",
  "找到词面相关的候选原文，需人工确认覆盖范围与约束。":
    "Lexically related evidence found. Verify scope and constraints manually.",
  "候选原文出现否定或范围限制表述，需人工判断是否冲突。":
    "The candidate contains a negative or limiting expression. Inspect its scope.",
  "找到候选原文，但要求中的数值未完整出现，请重点核对数值与单位。":
    "Some required numbers are absent. Check values and units.",
  "DOCX 使用段落与表格定位；未推测分页。":
    "DOCX references use paragraphs and table rows; page numbers are not inferred.",
};
function localized(text) {
  if (language === "zh") return text;
  if (reasonTranslations[text]) return reasonTranslations[text];
  return text
    .replace(
      /第 (\d+) 页无可提取文字，可能需要 OCR。/g,
      "Page $1 has no extractable text; OCR may be needed.",
    )
    .replace(/表 (\d+) · 第 (\d+) 行/g, "Table $1 · Row $2")
    .replace(/第 (\d+) 行/g, "Line $1")
    .replace(/第 (\d+) 页/g, "Page $1")
    .replace(/第 (\d+) 段/g, "Paragraph $1");
}
