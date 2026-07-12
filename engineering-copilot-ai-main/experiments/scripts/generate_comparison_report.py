"""
Generate a markdown comparison report for RAG experiments.

Inputs:
    experiments/results/embedding_results.json
    experiments/results/retrieval_evaluation_summary.json
    experiments/results/reranked_evaluation_summary.json

Output:
    experiments/results/comparison_report.md
"""

import json
from pathlib import Path

from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]

EMBEDDING_RESULTS_FILE = (
    PROJECT_ROOT / "experiments" / "results" / "embedding_results.json"
)

RETRIEVAL_SUMMARY_FILE = (
    PROJECT_ROOT / "experiments" / "results" / "retrieval_evaluation_summary.json"
)

RERANKED_SUMMARY_FILE = (
    PROJECT_ROOT / "experiments" / "results" / "reranked_evaluation_summary.json"
)

OUTPUT_FILE = (
    PROJECT_ROOT / "experiments" / "results" / "comparison_report.md"
)


def load_json(file_path: Path):
    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def build_markdown_table(rows, columns):
    header = "| " + " | ".join(columns) + " |"
    separator = "| " + " | ".join(["---"] * len(columns)) + " |"

    body = []

    for row in rows:
        body.append(
            "| "
            + " | ".join(str(row.get(column, "")) for column in columns)
            + " |"
        )

    return "\n".join([header, separator] + body)


def main() -> None:
    logger.info("Generating comparison report")

    embedding_results = load_json(EMBEDDING_RESULTS_FILE)

    retrieval_summary = load_json(RETRIEVAL_SUMMARY_FILE)["summary_by_model"]
    reranked_summary = load_json(RERANKED_SUMMARY_FILE)["summary_by_model"]

    markdown = []

    markdown.append("# RAG Experiments Comparison Report")
    markdown.append("")
    markdown.append("## Objective")
    markdown.append("")
    markdown.append(
        "The objective of this experiment is to compare multiple embedding models "
        "and retrieval strategies for the Engineering Copilot RAG pipeline."
    )
    markdown.append("")
    markdown.append("The evaluated pipeline is:")
    markdown.append("")
    markdown.append("```text")
    markdown.append("Documents")
    markdown.append("↓")
    markdown.append("Chunking")
    markdown.append("↓")
    markdown.append("Embeddings")
    markdown.append("↓")
    markdown.append("Qdrant Retrieval")
    markdown.append("↓")
    markdown.append("Optional Reranking")
    markdown.append("↓")
    markdown.append("Final Context")
    markdown.append("```")
    markdown.append("")

    markdown.append("## Embedding Models Performance")
    markdown.append("")
    markdown.append(
        build_markdown_table(
            embedding_results,
            [
                "provider",
                "model",
                "status",
                "chunks_tested",
                "dimension",
                "embedding_time_seconds",
                "avg_time_per_chunk_seconds",
            ],
        )
    )
    markdown.append("")

    markdown.append("## Retrieval Evaluation — Embedding Only")
    markdown.append("")
    markdown.append(
        build_markdown_table(
            retrieval_summary,
            [
                "model",
                "provider",
                "questions_evaluated",
                "eval_k",
                "avg_hit_file",
                "avg_precision_file",
                "avg_recall_file",
                "avg_mrr_file",
                "avg_hit_category",
                "avg_retrieval_time_seconds",
            ],
        )
    )
    markdown.append("")

    markdown.append("## Retrieval Evaluation — Embedding + Reranker")
    markdown.append("")
    markdown.append(
        build_markdown_table(
            reranked_summary,
            [
                "model",
                "provider",
                "questions_evaluated",
                "eval_k",
                "avg_hit_file",
                "avg_precision_file",
                "avg_recall_file",
                "avg_mrr_file",
                "avg_hit_category",
                "avg_retrieval_time_seconds",
            ],
        )
    )
    markdown.append("")

    markdown.append("## Interpretation")
    markdown.append("")
    markdown.append(
        "- `text-embedding-3-small` achieved the best overall balance between retrieval quality and execution time."
    )
    markdown.append(
        "- `all-MiniLM-L6-v2` is a strong lightweight local alternative, especially when API cost or offline execution matters."
    )
    markdown.append(
        "- `qwen3-embedding:8b` produced strong results but is heavier due to its 4096-dimensional vectors and slower execution."
    )
    markdown.append(
        "- `BAAI/bge-m3` and `nomic-ai/nomic-embed-text-v1.5` were less competitive on this dataset."
    )
    markdown.append(
        "- Reranking improved precision and MRR, meaning the most relevant chunks were ranked higher."
    )
    markdown.append("")

    markdown.append("## Final Decision")
    markdown.append("")
    markdown.append("The selected baseline pipeline is:")
    markdown.append("")
    markdown.append("```text")
    markdown.append("Embedding model: OpenAI text-embedding-3-small")
    markdown.append("Vector database: Qdrant")
    markdown.append("Initial retrieval: Top 10")
    markdown.append("Reranker: cross-encoder/ms-marco-MiniLM-L-6-v2")
    markdown.append("Final context: Top 5 chunks")
    markdown.append("```")
    markdown.append("")

    markdown.append("## Next Steps")
    markdown.append("")
    markdown.append(
        "1. Convert the experimental scripts into reusable application services."
    )
    markdown.append(
        "2. Implement the final RAG service using the selected pipeline."
    )
    markdown.append(
        "3. Add LangChain and LangSmith for prompt orchestration, tracing, and evaluation."
    )
    markdown.append(
        "4. Build the first agent using this validated retrieval pipeline."
    )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n".join(markdown), encoding="utf-8")

    print("=" * 80)
    print("Comparison report generated")
    print(f"Output file: {OUTPUT_FILE}")
    print("=" * 80)

    logger.info(f"Comparison report saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()