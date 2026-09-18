import json

from fastapi.testclient import TestClient
import pytest

from traceclause.app import app, csv_safe


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("TRACECLAUSE_DB", str(tmp_path / "test.sqlite3"))
    with TestClient(app) as value:
        yield value


def test_demo_review_persistence_audit_export_and_original(client):
    res = client.post("/api/demo")
    assert res.status_code == 201
    session = res.json()
    assert len(session["rows"]) == 8
    row = session["rows"][0]
    assert row["candidates"][0]["block_id"] == 0
    path = f"/api/sessions/{session['id']}"
    review = {"revision": 0, "decision": "supported", "note": "原文明确列出 Excel 批量导入及字段校验。", "evidence_id": 0}
    updated = client.put(path + "/reviews/0", json=review)
    assert updated.status_code == 200
    assert updated.json()["revision"] == 1
    # A new client reads the same database, independent of previous request state.
    with TestClient(app) as reopened:
        saved = reopened.get(path).json()
    assert saved["rows"][0]["review"]["decision"] == "supported"
    assert saved["audit"][0]["before"]["decision"] == "pending"
    assert saved["audit"][0]["after"]["note"] == review["note"]
    markdown = client.get(path + "/export").text
    assert "SHA-256" in markdown and "证据充分" in markdown and "待复核" in markdown
    assert review["note"] in markdown and row["clause"]["text"] in markdown
    assert client.get(path + "/export?format=json").json() == saved
    assert "证据原文" in client.get(path + "/export?format=csv").text
    assert client.get(path + "/source/requirement").content.startswith(b"#")
    assert client.get("/api/sessions").json()[0]["reviewed"] == 1


def test_stale_update_cannot_overwrite_review(client):
    session = client.post("/api/demo").json()
    path = f"/api/sessions/{session['id']}/reviews/0"
    value = {"revision": 0, "decision": "missing", "note": "未找到相关证据。"}
    assert client.put(path, json=value).status_code == 200
    assert client.put(path, json=value).status_code == 409


@pytest.mark.parametrize("value", [
    {"decision": "supported", "note": "依据", "evidence_id": None},
    {"decision": "unsupported", "note": "依据", "evidence_id": 999},
    {"decision": "missing", "note": "  "},
    {"decision": "invented", "note": "依据"},
])
def test_review_validation(client, value):
    session = client.post("/api/demo").json()
    response = client.put(f"/api/sessions/{session['id']}/reviews/0", json={"revision": 0, **value})
    assert response.status_code == 422


def test_upload_pair_round_trip(client):
    requirement = "系统必须记录操作日志。".encode()
    response = "操作日志记录用户和操作时间。".encode()
    result = client.post("/api/sessions", files={"requirement": ("需求.txt", requirement), "response": ("响应.txt", response)})
    assert result.status_code == 201
    session = result.json()
    assert session["requirement"]["filename"] == "需求.txt"
    assert client.get(f"/api/sessions/{session['id']}/source/requirement").content == requirement


def test_bad_upload_does_not_create_session(client):
    res = client.post("/api/sessions", files={"requirement": ("bad.pdf", b"garbage"), "response": ("ok.txt", b"test")})
    assert res.status_code == 422
    assert client.get("/api/sessions").json() == []


def test_unknown_session_and_invalid_export_format(client):
    assert client.get("/api/sessions/nope").status_code == 404
    session = client.post("/api/demo").json()
    assert client.get(f"/api/sessions/{session['id']}/export?format=html").status_code == 422


@pytest.mark.parametrize("value", ["=HYPERLINK(1)", " +SUM(1)", "@cmd", "-1+2"])
def test_csv_formula_injection_protection(value):
    assert csv_safe(value).startswith("'")
