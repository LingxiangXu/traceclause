from contextlib import closing, contextmanager
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4
import json
import os
import sqlite3

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, StringConstraints

from .matching import ENGINE_VERSION, match_requirements
from .parsing import MAX_BYTES, extract_requirements, parse_document
from .state import active_rows, event, normalize, pending_review
from .reporting import csv_safe, report
from .localization import translate

ROOT = Path(__file__).parent
VERSION = "0.2.0"
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


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
    return normalize(json.loads(row[0]))


@contextmanager
def change(session_id, revision):
    with closing(connect()) as conn, conn:
        conn.execute("BEGIN IMMEDIATE")
        session = get_session(conn, session_id)
        if session["revision"] != revision:
            raise HTTPException(409, "任务已在其他窗口更新，请重新打开任务后再保存。")
        yield session
        session["revision"] += 1
        conn.execute("UPDATE sessions SET payload=? WHERE id=?", (json.dumps(session, ensure_ascii=False), session_id))


def find_row(session, clause_id):
    row = next((r for r in active_rows(session) if r["clause"]["id"] == clause_id), None)
    if row is None:
        raise HTTPException(404, "条款不存在。")
    return row


def next_id(session):
    return max((r["clause"]["id"] for r in session["rows"]), default=-1) + 1


def capacity(session, additional):
    if len(active_rows(session)) + additional > 500:
        raise HTTPException(422, "第一版每次最多核验 500 条要求，请拆分需求文件。")


def create_session(req_name, req_bytes, res_name, res_bytes):
    try:
        requirement = parse_document(req_name, req_bytes)
        response = parse_document(res_name, res_bytes)
        clauses = extract_requirements(requirement, allow_empty=True)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    session = normalize({"id": uuid4().hex, "created_at": now(), "revision": 0, "engine": ENGINE_VERSION,
                         "requirement": requirement, "response": response,
                         "rows": match_requirements(clauses, response), "audit": []})
    with closing(connect()) as conn, conn:
        conn.execute("INSERT INTO sessions VALUES (?,?,?,?)", (session["id"], json.dumps(session, ensure_ascii=False), req_bytes, res_bytes))
    return session


app = FastAPI(title="TraceClause", version=VERSION)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.exception_handler(HTTPException)
async def localized_error(request: Request, exc: HTTPException):
    lang = "en" if request.headers.get("accept-language", "").lower().startswith("en") else "zh"
    detail = translate(str(exc.detail), lang)
    return JSONResponse({"detail": detail}, status_code=exc.status_code, headers=exc.headers)


@app.get("/")
def index():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": VERSION, "engine": ENGINE_VERSION}


@app.get("/api/sessions")
def list_sessions():
    with closing(connect()) as conn:
        sessions = [normalize(json.loads(row[0])) for row in conn.execute("SELECT payload FROM sessions ORDER BY rowid DESC")]
    return [{"id": s["id"], "created_at": s["created_at"], "name": s["requirement"]["filename"],
             "count": len(active_rows(s)), "reviewed": sum(r["review"]["decision"] != "pending" for r in active_rows(s))} for s in sessions]


@app.post("/api/sessions", status_code=201)
def upload(requirement: UploadFile = File(...), response: UploadFile = File(...)):
    return create_session(requirement.filename or "requirement", requirement.file.read(MAX_BYTES + 1),
                          response.filename or "response", response.file.read(MAX_BYTES + 1))


@app.post("/api/demo", status_code=201)
def demo():
    sample = ROOT / "samples"
    return create_session("demo-requirements.md", (sample / "requirements.md").read_bytes(),
                          "demo-response.md", (sample / "response.md").read_bytes())


@app.get("/api/sessions/{session_id}")
def session_detail(session_id: str):
    with closing(connect()) as conn:
        return get_session(conn, session_id)


class Revision(BaseModel):
    revision: int = Field(ge=0)


class Review(Revision):
    decision: Literal["pending", "supported", "partial", "unsupported", "missing", "excluded"]
    note: str = Field(default="", max_length=2000)
    evidence_ids: list[int] | None = Field(default=None, max_length=100)
    evidence_id: int | None = None  # v0.1 client compatibility


