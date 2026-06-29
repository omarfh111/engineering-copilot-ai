"""
Clean generated chunks before embedding.

This script removes noisy chunks such as:
- copyright pages
- publisher notes
- ISBN pages
- table of contents
- trademark/warranty notices
- very short chunks
- low-information chunks

Input:
    experiments/data/processed/chunks/chunks.jsonl

Output:
    experiments/data/processed/chunks/chunks_clean.jsonl
"""

import json
import re
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
    / "chunks.jsonl"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_clean.jsonl"
)


NOISE_PATTERNS = [
    "about this e-book",
    "all rights reserved",
    "copyright",
    "isbn",
    "publisher",
    "published by",
    "trademark",
    "trademarks",
    "warranty",
    "liability",
    "permission",
    "printing",
    "edition",
    "table of contents",
    "contents",
    "index",
    "dedication",
    "acknowledgments",
    "acknowledgements",
    "foreword",
    "preface",
    "cover image",
    "click here to view code image",
    "the author and publisher",
    "no responsibility for errors",
]


MIN_CHUNK_LENGTH = 120
MIN_ALPHA_RATIO = 0.45


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


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def alpha_ratio(text: str) -> float:
    if not text:
        return 0.0

    alpha_chars = sum(char.isalpha() for char in text)
    return alpha_chars / len(text)


def contains_noise_pattern(text: str) -> bool:
    lower_text = text.lower()

    return any(pattern in lower_text for pattern in NOISE_PATTERNS)


def is_low_quality_chunk(text: str) -> bool:
    normalized = normalize_text(text)

    if len(normalized) < MIN_CHUNK_LENGTH:
        return True

    if alpha_ratio(normalized) < MIN_ALPHA_RATIO:
        return True

    if contains_noise_pattern(normalized):
        return True

    if looks_like_table_of_contents(normalized):
        return True

    return False


def clean_chunk_record(record: Dict) -> Dict:
    cleaned_text = normalize_text(record["text"])

    record["text"] = cleaned_text
    record["metadata"]["cleaned"] = True

    return record

def looks_like_table_of_contents(text: str) -> bool:
    """
    Detect chunks that look like a table of contents.

    These chunks usually contain many repeated words like:
    Chapter, Part, Conclusion, Section, Appendix...
    """
    lower_text = text.lower()

    toc_keywords = [
        "chapter",
        "part",
        "section",
        "appendix",
        "conclusion",
        "contents",
        "table of contents",
    ]

    keyword_count = sum(lower_text.count(keyword) for keyword in toc_keywords)

    # If many TOC keywords appear in a single chunk, it is probably a table of contents.
    if keyword_count >= 8:
        return True

    return False

def main() -> None:
    logger.info("Starting chunks cleaning")

    if not INPUT_FILE.exists():
        logger.error(f"Input file not found: {INPUT_FILE}")
        return

    chunks = load_jsonl(INPUT_FILE)

    clean_chunks = []
    removed_chunks = []

    for chunk in chunks:
        text = chunk.get("text", "")

        if is_low_quality_chunk(text):
            removed_chunks.append(chunk)
            continue

        clean_chunks.append(clean_chunk_record(chunk))

    save_jsonl(clean_chunks, OUTPUT_FILE)

    print("=" * 60)
    print("Chunks Cleaning Report")
    print("=" * 60)
    print(f"Input chunks: {len(chunks)}")
    print(f"Clean chunks: {len(clean_chunks)}")
    print(f"Removed chunks: {len(removed_chunks)}")
    print(f"Output file: {OUTPUT_FILE}")
    print("=" * 60)

    logger.info(f"Input chunks: {len(chunks)}")
    logger.info(f"Clean chunks: {len(clean_chunks)}")
    logger.info(f"Removed chunks: {len(removed_chunks)}")
    logger.info(f"Cleaned chunks saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()