"""
Inspect generated chunks before embedding.

This script reads chunks.jsonl and prints useful statistics:
- total chunks
- chunks per category
- chunks per file
- average text length
- sample chunks
"""

import json
from collections import Counter
from pathlib import Path

from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CHUNKS_FILE = PROJECT_ROOT / "experiments" / "data" / "processed" / "chunks" / "chunks_clean.jsonl"


def load_chunks():
    chunks = []

    with CHUNKS_FILE.open("r", encoding="utf-8") as file:
        for line in file:
            chunks.append(json.loads(line))

    return chunks


def main():
    logger.info("Inspecting chunks")

    if not CHUNKS_FILE.exists():
        logger.error(f"Chunks file not found: {CHUNKS_FILE}")
        return

    chunks = load_chunks()

    total_chunks = len(chunks)
    category_counter = Counter(chunk["category"] for chunk in chunks)
    file_counter = Counter(chunk["filename"] for chunk in chunks)

    lengths = [len(chunk["text"]) for chunk in chunks]

    print("=" * 60)
    print("Chunks Inspection Report")
    print("=" * 60)

    print(f"Total chunks: {total_chunks}")
    print(f"Average chunk length: {sum(lengths) // len(lengths)} characters")
    print(f"Min chunk length: {min(lengths)} characters")
    print(f"Max chunk length: {max(lengths)} characters")

    print("\nChunks per category:")
    for category, count in category_counter.items():
        print(f"- {category}: {count}")

    print("\nTop files by chunks:")
    for filename, count in file_counter.most_common(10):
        print(f"- {filename}: {count}")

    print("\nSample chunks:")
    for index, chunk in enumerate(chunks[:3]):
        print("-" * 60)
        print(f"Sample {index + 1}")
        print(f"File: {chunk['filename']}")
        print(f"Category: {chunk['category']}")
        print(f"Text preview:\n{chunk['text'][:500]}")

    print("=" * 60)
    logger.info("Chunks inspection finished")


if __name__ == "__main__":
    main()