@app.put("/api/sessions/{session_id}/reviews/{clause_id}")
def review(session_id: str, clause_id: int, value: Review):
    with change(session_id, value.revision) as session:
        row = find_row(session, clause_id)
        if value.evidence_ids is not None and value.evidence_id is not None:
            raise HTTPException(422, "Use evidence_ids or legacy evidence_id, not both.")
        ids = list(dict.fromkeys(value.evidence_ids if value.evidence_ids is not None else
                                 ([] if value.evidence_id is None else [value.evidence_id])))
        if not set(ids) <= {b["id"] for b in session["response"]["blocks"]}:
            raise HTTPException(422, "证据段落不存在。")
        if value.decision in {"supported", "partial", "unsupported"} and not ids:
            raise HTTPException(422, "该结论需要选择一段原文证据。")
        if value.decision != "pending" and not value.note.strip():
            raise HTTPException(422, "请填写复核依据，便于追溯。")
        updated = {"decision": value.decision, "note": value.note.strip(), "evidence_ids": ids,
                   "evidence_id": ids[0] if ids else None}
        event(session, "review", clause_id, row["review"], updated, now())
        row["review"] = updated
    return session


class AddClause(Revision):
    block_id: int = Field(ge=0)
    start: int = Field(ge=0)
    end: int = Field(gt=0)
    text: Text


class EditClause(Revision):
    text: Text


class SplitClause(Revision):
    parts: list[Text] = Field(min_length=2, max_length=20)


@app.post("/api/sessions/{session_id}/clauses", status_code=201)
def add_clause(session_id: str, value: AddClause):
    with change(session_id, value.revision) as session:
        capacity(session, 1)
        block = next((b for b in session["requirement"]["blocks"] if b["id"] == value.block_id), None)
        if block is None or not 0 <= value.start < value.end <= len(block["text"]):
            raise HTTPException(422, "Invalid source span.")
        quotation = block["text"][value.start:value.end]
        if not quotation.strip():
            raise HTTPException(422, "Source quotation must not be blank.")
        clause = {"id": next_id(session), "text": value.text, "block_id": block["id"],
                  "location": block["location"], "start": value.start, "end": value.end,
                  "source_text": quotation, "origin": "manual", "version": 1}
        row = match_requirements([clause], session["response"])[0]
        row["review"] = pending_review()
        row["superseded_by"] = []
        session["rows"].append(row)
        event(session, "add", clause["id"], None, row, now())
    return session


@app.patch("/api/sessions/{session_id}/clauses/{clause_id}")
def edit_clause(session_id: str, clause_id: int, value: EditClause):
    with change(session_id, value.revision) as session:
        row = find_row(session, clause_id)
        if value.text == row["clause"]["text"]:
            raise HTTPException(422, "The requirement text has not changed.")
        before = deepcopy(row)
        clause = deepcopy(row["clause"])
        clause.update(text=value.text, origin="edited", version=clause["version"] + 1)
        updated = match_requirements([clause], session["response"])[0]
        updated.update(review=pending_review(), superseded_by=[])
        row.clear()
        row.update(updated)
        event(session, "edit", clause_id, before, row, now())
    return session


@app.post("/api/sessions/{session_id}/clauses/{clause_id}/split")
def split_clause(session_id: str, clause_id: int, value: SplitClause):
    with change(session_id, value.revision) as session:
        row = find_row(session, clause_id)
        capacity(session, len(value.parts) - 1)
        if len(set(value.parts)) != len(value.parts):
            raise HTTPException(422, "Split parts must be distinct.")
        before = deepcopy(row)
        start_id = next_id(session)
        children = []
        for offset, text in enumerate(value.parts):
            clause = deepcopy(row["clause"])
            clause.update(id=start_id + offset, text=text, origin="split", parent_id=clause_id, version=1)
            child = match_requirements([clause], session["response"])[0]
            child.update(review=pending_review(), superseded_by=[])
            children.append(child)
        row["superseded_by"] = [c["clause"]["id"] for c in children]
        session["rows"].extend(children)
        event(session, "split", clause_id, before, {"superseded_by": row["superseded_by"], "children": children}, now())
    return session


@app.get("/api/sessions/{session_id}/source/{kind}")
def source(session_id: str, kind: Literal["requirement", "response"]):
    with closing(connect()) as conn:
        session = get_session(conn, session_id)
        data = conn.execute(f"SELECT {kind} FROM sessions WHERE id=?", (session_id,)).fetchone()[0]
    suffix = Path(session[kind]["filename"]).suffix
    return Response(data, media_type="application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{kind}{suffix}"'})


@app.get("/api/sessions/{session_id}/export")
def export(session_id: str, format: Literal["md", "json", "csv"] = "md", lang: Literal["zh", "en"] = "zh"):
    with closing(connect()) as conn:
        session = get_session(conn, session_id)
    data, mime = report(session, format, lang, now())
    return Response(data, media_type=mime, headers={"Content-Disposition": f'attachment; filename="traceclause-{session_id[:8]}.{format}"'})
