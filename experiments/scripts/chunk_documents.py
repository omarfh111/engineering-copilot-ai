"""
Experimental document chunking script.

This script reads raw enterprise documents from experiments/data/raw,
extracts text, splits it into chunks, and saves the result as JSONL.

Supported formats:
- PDF
- DOCX
- TXT
- MD
- HTML

Output:
- experiments/data/processed/chunks/chunks.jsonl
"""

import json
from pathlib import Path
from typing import Dict, List

import fitz  # PyMuPDF
from bs4 import BeautifulSoup
from docx import Document as DocxDocument

from app.core.config import settings
from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAW_DATA_DIR = PROJECT_ROOT / "experiments" / "data" / "raw"
OUTPUT_DIR = PROJECT_ROOT / "experiments" / "data" / "processed" / "chunks"
OUTPUT_FILE = OUTPUT_DIR / "chunks.jsonl"


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".html", ".htm"}


def extract_pages_from_pdf(file_path: Path) -> List[Dict]:
    pages = []

    with fitz.open(file_path) as pdf:
        for page_index, page in enumerate(pdf, start=1):
            pages.append(
                {
                    "page_number": page_index,
                    "text": page.get_text(),
                }
            )

    return pages


def extract_pages_from_docx(file_path: Path) -> List[Dict]:
    document = DocxDocument(file_path)

    paragraphs = [
        paragraph.text.strip()
        for paragraph in document.paragraphs
        if paragraph.text.strip()
    ]

    return [
        {
            "page_number": 1,
            "text": "\n".join(paragraphs),
        }
    ]


def extract_pages_from_html(file_path: Path) -> List[Dict]:
    html_content = file_path.read_text(encoding="utf-8", errors="ignore")

    soup = BeautifulSoup(html_content, "html.parser")

    for tag in soup(["script", "style"]):
        tag.decompose()

    return [
        {
            "page_number": 1,
            "text": soup.get_text(separator="\n"),
        }
    ]


def extract_pages_from_text_file(file_path: Path) -> List[Dict]:
    return [
        {
            "page_number": 1,
            "text": file_path.read_text(encoding="utf-8", errors="ignore"),
        }
    ]


def extract_pages(file_path: Path) -> List[Dict]:
    extension = file_path.suffix.lower()

    if extension == ".pdf":
        return extract_pages_from_pdf(file_path)

    if extension == ".docx":
        return extract_pages_from_docx(file_path)

    if extension in {".txt", ".md"}:
        return extract_pages_from_text_file(file_path)

    if extension in {".html", ".htm"}:
        return extract_pages_from_html(file_path)

    raise ValueError(f"Unsupported file type: {extension}")

def clean_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]

    return "\n".join(lines)


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start += chunk_size - chunk_overlap

    return chunks


def get_category(file_path: Path) -> str:
    relative_path = file_path.relative_to(RAW_DATA_DIR)

    if len(relative_path.parts) > 1:
        return relative_path.parts[0]

    return "uncategorized"


def build_chunk_records(file_path: Path) -> List[Dict]:
    logger.info(f"Processing document: {file_path}")

    pages = extract_pages(file_path)
    category = get_category(file_path)

    source = f"{category}/{file_path.name}"

    records = []

    for page in pages:
        page_number = page["page_number"]
        raw_text = page["text"]

        cleaned_text = clean_text(raw_text)

        if not cleaned_text:
            continue

        chunks = chunk_text(
            text=cleaned_text,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

        for index, chunk in enumerate(chunks):
            records.append(
                {
                    "chunk_id": f"{file_path.stem}_p{page_number}_{index}",
                    "source_type": "enterprise_document",
                    "category": category,
                    "source": source,
                    "filename": file_path.name,
                    "file_path": str(file_path),
                    "extension": file_path.suffix.lower(),
                    "page_number": page_number,
                    "chunk_index": index,
                    "text": chunk,
                    "metadata": {
                        "chunk_size": settings.CHUNK_SIZE,
                        "chunk_overlap": settings.CHUNK_OVERLAP,
                        "page_number": page_number,
                        "source": source,
                    },
                }
            )

    if not records:
        logger.warning(f"Empty document skipped: {file_path}")

    return records

def find_documents() -> List[Path]:
    documents = []

    for file_path in RAW_DATA_DIR.rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            documents.append(file_path)

    return documents


def save_jsonl(records: List[Dict], output_file: Path) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with output_file.open("w", encoding="utf-8") as file:
        for record in records:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")


def main() -> None:
    logger.info("Starting document chunking experiment")

    documents = find_documents()

    if not documents:
        logger.warning(f"No documents found in {RAW_DATA_DIR}")
        return

    all_chunks = []

    for document_path in documents:
        try:
            chunks = build_chunk_records(document_path)
            all_chunks.extend(chunks)
        except Exception as error:
            logger.error(f"Failed to process {document_path}: {error}")

    save_jsonl(all_chunks, OUTPUT_FILE)

    logger.info(f"Documents processed: {len(documents)}")
    logger.info(f"Chunks generated: {len(all_chunks)}")
    logger.info(f"Output saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()