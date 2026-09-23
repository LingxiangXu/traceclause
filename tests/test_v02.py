from contextlib import closing
from copy import deepcopy
import csv
from io import StringIO
import json
import re

import pytest
from fastapi.testclient import TestClient
from traceclause.app import app, connect


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("TRACECLAUSE_DB", str(tmp_path / "test.sqlite3"))
    with TestClient(app) as client:
        yield client


def demo(client):
    value = client.post("/api/demo").json()
    return value, f"/api/sessions/{value['id']}"


def test_v01_snapshot_is_read_additively_without_rewriting_original(client):
    value, path = demo(client)
    value.pop("schema_version")
    for row in value["rows"]:
        for key in ("source_text", "version", "origin"):
            row["clause"].pop(key)
        row.pop("superseded_by")
        row["review"].pop("evidence_ids")
    value["rows"][0]["review"] = {"decision": "supported", "note": "Legacy rationale", "evidence_id": 0}
    raw = json.dumps(value)
    with closing(connect()) as conn, conn:
        conn.execute("UPDATE sessions SET payload=? WHERE id=?", (raw, value["id"]))
    response = client.get(path).json()
    assert response["schema_version"] == 2
    assert response["rows"][0]["review"]["evidence_ids"] == [0]
    assert response["rows"][0]["review"]["note"] == "Legacy rationale"
    with closing(connect()) as conn:
        assert conn.execute("SELECT payload FROM sessions WHERE id=?", (value["id"],)).fetchone()[0] == raw


def test_multiple_evidence_persists_and_exports_in_selected_order(client):
    value, path = demo(client)
    updated = client.put(path + "/reviews/0", json={"revision":0, "decision":"partial", "note":"Two passages reviewed.", "evidence_ids":[1,0,1]}).json()
    assert updated["rows"][0]["review"]["evidence_ids"] == [1,0]
    assert client.get(path).json() == updated
    md = client.get(path + "/export?lang=en").text
    current, history = md.split("## Requirement and review history")
    assert current.count("Selected evidence (") == 2
    assert history.count("Selected evidence (") == 2
    csv_rows = list(csv.reader(StringIO(client.get(path + "/export?format=csv&lang=en").text.lstrip("\ufeff"))))
    assert updated["response"]["blocks"][1]["text"] in csv_rows[1][-1]
    assert updated["response"]["blocks"][0]["text"] in csv_rows[1][-1]
    assert "Line 4\nLine 3" == csv_rows[1][-2]


@pytest.mark.parametrize("ids", [[999], [-1], []])
def test_invalid_evidence_does_not_change_revision(client, ids):
    _, path = demo(client)
    response = client.put(path + "/reviews/0", json={"revision":0,"decision":"supported","note":"Test", "evidence_ids":ids})
    assert response.status_code == 422
    assert client.get(path).json()["revision"] == 0


def test_ambiguous_legacy_and_new_evidence_rejected(client):
    _, path = demo(client)
    assert client.put(path + "/reviews/0", json={"revision":0,"decision":"supported","note":"Test","evidence_id":0,"evidence_ids":[1]}).status_code == 422


def test_manual_add_when_extraction_is_empty_with_unicode_source(client):
    source = "🧪 Archive exports every Friday."
    response = client.post("/api/sessions", files={"requirement":("r.txt",source.encode()),"response":("s.txt",b"Archive exports every Friday.")})
    assert response.status_code == 201
    value = response.json()
    assert value["rows"] == []
    path = f"/api/sessions/{value['id']}"
    result = client.post(path + "/clauses", json={"revision":0,"block_id":0,"start":2,"end":len(source),"text":"Archive exports every Friday."})
    assert result.status_code == 201
    clause = result.json()["rows"][0]["clause"]
    assert clause["source_text"] == source[2:]
    assert clause["id"] == 0 and clause["origin"] == "manual"
    assert client.get(path).json()["audit"][0]["kind"] == "add"


@pytest.mark.parametrize("changes", [{"start":3,"end":2},{"end":9999},{"block_id":999},{"text":"  "}])
def test_manual_add_validates_anchor_and_text(client, changes):
    _, path = demo(client)
    body = {"revision":0,"block_id":0,"start":0,"end":5,"text":"Manual requirement",**changes}
    assert client.post(path + "/clauses", json=body).status_code == 422
    assert client.get(path).json()["revision"] == 0


def test_edit_invalidates_only_affected_review_and_preserves_source_and_history(client):
    value, path = demo(client)
    client.put(path + "/reviews/0", json={"revision":0,"decision":"supported","note":"Confirmed before edit","evidence_ids":[0,1]})
    response = client.patch(path + "/clauses/0", json={"revision":1,"text":"Revised requirement"})
    assert response.status_code == 200
    data = response.json()
    assert data["rows"][0]["review"]["decision"] == "pending"
    assert data["rows"][0]["review"]["evidence_ids"] == []
    assert data["rows"][0]["clause"]["source_text"] == value["rows"][0]["clause"]["text"]
    assert data["rows"][0]["clause"]["version"] == 2
    assert data["rows"][1] == value["rows"][1]
    assert data["audit"][-1]["before"]["review"]["note"] == "Confirmed before edit"
    assert "Confirmed before edit" in client.get(path + "/export?lang=en").text


