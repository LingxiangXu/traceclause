"""Explainable character-bigram BM25 retrieval; scores are not compliance probabilities."""
from collections import Counter
import math
import re

ENGINE_VERSION = "char-bm25-v1"
STOP = {"系统", "支持", "应支", "必须", "提供", "功能", "要求", "实现"}


def tokens(text):
    result = []
    for word in re.findall(r"[\u4e00-\u9fff]+|[a-z0-9]+", text.lower()):
        if re.fullmatch(r"[a-z0-9]+", word):
            result.append(word)
        else:
            result.extend(word[i:i + 2] for i in range(len(word) - 1))
    return [t for t in result if t not in STOP]


def match_requirements(clauses, response):
    blocks = response["blocks"]
    counters = [Counter(tokens(b["text"])) for b in blocks]
    freq = Counter(token for counter in counters for token in counter)
    avg_length = sum(map(lambda c: sum(c.values()), counters)) / max(len(counters), 1)
    rows = []
    for clause in clauses:
        query = set(tokens(clause["text"]))
        candidates = []
        for block, counter in zip(blocks, counters):
            common = query & counter.keys()
            if not common:
                continue
            score = sum(math.log(1 + (len(blocks) - freq[t] + .5) / (freq[t] + .5)) *
                        counter[t] * 2.5 / (counter[t] + 1.5 * (.25 + .75 * sum(counter.values()) / max(avg_length, 1)))
                        for t in common)
            coverage = len(common) / max(len(query), 1)
            candidates.append({"block_id": block["id"], "text": block["text"], "location": block["location"],
                               "score": round(score, 4), "coverage": round(coverage, 3),
                               "terms": sorted(common)})
        candidates.sort(key=lambda c: (-c["score"], c["block_id"]))
        candidates = candidates[:3]
        best = candidates[0] if candidates else None
        status, reason = "missing", "未检索到足够相关的原文；这不等同于不满足要求。"
        if best and best["coverage"] >= .22 and len(best["terms"]) >= 2:
            status, reason = "candidate", "找到词面相关的候选原文，需人工确认覆盖范围与约束。"
            negative = r"不支持|不提供|无法|尚未|暂不|仅支持|仅提供|not support|unsupported|cannot"
            if re.search(negative, best["text"], re.I):
                status, reason = "conflict", "候选原文出现否定或范围限制表述，需人工判断是否冲突。"
            elif set(re.findall(r"\d+(?:\.\d+)?", clause["text"])) - set(re.findall(r"\d+(?:\.\d+)?", best["text"])):
                # Ignore numbering prefixes before checking actual quantitative constraints.
                clean = re.sub(r"^\s*(?:\d+[.、)）]|[-*])\s*", "", clause["text"])
                if set(re.findall(r"\d+(?:\.\d+)?", clean)) - set(re.findall(r"\d+(?:\.\d+)?", best["text"])):
                    reason = "找到候选原文，但要求中的数值未完整出现，请重点核对数值与单位。"
        rows.append({"clause": clause, "status": status, "reason": reason, "candidates": candidates,
                     "review": {"decision": "pending", "note": "", "evidence_id": None}})
    return rows
