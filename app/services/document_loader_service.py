"""
Document loader service for Engineering Copilot AI.

This service extracts text from uploaded documents.

Supported formats:
- PDF
- DOCX
- TXT
- MD
- HTML
"""

from pathlib import Path
from typing import Dict, List

import fitz
from bs4 import BeautifulSoup
from docx import Document

from app.core.logging import logger


class DocumentLoaderService:
    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".html", ".htm"}

    def validate_file(self, file_path: str) -> Path:
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        if path.suffix.lower() not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file extension: {path.suffix}. "
                f"Supported extensions: {self.SUPPORTED_EXTENSIONS}"
            )

        return path

    def load_document(self, file_path: str) -> Dict:
        path = self.validate_file(file_path)
        extension = path.suffix.lower()

        logger.info(f"Loading document: {path}")

        if extension == ".pdf":
            pages = self._load_pdf(path)
        elif extension == ".docx":
            pages = self._load_docx(path)
        elif extension in [".txt", ".md"]:
            pages = self._load_text(path)
        elif extension in [".html", ".htm"]:
            pages = self._load_html(path)
        else:
            raise ValueError(f"Unsupported extension: {extension}")

        return {
            "filename": path.name,
            "file_path": str(path),
            "extension": extension,
            "pages": pages,
            "page_count": len(pages),
            "total_characters": sum(len(page["text"]) for page in pages),
        }

    def _load_pdf(self, path: Path) -> List[Dict]:
        pages = []

        with fitz.open(path) as pdf:
            for page_index, page in enumerate(pdf, start=1):
                text = page.get_text().strip()

                if text:
                    pages.append(
                        {
                            "page_number": page_index,
                            "text": text,
                        }
                    )

        return pages

    def _load_docx(self, path: Path) -> List[Dict]:
        document = Document(path)

        paragraphs = [
            paragraph.text.strip()
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        text = "\n".join(paragraphs)

        return [
            {
                "page_number": 1,
                "text": text,
            }
        ]

    def _load_text(self, path: Path) -> List[Dict]:
        text = path.read_text(encoding="utf-8", errors="ignore").strip()

        return [
            {
                "page_number": 1,
                "text": text,
            }
        ]

    def _load_html(self, path: Path) -> List[Dict]:
        html = path.read_text(encoding="utf-8", errors="ignore")
        soup = BeautifulSoup(html, "html.parser")

        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator="\n")
        cleaned_text = "\n".join(
            line.strip()
            for line in text.splitlines()
            if line.strip()
        )

        return [
            {
                "page_number": 1,
                "text": cleaned_text,
            }
        ]