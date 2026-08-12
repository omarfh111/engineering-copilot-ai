"""
Chunking service for Engineering Copilot AI.

This service converts extracted document pages into clean chunks
ready for embedding and indexing.
"""

import re
from pathlib import Path
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging import logger


class ChunkingService:
    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        self.chunk_size = chunk_size or getattr(settings, "CHUNK_SIZE", 1000)
        self.chunk_overlap = chunk_overlap or getattr(settings, "CHUNK_OVERLAP", 150)

        logger.info(
            f"ChunkingService initialized | "
            f"chunk_size={self.chunk_size} | "
            f"chunk_overlap={self.chunk_overlap}"
        )

    def clean_text(self, text: str) -> str:
        if not text:
            return ""

        text = text.replace("\x00", " ")

        text = re.sub(r"\s+", " ", text)

        return text.strip()

    def split_text(self, text: str) -> List[str]:
        text = self.clean_text(text)

        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + self.chunk_size
            chunk = text[start:end]

            last_period = chunk.rfind(".")
            last_newline = chunk.rfind("\n")

            split_position = max(last_period, last_newline)

            if split_position > int(self.chunk_size * 0.5):
                chunk = chunk[: split_position + 1]
                end = start + split_position + 1

            chunk = chunk.strip()

            if chunk:
                chunks.append(chunk)

            # Keep the requested context overlap without risking a stalled
            # loop when an invalid overlap is configured.
            overlap = min(max(self.chunk_overlap, 0), max(end - start - 1, 0))
            start = end - overlap if overlap else end

        return chunks

    def chunk_document(
        self,
        document: Dict,
        category: str = "uploaded_documents",
        source_type: str = "uploaded_document",
        scope_metadata: Optional[Dict] = None,
    ) -> List[Dict]:
        filename = document["filename"]
        extension = document["extension"]
        file_path = document["file_path"]

        source = f"{category}/{filename}"
        file_stem = Path(filename).stem

        records = []
        scope_metadata = {
            key: value
            for key, value in (scope_metadata or {}).items()
            if value is not None
        }

        for page in document["pages"]:
            page_number = page["page_number"]
            page_text = page["text"]

            text_chunks = self.split_text(page_text)

            for chunk_index, chunk_text in enumerate(text_chunks):
                chunk_id = f"{file_stem}_p{page_number}_{chunk_index}"

                records.append(
                    {
                        "chunk_id": chunk_id,
                        "source_type": source_type,
                        "category": category,
                        "source": source,
                        "filename": filename,
                        "file_path": file_path,
                        "extension": extension,
                        "page_number": page_number,
                        "chunk_index": chunk_index,
                        "text": chunk_text,
                        "metadata": {
                            "chunk_size": self.chunk_size,
                            "chunk_overlap": self.chunk_overlap,
                            "source": source,
                            "page_number": page_number,
                            **scope_metadata,
                        },
                        **scope_metadata,
                    }
                )

        logger.info(
            f"Document chunked | filename={filename} | chunks={len(records)}"
        )

        return records
