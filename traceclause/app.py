from contextlib import closing
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Literal
from uuid import uuid4
import csv
import json
import os
import sqlite3

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .matching import ENGINE_VERSION, match_requirements
from .parsing import MAX_BYTES, extract_requirements, parse_document

ROOT = Path(__file__).parent
DECISIONS = {"pending": "待复核", "supported": "证据充分", "partial": "部分覆盖", "unsupported": "明确不满足", "missing": "未找到证据", "excluded": "非要求条款"}
STATUS = {"candidate": "候选证据", "conflict": "疑似冲突", "missing": "未找到证据"}


def now():
    return datetime.now(timezone.utc).isoformat()


def connect():
    path = Path(os.environ.get("TRACECLAUSE_DB", "data/traceclause.sqlite3"))
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=20)
    conn.execute("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, payload TEXT NOT NULL, requirement BLOB NOT NULL, response BLOB NOT NULL)")
    conn.commit()
    return conn


def get_session(conn, session_id):
    row = conn.execute("SELECT payload FROM sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(404, "核验任务不存在。")
    return json.loads(row[0])


def create_session(req_name, req_bytes, res_name, res_bytes):
    try:
        requirement = parse_document(req_name, req_bytes)
        response = parse_document(res_name, res_bytes)
        clauses = extract_requirements(requirement)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    session = {"id": uuid4().hex, "created_at": now(), "revision": 0, "engine": ENGINE_VERSION,
               "requirement": requirement, "response": response,
               "rows": match_requirements(clauses, response), "audit": []}
    with closing(connect()) as conn, conn:
        conn.execute("INSERT INTO sessions VALUES (?,?,?,?)", (session["id"], json.dumps(session, ensure_ascii=False), req_bytes, res_bytes))
    return session


app = FastAPI(title="TraceClause", version="0.1.0")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.get("/")
def index():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0", "engine": ENGINE_VERSION}


@app.get("/api/sessions")
def list_sessions():
    with closing(connect()) as conn:
        sessions = [json.loads(row[0]) for row in conn.execute("SELECT payload FROM sessions ORDER BY rowid DESC")]
    return [{"id": s["id"], "created_at": s["created_at"], "name": s["requirement"]["filename"],
             "count": len(s["rows"]), "reviewed": sum(r["review"]["decision"] != "pending" for r in s["rows"])} for s in sessions]


@app.post("/api/sessions", status_code=201)
async def upload(requirement: UploadFile = File(...), response: UploadFile = File(...)):
    req = await requirement.read(MAX_BYTES + 1)
    res = await response.read(MAX_BYTES + 1)
    # CPU work is small and bounded in this single-user MVP.
    return create_session(requirement.filename or "requirement", req, response.filename or "response", res)


@app.post("/api/demo", status_code=201)
def demo():
    sample = ROOT / "samples"
    return create_session("演示需求.md", (sample / "requirements.md").read_bytes(), "演示方案.md", (sample / "response.md").read_bytes())


@app.get("/api/sessions/{session_id}")
def session_detail(session_id: str):
    with closing(connect()) as conn:
        return get_session(conn, session_id)


class Review(BaseModel):
    revision: int = Field(ge=0)
    decision: Literal["pending", "supported", "partial", "unsupported", "missing", "excluded"]
    note: str = Field(default="", max_length=2000)
    evidence_id: int | None = None


@app.put("/api/sessions/{session_id}/reviews/{clause_id}")
def review(session_id: str, clause_id: int, value: Review):
    with closing(connect()) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        session = get_session(conn, session_id)
        if session["revision"] != value.revision:
            raise HTTPException(409, "任务已在其他窗口更新，请重新打开任务后再保存。")
        if clause_id < 0 or clause_id >= len(session["rows"]):
            raise HTTPException(404, "条款不存在。")
        if value.evidence_id is not None and value.evidence_id not in {b["id"] for b in session["response"]["blocks"]}:
            raise HTTPException(422, "证据段落不存在。")
        if value.decision in {"supported", "partial", "unsupported"} and value.evidence_id is None:
            raise HTTPException(422, "该结论需要选择一段原文证据。")
        if value.decision != "pending" and not value.note.strip():
            raise HTTPException(422, "请填写复核依据，便于追溯。")
        row = session["rows"][clause_id]
        updated = {"decision": value.decision, "note": value.note.strip(), "evidence_id": value.evidence_id}
        session["audit"].append({"at": now(), "clause_id": clause_id, "before": row["review"], "after": updated})
        row["review"] = updated
        session["revision"] += 1
        conn.execute("UPDATE sessions SET payload=? WHERE id=?", (json.dumps(session, ensure_ascii=False), session_id))
    return session


@app.get("/api/sessions/{session_id}/source/{kind}")
def source(session_id: str, kind: Literal["requirement", "response"]):
    with closing(connect()) as conn:
        session = get_session(conn, session_id)
        # Column name is restricted by Literal, never supplied as arbitrary SQL.
        data = conn.execute(f"SELECT {kind} FROM sessions WHERE id=?", (session_id,)).fetchone()[0]
    suffix = Path(session[kind]["filename"]).suffix
    return Response(data, media_type="application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{kind}{suffix}"'})


def csv_safe(value):
    text = str(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text


@app.get("/api/sessions/{session_id}/export")
def export(session_id: str, format: Literal["md", "json", "csv"] = "md"):
    with closing(connect()) as conn:
        session = get_session(conn, session_id)
    if format == "json":
        data = json.dumps(session, ensure_ascii=False, indent=2)
        mime = "application/json"
    elif format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["条款", "要求位置", "自动提示", "复核结论", "人工依据", "证据位置", "证据原文"])
        for row in session["rows"]:
            evidence = next((b for b in session["response"]["blocks"] if b["id"] == row["review"]["evidence_id"]), {})
            writer.writerow(list(map(csv_safe, [row["clause"]["text"], row["clause"]["location"], STATUS[row["status"]], DECISIONS[row["review"]["decision"]], row["review"]["note"], evidence.get("location", ""), evidence.get("text", "")])))
        data, mime = "\ufeff" + output.getvalue(), "text/csv"
    else:
        lines = ["# TraceClause 文档证据核验报告", "", f"任务：{session_id}", f"创建时间：{session['created_at']}", f"导出时间：{now()}", f"修订号：{session['revision']}", f"检索引擎：{session['engine']}", "", "> 自动提示仅用于筛选候选证据，不构成满足要求的判定。条款由启发式规则提取，可能遗漏，须对照完整需求原文。", ""]
        for kind, title in [("requirement", "需求文件"), ("response", "响应文件")]:
            doc = session[kind]
            lines += [f"- {title}：{doc['filename']}", f"- SHA-256：`{doc['sha256']}`"]
            lines += [f"- 解析提示：{w}" for w in doc["warnings"]]
        for i, row in enumerate(session["rows"], 1):
            lines += ["", f"## {i}. {DECISIONS[row['review']['decision']]}", "", f"要求位置：{row['clause']['location']}", "", *["> " + line for line in row["clause"]["text"].splitlines()], "", f"自动提示：{STATUS[row['status']]}。{row['reason']}", "", f"复核依据：{row['review']['note'] or '尚未填写'}"]
            selected = next((b for b in session["response"]["blocks"] if b["id"] == row["review"]["evidence_id"]), None)
            if selected:
                lines += ["", f"选定证据（{selected['location']}）：", "", *["> " + line for line in selected["text"].splitlines()]]
            elif row["candidates"]:
                candidate = row["candidates"][0]
                lines += ["", f"首个候选（未确认，{candidate['location']}）：", "", *["> " + line for line in candidate["text"].splitlines()]]
        lines += ["", "## 复核变更记录", ""]
        for event in session["audit"]:
            lines.append(f"- {event['at']} · 条款 {event['clause_id'] + 1} · {DECISIONS[event['before']['decision']]} → {DECISIONS[event['after']['decision']]} · {event['after']['note']}")
        data, mime = "\n".join(lines), "text/markdown"
    return Response(data, media_type=mime, headers={"Content-Disposition": f'attachment; filename="traceclause-{session_id[:8]}.{format}"'})
