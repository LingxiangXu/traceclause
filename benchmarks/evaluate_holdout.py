"""Frozen synthetic cases disjoint from v0.1 demos; not independently expert-labeled."""
import json
from pathlib import Path
import sys

from traceclause.matching import ENGINE_VERSION, match_requirements
from traceclause.parsing import extract_requirements, parse_document


def evaluate():
    cases = json.loads(Path(__file__).with_name("holdout-v02.json").read_text(encoding="utf-8"))
    extracted_total = gold_total = exact = cited = citations = relevant_count = 0
    hits1 = hits3 = 0
    missing_correct = missing_count = 0
    details = []
    for case in cases:
        req = parse_document("requirements.txt", case["requirement"].encode())
        res = parse_document("response.txt", "\n".join(case["response"]).encode())
        extracted = extract_requirements(req, allow_empty=True)
        gold = {item["text"] for item in case["gold"]}
        assert all(text in case["requirement"] for text in gold)
        extracted_total += len(extracted)
        gold_total += len(gold)
        exact += sum(c["text"] in gold for c in extracted)
        for clause in extracted:
            block = req["blocks"][clause["block_id"]]
            cited += block["text"][clause["start"]:clause["end"]] == clause["text"]
            citations += 1
        per_case = []
        for item in case["gold"]:
            assert all(0 <= index < len(res["blocks"]) for index in item["evidence"])
            # Gold queries isolate retrieval from extraction misses.
            row = match_requirements([{"id":0, "text":item["text"]}], res)[0]
            candidates = [c["block_id"] for c in row["candidates"]] if row["status"] != "missing" else []
            expected = set(item["evidence"])
            if expected:
                relevant_count += 1
                hits1 += bool(expected & set(candidates[:1]))
                hits3 += len(expected & set(candidates[:3])) / len(expected)
            else:
                missing_count += 1
                missing_correct += row["status"] == "missing"
            per_case.append({"requirement":item["text"], "expected":item["evidence"], "retrieved":candidates, "status":row["status"]})
        details.append({"id":case["id"], "extracted":[c["text"] for c in extracted], "retrieval":per_case})
    return {"engine":ENGINE_VERSION, "documents":len(cases), "gold_requirements":gold_total,
            "extracted_requirements":extracted_total, "extraction_exact_precision":exact/max(extracted_total,1),
            "extraction_exact_recall":exact/max(gold_total,1), "exact_source_span_rate":cited/max(citations,1),
            "retrieval_gold_queries":relevant_count, "retrieval_hit_at_1":hits1/max(relevant_count,1),
            "retrieval_macro_recall_at_3":hits3/max(relevant_count,1),
            "missing_cases":missing_count, "missing_detection_rate":missing_correct/max(missing_count,1),
            "limitations":"Synthetic, authored separately from v0.1 demos; frozen without engine tuning. Not independent expert annotation or production validation. Text fixtures only; no OCR/layout benchmark.",
            "cases":details}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(evaluate(), ensure_ascii=False, indent=2))
