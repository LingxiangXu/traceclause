import csv
from io import StringIO
import json

from .localization import DECISIONS, STATUS, translate
from .state import active_rows


def csv_safe(value):
    text = str(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text


def report(session, format, lang, timestamp):
    choose = lambda zh, en: zh if lang == "zh" else en
    location = lambda value: translate(value, lang)
    selected = lambda row: [b for ident in row["review"]["evidence_ids"] for b in session["response"]["blocks"] if b["id"] == ident]
    rows = active_rows(session)
    def history_value(value):
        if value is None:
            return ["—"]
        if "children" in value:
            return [line for child in value["children"] for line in history_value(child)]
        review = value.get("review", value)
        result = []
        if "clause" in value:
            clause = value["clause"]
            result += [f"REQ-{clause['id'] + 1:03d} · {location(clause['location'])}",
                       *["> " + line for line in clause["text"].splitlines()]]
        result += [f"{choose('复核结论', 'Decision')}: {DECISIONS[lang][review['decision']]}",
                   f"{choose('复核依据', 'Rationale')}: {review['note'] or choose('尚未填写', 'Not recorded')}"]
        ids = review.get("evidence_ids", [] if review.get("evidence_id") is None else [review["evidence_id"]])
        for ident in ids:
            block = next(b for b in session["response"]["blocks"] if b["id"] == ident)
            result += [f"{choose('选定证据', 'Selected evidence')} ({location(block['location'])}):",
                       *["> " + line for line in block["text"].splitlines()]]
        return result
    if format == "json":
        # Machine-readable snapshot is language-neutral; never translate original content.
        return json.dumps(session, ensure_ascii=False, indent=2), "application/json"
    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(choose(["条款编号", "条款", "要求位置", "原始引用", "自动提示", "复核结论", "人工依据", "证据位置", "证据原文"],
                               ["Clause ID", "Requirement", "Source location", "Original quotation", "Automatic hint", "Decision", "Rationale", "Evidence locations", "Evidence quotations"]))
        for row in rows:
            evidence = selected(row)
            writer.writerow(list(map(csv_safe, [row["clause"]["id"], row["clause"]["text"], location(row["clause"]["location"]), row["clause"]["source_text"], STATUS[lang][row["status"]], DECISIONS[lang][row["review"]["decision"]], row["review"]["note"], "\n".join(location(b["location"]) for b in evidence), "\n\n".join(b["text"] for b in evidence)])))
        return "\ufeff" + output.getvalue(), "text/csv"
    lines = [choose("# TraceClause 文档证据核验报告", "# TraceClause evidence review report"), "",
             f"{choose('任务', 'Task')}: {session['id']}", f"{choose('创建时间', 'Created')}: {session['created_at']}",
             f"{choose('导出时间', 'Exported')}: {timestamp}", f"{choose('修订号', 'Revision')}: {session['revision']}",
             f"{choose('引擎', 'Engine')}: {session['engine']}", "",
             choose("> 自动提示不是合规结论。草稿不计入本报告；条款可能遗漏，请检查完整原文。", "> Hints are not compliance decisions. Unsaved drafts are excluded; check original documents for omitted requirements."), ""]
    for kind, title in [("requirement", choose("需求文件", "Requirements file")), ("response", choose("响应文件", "Response file"))]:
        doc = session[kind]
        lines += [f"- {title}: {doc['filename']}", f"- SHA-256: `{doc['sha256']}`"]
        lines += [f"- {location(w)}" for w in doc["warnings"]]
    for row in rows:
        clause = row["clause"]
        lines += ["", f"## REQ-{clause['id'] + 1:03d} · {DECISIONS[lang][row['review']['decision']]}", "", *["> " + s for s in clause["text"].splitlines()], "", f"{choose('要求位置', 'Source location')}: {location(clause['location'])}"]
        if clause["origin"] != "extracted":
            lines += [choose("人工补录/修订；下列原始引用保持不变：", "Manually added/revised; unchanged original quotation:"), "", *["> " + s for s in clause["source_text"].splitlines()]]
        lines += ["", f"{choose('自动提示', 'Automatic hint')}: {STATUS[lang][row['status']]} · {location(row['reason'])}",
                  f"{choose('复核依据', 'Rationale')}: {row['review']['note'] or choose('尚未填写', 'Not recorded')}"]
        evidence = selected(row)
        for b in evidence:
            lines += ["", f"{choose('选定证据', 'Selected evidence')} ({location(b['location'])}):", "", *["> " + s for s in b["text"].splitlines()]]
        if not evidence and row["candidates"]:
            b = row["candidates"][0]
            lines += ["", f"{choose('首个候选（未确认）', 'Top candidate (unconfirmed)')} ({location(b['location'])}):", "", *["> " + s for s in b["text"].splitlines()]]
    lines += ["", choose("## 条款与复核变更记录", "## Requirement and review history"), ""]
    for e in session["audit"]:
        kind = e.get("kind", "review")
        labels = {"review": choose("复核", "Review"), "add": choose("补录", "Add"), "edit": choose("编辑", "Edit"), "split": choose("拆分", "Split")}
        lines.append(f"- {e['at']} · REQ-{e['clause_id'] + 1:03d} · {labels[kind]}")
        lines += ["", choose("**修改前**", "**Before**"), "", *history_value(e["before"]),
                  "", choose("**修改后**", "**After**"), "", *history_value(e["after"]), ""]
    return "\n".join(lines), "text/markdown"
