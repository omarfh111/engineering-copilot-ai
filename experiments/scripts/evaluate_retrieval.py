"""
Evaluate retrieval results against a golden evaluation file.

Current evaluation level:
- filename-based evaluation
- category-based evaluation

Later improvement:
- page-level evaluation after adding page_number to chunks

Inputs:
    experiments/results/retrieval_results.json
    experiments/data/evaluation/rag_golden_eval_v1.json

Outputs:
    experiments/results/retrieval_evaluation_summary.json
    experiments/results/retrieval_evaluation_summary.csv
"""

import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set

import pandas as pd

from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]

RETRIEVAL_RESULTS_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "results"
    / "reranked_results.json"
)

GOLDEN_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "evaluation"
    / "rag_golden_eval_v1.json"
)

OUTPUT_JSON = (
    PROJECT_ROOT
    / "experiments"
    / "results"
    / "reranked_evaluation_summary.json"
)

OUTPUT_CSV = (
    PROJECT_ROOT
    / "experiments"
    / "results"
    / "reranked_evaluation_summary.csv"
)


def load_json(file_path: Path):
    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def normalize_filename(filename: str) -> str:
    """
    Normalize filenames for comparison.

    Golden sources look like:
        security/owasp-api-security-top-10.pdf

    Retrieved filenames look like:
        owasp-api-security-top-10.pdf
    """
    if not filename:
        return ""

    return filename.replace("\\", "/").split("/")[-1].strip().lower()


def get_expected_filenames(question_data: Dict) -> Set[str]:
    expected_files = set()

    for chunk in question_data.get("relevant_chunks", []):
        source = chunk.get("source", "")
        expected_files.add(normalize_filename(source))

    return expected_files


def get_expected_categories(question_data: Dict) -> Set[str]:
    expected_categories = set()

    for chunk in question_data.get("relevant_chunks", []):
        category = chunk.get("category")
        if category:
            expected_categories.add(category)

    return expected_categories


def get_eval_k(retrieval_results: List[Dict]) -> int:
    """
    Detect K automatically from retrieval results.
    Example:
        if each result has 10 retrieved chunks => K = 10
    """
    for item in retrieval_results:
        results = item.get("results", [])
        if results:
            return len(results)

    return 0


def evaluate_single_result(result: Dict, golden_question: Dict, eval_k: int) -> Dict:
    expected_files = get_expected_filenames(golden_question)
    expected_categories = get_expected_categories(golden_question)

    retrieved_results = result.get("results", [])

    retrieved_files = [
        normalize_filename(item.get("filename", ""))
        for item in retrieved_results
    ]

    retrieved_categories = [
        item.get("category", "")
        for item in retrieved_results
    ]

    is_negative = len(expected_files) == 0

    max_score = max(
        [item.get("score", 0) for item in retrieved_results],
        default=0,
    )

    if is_negative:
        # Simple negative check.
        # Later we can tune this threshold per model.
        negative_success = max_score < 0.45

        return {
            "question_id": result["question_id"],
            "question_type": golden_question.get("type"),
            "difficulty": golden_question.get("difficulty"),
            "model": result["model"],
            "provider": result["provider"],
            "collection": result["collection"],
            "eval_k": eval_k,
            "is_negative": True,
            "hit_file": int(negative_success),
            "precision_file": 1.0 if negative_success else 0.0,
            "recall_file": 1.0 if negative_success else 0.0,
            "mrr_file": 1.0 if negative_success else 0.0,
            "hit_category": int(negative_success),
            "retrieval_time_seconds": result.get("retrieval_time_seconds"),
            "expected_files": [],
            "retrieved_files": retrieved_files,
            "expected_categories": [],
            "retrieved_categories": retrieved_categories,
            "max_score": max_score,
        }

    hit_positions = []

    for index, filename in enumerate(retrieved_files, start=1):
        if filename in expected_files:
            hit_positions.append(index)

    hit_file = 1 if hit_positions else 0

    relevant_retrieved_count = sum(
        1 for filename in retrieved_files if filename in expected_files
    )

    actual_k = len(retrieved_results)

    precision_file = (
        relevant_retrieved_count / actual_k
        if actual_k
        else 0
    )

    recall_file = (
        relevant_retrieved_count / len(expected_files)
        if expected_files
        else 0
    )

    mrr_file = 1 / min(hit_positions) if hit_positions else 0

    category_hit_count = sum(
        1 for category in retrieved_categories if category in expected_categories
    )

    hit_category = 1 if category_hit_count > 0 else 0

    return {
        "question_id": result["question_id"],
        "question_type": golden_question.get("type"),
        "difficulty": golden_question.get("difficulty"),
        "model": result["model"],
        "provider": result["provider"],
        "collection": result["collection"],
        "eval_k": eval_k,
        "is_negative": False,
        "hit_file": hit_file,
        "precision_file": round(precision_file, 4),
        "recall_file": round(min(recall_file, 1.0), 4),
        "mrr_file": round(mrr_file, 4),
        "hit_category": hit_category,
        "retrieval_time_seconds": result.get("retrieval_time_seconds"),
        "expected_files": sorted(expected_files),
        "retrieved_files": retrieved_files,
        "expected_categories": sorted(expected_categories),
        "retrieved_categories": retrieved_categories,
        "max_score": max_score,
    }


