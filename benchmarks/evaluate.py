"""Small transparent smoke benchmark, not evidence of real-world accuracy."""
import json
from pathlib import Path
from traceclause.matching import match_requirements
from traceclause.parsing import parse_document, extract_requirements


def main():
    cases = json.loads(Path(__file__).with_name("cases.json").read_text(encoding="utf-8"))
    results = []
    for case in cases:
        requirement = parse_document("req.txt", case["requirement"].encode())
        response = parse_document("res.txt", "\n".join(case["evidence"]).encode())
        row = match_requirements(extract_requirements(requirement), response)[0]
        actual = row["candidates"][0]["block_id"] if row["status"] != "missing" and row["candidates"] else None
        results.append({"requirement": case["requirement"], "expected_block": case["expected_block"], "actual_block": actual,
                        "retrieval_correct": actual == case["expected_block"], "status_correct": row["status"] == case["expected_status"]})
    relevant = [r for r in results if r["expected_block"] is not None]
    output = {"cases": len(cases), "top1_recall_on_relevant": sum(r["retrieval_correct"] for r in relevant) / len(relevant),
              "status_accuracy": sum(r["status_correct"] for r in results) / len(results),
              "note": "人工编写的微型样例集，含同义改写失败案例；不代表真实文档准确率。", "results": results}
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
