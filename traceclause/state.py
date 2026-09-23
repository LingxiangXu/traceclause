"""Additive snapshot compatibility and stable clause identities."""
from copy import deepcopy


def normalize(session):
    session["schema_version"] = 2
    for row in session["rows"]:
        clause = row["clause"]
        clause.setdefault("version", 1)
        clause.setdefault("origin", "extracted")
        clause.setdefault("source_text", session["requirement"]["blocks"][clause["block_id"]]["text"][clause["start"]:clause["end"]])
        row.setdefault("superseded_by", [])
        review = row["review"]
        if "evidence_ids" not in review:
            review["evidence_ids"] = [] if review.get("evidence_id") is None else [review["evidence_id"]]
    return session


def active_rows(session):
    return [r for r in session["rows"] if not r.get("superseded_by")]


def pending_review():
    return {"decision": "pending", "note": "", "evidence_ids": [], "evidence_id": None}


def event(session, kind, clause_id, before, after, timestamp):
    session["audit"].append({"at": timestamp, "kind": kind, "clause_id": clause_id,
                             "before": deepcopy(before), "after": deepcopy(after)})