def build_golden_index(golden_data: Dict) -> Dict[str, Dict]:
    return {
        question["id"]: question
        for question in golden_data["questions"]
    }


def summarize_by_model(evaluations: List[Dict]) -> List[Dict]:
    grouped = defaultdict(list)

    for item in evaluations:
        grouped[item["model"]].append(item)

    summary = []

    for model, rows in grouped.items():
        summary.append(
            {
                "model": model,
                "provider": rows[0]["provider"],
                "collection": rows[0]["collection"],
                "eval_k": rows[0]["eval_k"],
                "questions_evaluated": len(rows),
                "avg_hit_file": round(
                    sum(row["hit_file"] for row in rows) / len(rows),
                    4,
                ),
                "avg_precision_file": round(
                    sum(row["precision_file"] for row in rows) / len(rows),
                    4,
                ),
                "avg_recall_file": round(
                    sum(row["recall_file"] for row in rows) / len(rows),
                    4,
                ),
                "avg_mrr_file": round(
                    sum(row["mrr_file"] for row in rows) / len(rows),
                    4,
                ),
                "avg_hit_category": round(
                    sum(row["hit_category"] for row in rows) / len(rows),
                    4,
                ),
                "avg_retrieval_time_seconds": round(
                    sum(
                        row["retrieval_time_seconds"] or 0
                        for row in rows
                    )
                    / len(rows),
                    4,
                ),
            }
        )

    summary.sort(
        key=lambda item: (
            item["avg_hit_file"],
            item["avg_mrr_file"],
            item["avg_precision_file"],
        ),
        reverse=True,
    )

    return summary


def save_outputs(evaluations: List[Dict], summary: List[Dict]) -> None:
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    output = {
        "summary_by_model": summary,
        "detailed_evaluations": evaluations,
    }

    with OUTPUT_JSON.open("w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)

    dataframe = pd.DataFrame(summary)
    dataframe.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")


def print_summary(summary: List[Dict]) -> None:
    print("=" * 120)
    print("Retrieval Evaluation Summary")
    print("=" * 120)

    for index, row in enumerate(summary, start=1):
        k = row["eval_k"]

        print(f"Rank #{index}")
        print(f"Model: {row['model']}")
        print(f"Provider: {row['provider']}")
        print(f"Questions evaluated: {row['questions_evaluated']}")
        print(f"Hit@{k} file: {row['avg_hit_file']}")
        print(f"Precision@{k} file: {row['avg_precision_file']}")
        print(f"Recall@{k} file: {row['avg_recall_file']}")
        print(f"MRR file: {row['avg_mrr_file']}")
        print(f"Hit@{k} category: {row['avg_hit_category']}")
        print(f"Avg retrieval time: {row['avg_retrieval_time_seconds']} sec")
        print("-" * 120)

    print(f"JSON saved to: {OUTPUT_JSON}")
    print(f"CSV saved to: {OUTPUT_CSV}")
    print("=" * 120)


def main() -> None:
    logger.info("Starting retrieval evaluation")

    if not RETRIEVAL_RESULTS_FILE.exists():
        logger.error(f"Retrieval results file not found: {RETRIEVAL_RESULTS_FILE}")
        return

    if not GOLDEN_FILE.exists():
        logger.error(f"Golden eval file not found: {GOLDEN_FILE}")
        return

    retrieval_results = load_json(RETRIEVAL_RESULTS_FILE)
    golden_data = load_json(GOLDEN_FILE)
    golden_index = build_golden_index(golden_data)

    eval_k = get_eval_k(retrieval_results)

    if eval_k == 0:
        logger.error("No retrieval results found. Evaluation stopped.")
        return

    logger.info(f"Detected evaluation K: {eval_k}")

    evaluations = []

    for result in retrieval_results:
        question_id = result["question_id"]

        if question_id not in golden_index:
            logger.warning(f"Question not found in golden file: {question_id}")
            continue

        evaluation = evaluate_single_result(
            result=result,
            golden_question=golden_index[question_id],
            eval_k=eval_k,
        )

        evaluations.append(evaluation)

    if not evaluations:
        logger.error("No evaluations generated. Check question IDs.")
        return

    summary = summarize_by_model(evaluations)

    save_outputs(
        evaluations=evaluations,
        summary=summary,
    )

    print_summary(summary)

    logger.info("Retrieval evaluation finished")


if __name__ == "__main__":
    main()