def test_split_retains_parent_and_old_decision_with_stable_ids(client):
    value, path = demo(client)
    client.put(path + "/reviews/0", json={"revision":0,"decision":"supported","note":"Parent reviewed","evidence_ids":[0]})
    result = client.post(path + "/clauses/0/split", json={"revision":1,"parts":["Import equipment records.","Validate imported fields."]})
    assert result.status_code == 200
    data = result.json()
    assert data["rows"][0]["superseded_by"] == [8,9]
    assert data["rows"][0]["review"]["note"] == "Parent reviewed"
    assert data["rows"][1]["clause"]["id"] == 1
    for row in data["rows"][-2:]:
        assert row["clause"]["parent_id"] == 0
        assert row["clause"]["source_text"] == value["rows"][0]["clause"]["text"]
        assert row["review"]["decision"] == "pending"
    assert client.get("/api/sessions").json()[0]["count"] == 9
    assert client.get("/api/sessions").json()[0]["reviewed"] == 0
    assert client.put(path + "/reviews/0", json={"revision":2,"decision":"missing","note":"Old parent"}).status_code == 404
    assert len(list(csv.reader(StringIO(client.get(path + "/export?format=csv").text)))) == 10


@pytest.mark.parametrize("parts", [["only one"],["same","same"],["valid","   "]])
def test_split_invalid_input_is_atomic(client, parts):
    value, path = demo(client)
    assert client.post(path + "/clauses/0/split", json={"revision":0,"parts":parts}).status_code == 422
    assert client.get(path).json() == value


def test_stale_mutations_cannot_override_current_data(client):
    _, path = demo(client)
    assert client.patch(path + "/clauses/0",json={"revision":0,"text":"Updated requirement"}).status_code == 200
    for method, suffix, extra in [("patch","/clauses/0",{"text":"Stale edit"}), ("post","/clauses/0/split",{"parts":["A","B"]}), ("post","/clauses",{"text":"New", "block_id":0,"start":0,"end":5})]:
        assert getattr(client,method)(path + suffix,json={"revision":0,**extra}).status_code == 409


def test_english_report_preserves_original_quotation_and_rationale(client):
    value, path = demo(client)
    client.put(path + "/reviews/0",json={"revision":0,"decision":"supported","note":"人工依据 unchanged","evidence_ids":[0]})
    md = client.get(path + "/export?lang=en").text
    assert "# TraceClause evidence review report" in md
    assert "Selected evidence (Line 3)" in md
    assert value["rows"][0]["clause"]["text"] in md
    assert "人工依据 unchanged" in md
    assert "自动提示" not in md and "候选证据" not in md
    assert client.get(path + "/export?format=json&lang=en").json() == client.get(path).json()


def test_english_api_errors(client):
    response = client.get("/api/sessions/missing",headers={"Accept-Language":"en"})
    assert response.json()["detail"] == "Review task not found."


def test_noop_edit_does_not_invalidate_decision(client):
    value, path = demo(client)
    assert client.patch(path + "/clauses/0",json={"revision":0,"text":value["rows"][0]["clause"]["text"]}).status_code == 422
    assert client.get(path).json() == value


def test_add_and_split_enforce_active_capacity_atomically(client):
    value, path = demo(client)
    template = value["rows"][0]
    value["rows"] = []
    for ident in range(499):
        row = deepcopy(template)
        row["clause"]["id"] = ident
        value["rows"].append(row)
    with closing(connect()) as conn, conn:
        conn.execute("UPDATE sessions SET payload=? WHERE id=?", (json.dumps(value), value["id"]))
    result = client.post(path + "/clauses/0/split", json={"revision":0,"parts":["A","B"]})
    assert result.status_code == 200
    assert client.get("/api/sessions").json()[0]["count"] == 500
    assert client.post(path + "/clauses", json={"revision":1,"block_id":0,"start":0,"end":2,"text":"Extra"}).status_code == 422
    assert client.post(path + "/clauses/1/split", json={"revision":1,"parts":["C","D"]}).status_code == 422
    assert client.get(path).json() == result.json()


def test_english_edit_history_has_readable_labels_and_retains_evidence(client):
    value, path = demo(client)
    client.put(path + "/reviews/0", json={"revision":0,"decision":"supported","note":"Original rationale","evidence_ids":[0,1]})
    client.patch(path + "/clauses/0", json={"revision":1,"text":"Updated wording"})
    report = client.get(path + "/export?lang=en").text
    history = report.split("## Requirement and review history")[1]
    assert "**Before**" in history and "**After**" in history
    assert "Original rationale" in history and "Updated wording" in history
    assert value["response"]["blocks"][1]["text"] in history
    assert "候选证据" not in history and "找到词面相关" not in history
