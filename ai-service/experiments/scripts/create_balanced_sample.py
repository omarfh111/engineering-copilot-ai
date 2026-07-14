"""
Create a balanced chunks sample for embedding experiments.

Input:
    experiments/data/processed/chunks/chunks_clean.jsonl

Output:
    experiments/data/processed/chunks/chunks_sample_balanced.jsonl
"""

import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_clean.jsonl"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_sample_balanced.jsonl"
)

SAMPLE_SIZE_PER_CATEGORY = 200
RANDOM_SEED = 42


def load_jsonl(file_path: Path) -> List[Dict]:
    records = []

    with file_path.open("r", encoding="utf-8") as file:
        for line in file:
            records.append(json.loads(line))

    return records


def save_jsonl(records: List[Dict], file_path: Path) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)

    with file_path.open("w", encoding="utf-8") as file:
        for record in records:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")


def group_by_category(chunks: List[Dict]) -> Dict[str, List[Dict]]:
    grouped = defaultdict(list)

    for chunk in chunks:
        grouped[chunk["category"]].append(chunk)

    return grouped


def main() -> None:
    logger.info("Creating balanced sample")

    if not INPUT_FILE.exists():
        logger.error(f"Input file not found: {INPUT_FILE}")
        return

    random.seed(RANDOM_SEED)

    chunks = load_jsonl(INPUT_FILE)
    grouped_chunks = group_by_category(chunks)

    balanced_sample = []

    print("=" * 60)
    print("Balanced Sample Report")
    print("=" * 60)

    for category, category_chunks in grouped_chunks.items():
        sample_size = min(SAMPLE_SIZE_PER_CATEGORY, len(category_chunks))
        sampled_chunks = random.sample(category_chunks, sample_size)

        balanced_sample.extend(sampled_chunks)

        print(f"{category}: {sample_size} / {len(category_chunks)}")

    random.shuffle(balanced_sample)

    save_jsonl(balanced_sample, OUTPUT_FILE)

    print("-" * 60)
    print(f"Total sample chunks: {len(balanced_sample)}")
    print(f"Output file: {OUTPUT_FILE}")
    print("=" * 60)

    logger.info(f"Balanced sample created: {len(balanced_sample)} chunks")
    logger.info(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()