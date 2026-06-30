"""
Rerank retrieved chunks using a CrossEncoder reranker.

Input:
    experiments/results/retrieval_results.json

Output:
    experiments/results/reranked_results.json
"""

import json
import time
from pathlib import Path
from typing import Dict, List

from sentence_transformers import CrossEncoder

from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "results"
    / "retrieval_results.json"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "results"
    / "reranked_results.json"
)

RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

# We retrieve top 10 from Qdrant, then keep top 5 after reranking.
FINAL_TOP_K = 5

# Only rerank our two best embedding models for now.
MODELS_TO_RERANK = {
    "text-embedding-3-small",
    "sentence-transformers/all-MiniLM-L6-v2",
}


def load_json(file_path: Path) -> List[Dict]:
    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json(data: List[Dict], file_path: Path) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)

    with file_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def rerank_single_item(
    reranker: CrossEncoder,
    item: Dict,
) -> Dict:
    question = item["question"]
    results = item.get("results", [])

    if not results:
        item["reranking_time_seconds"] = 0
        item["results_before_reranking"] = []
        item["results"] = []
        return item

    pairs = [
        [question, result.get("text_preview", "")]
        for result in results
    ]

    start_time = time.perf_counter()
    rerank_scores = reranker.predict(pairs)
    reranking_time = time.perf_counter() - start_time

    reranked_results = []

    for result, rerank_score in zip(results, rerank_scores):
        new_result = dict(result)
        new_result["embedding_score"] = result.get("score")
        new_result["rerank_score"] = float(rerank_score)
        reranked_results.append(new_result)

    reranked_results.sort(
        key=lambda result: result["rerank_score"],
        reverse=True,
    )

    new_item = dict(item)
    new_item["results_before_reranking"] = results
    new_item["results"] = reranked_results[:FINAL_TOP_K]
    new_item["top_k"] = FINAL_TOP_K
    new_item["reranker_model"] = RERANKER_MODEL
    new_item["reranking_time_seconds"] = round(reranking_time, 4)

    return new_item


def main() -> None:
    logger.info("Starting reranking experiment")

    if not INPUT_FILE.exists():
        logger.error(f"Retrieval results file not found: {INPUT_FILE}")
        return

    retrieval_results = load_json(INPUT_FILE)

    filtered_results = [
        item
        for item in retrieval_results
        if item.get("model") in MODELS_TO_RERANK
    ]

    logger.info(f"Items loaded: {len(retrieval_results)}")
    logger.info(f"Items selected for reranking: {len(filtered_results)}")
    logger.info(f"Loading reranker: {RERANKER_MODEL}")

    reranker = CrossEncoder(RERANKER_MODEL)

    reranked_results = []

    for item in filtered_results:
        reranked_item = rerank_single_item(
            reranker=reranker,
            item=item,
        )
        reranked_results.append(reranked_item)

    save_json(reranked_results, OUTPUT_FILE)

    print("=" * 100)
    print("Reranking Report")
    print("=" * 100)
    print(f"Input file: {INPUT_FILE}")
    print(f"Output file: {OUTPUT_FILE}")
    print(f"Items reranked: {len(reranked_results)}")
    print(f"Reranker: {RERANKER_MODEL}")
    print(f"Final top K: {FINAL_TOP_K}")
    print("=" * 100)

    logger.info("Reranking experiment finished")


if __name__ == "__main__":
    main()