"""Compare baseline retrieval with query rewrite + expansion on the golden set.

Run from ``ai-service``:
    python experiments/scripts/evaluate_query_transformations.py

The script does not create, delete or re-index a Qdrant collection. It writes a
local report under ``experiments/results`` so the two configurations can be
compared using the same corpus and questions.
"""

import json
import os
import sys
import time
from pathlib import Path
from statistics import mean

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import settings
from app.services.langchain_rag_service import LangChainRAGService


GOLDEN_FILE = PROJECT_ROOT / "experiments" / "data" / "evaluation" / "rag_golden_eval_v1.json"
OUTPUT_FILE = PROJECT_ROOT / "experiments" / "results" / "query_transformation_ab_test.json"
TOP_K = 5
COLLECTION_NAME = os.getenv("EVALUATION_COLLECTION", "exp_openai_text_embedding_3_small")


def expected_filenames(question):
    return {
        item["source"].replace("\\", "/").split("/")[-1].casefold()
        for item in question.get("relevant_chunks", [])
    }


def metrics_for_question(chunks, question):
    expected = expected_filenames(question)
    if not expected:
        # Negative-question refusal evaluation is handled at answer-generation
        # level. Retrieval metrics below only compare questions with a source.
        return None

    retrieved = [str(chunk.get("filename", "")).casefold() for chunk in chunks]
    positions = [index for index, filename in enumerate(retrieved, 1) if filename in expected]
    relevant = len(positions)
    return {
        "id": question["id"],
        "hit_at_5": int(bool(positions)),
        "precision_at_5": relevant / len(retrieved) if retrieved else 0.0,
        "recall_at_5": min(relevant / len(expected), 1.0),
        "mrr": 1 / positions[0] if positions else 0.0,
        "sources": [chunk.get("source") for chunk in chunks],
    }


def summarize(rows, elapsed_seconds):
    return {
        "questions_evaluated": len(rows),
        "hit_at_5": round(mean(row["hit_at_5"] for row in rows), 4),
        "precision_at_5": round(mean(row["precision_at_5"] for row in rows), 4),
        "recall_at_5": round(mean(row["recall_at_5"] for row in rows), 4),
        "mrr": round(mean(row["mrr"] for row in rows), 4),
        "average_latency_seconds": round(elapsed_seconds / len(rows), 3),
    }


def evaluate(service, questions, use_query_rewrite, use_query_expansion, use_hierarchical_retrieval=False):
    started_at = time.perf_counter()
    rows = []
    for question in questions:
        chunks = service.retrieve(
            question=question["question"],
            use_query_rewrite=use_query_rewrite,
            use_query_expansion=use_query_expansion,
            use_hierarchical_retrieval=use_hierarchical_retrieval,
        )
        row = metrics_for_question(chunks, question)
        if row is not None:
            rows.append(row)
    return rows, time.perf_counter() - started_at


def main():
    # Evaluation should not depend on optional LangSmith connectivity.
    settings.LANGCHAIN_TRACING_V2 = False
    golden = json.loads(GOLDEN_FILE.read_text(encoding="utf-8"))
    questions = golden["questions"]
    service = LangChainRAGService(
        collection_name=COLLECTION_NAME,
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        retrieval_top_k=10,
        final_top_k=TOP_K,
        reranker_type="none",
    )

    baseline_rows, baseline_elapsed = evaluate(service, questions, False, False)
    rewrite_only_rows, rewrite_only_elapsed = evaluate(service, questions, True, False)
    enhanced_rows, enhanced_elapsed = evaluate(service, questions, True, True)
    hierarchical_rows, hierarchical_elapsed = evaluate(service, questions, False, False, True)
    baseline = summarize(baseline_rows, baseline_elapsed)
    rewrite_only = summarize(rewrite_only_rows, rewrite_only_elapsed)
    enhanced = summarize(enhanced_rows, enhanced_elapsed)
    hierarchical = summarize(hierarchical_rows, hierarchical_elapsed)
    report = {
        "scope": {
            "collection": COLLECTION_NAME,
            "questions_total": len(questions),
            "questions_scored": len(baseline_rows),
            "excluded_negative_questions": len(questions) - len(baseline_rows),
            "top_k": TOP_K,
            "reranker": "none (retrieval-only comparison)",
        },
        "baseline": baseline,
        "rewrite_only": rewrite_only,
        "rewrite_and_expansion": enhanced,
        "hierarchical": hierarchical,
        "rewrite_and_expansion_delta": {
            key: round(enhanced[key] - baseline[key], 4)
            for key in ("hit_at_5", "precision_at_5", "recall_at_5", "mrr", "average_latency_seconds")
        },
        "rewrite_only_delta": {
            key: round(rewrite_only[key] - baseline[key], 4)
            for key in ("hit_at_5", "precision_at_5", "recall_at_5", "mrr", "average_latency_seconds")
        },
        "hierarchical_delta": {
            key: round(hierarchical[key] - baseline[key], 4)
            for key in ("hit_at_5", "precision_at_5", "recall_at_5", "mrr", "average_latency_seconds")
        },
        "details": {
            "baseline": baseline_rows,
            "rewrite_only": rewrite_only_rows,
            "rewrite_and_expansion": enhanced_rows,
            "hierarchical": hierarchical_rows,
        },
    }
    OUTPUT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("scope", "baseline", "rewrite_only", "rewrite_and_expansion", "hierarchical", "rewrite_only_delta", "rewrite_and_expansion_delta", "hierarchical_delta")}, indent=2))
    print(f"\nDetailed report written to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
