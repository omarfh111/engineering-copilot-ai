"""Protected document-ingestion endpoints for the Spring Boot backend."""

from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.api.dependencies import get_document_rag_service
from app.api.security import require_internal_api_key
from app.core.config import settings
from app.core.logging import logger
from app.services.document_ingestion_service import DocumentIngestionService
from app.services.document_loader_service import DocumentLoaderService


router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentAskRequest(BaseModel):
    question: str = Field(..., min_length=3)


class DocumentSourceResponse(BaseModel):
    source: Optional[str] = None
    page_number: Optional[int] = None
    score: Optional[float] = None
    embedding_score: Optional[float] = None
    rerank_score: Optional[float] = None
    chunk_id: Optional[str] = None


class DocumentAskResponse(BaseModel):
    question: str
    answer: str
    sources: List[DocumentSourceResponse]
    chunks_used: int
    collection_name: str
    retrieval_top_k: int
    final_top_k: int
    reranker_type: str
    framework: str


class DocumentIngestResponse(BaseModel):
    status: str
    filename: str
    extension: str
    page_count: int
    chunks_indexed: int
    collection_name: str
    embedding_model: str
    qdrant_info: dict


def _safe_upload_name(filename: str) -> str:
    supplied_name = Path(filename or "document").name
    suffix = Path(supplied_name).suffix.lower()
    if suffix not in DocumentLoaderService.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file extension: {suffix or 'none'}. "
                "Supported formats are PDF, DOCX, TXT, MD and HTML."
            ),
        )
    return f"{uuid4().hex}{suffix}"


async def _stage_upload(file: UploadFile) -> Path:
    upload_dir = Path(settings.DOCUMENT_UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    staged_file = upload_dir / _safe_upload_name(file.filename or "document")
    bytes_written = 0

    try:
        with staged_file.open("wb") as target:
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.MAX_DOCUMENT_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="Document exceeds the configured upload size limit",
                    )
                target.write(chunk)
    except Exception:
        staged_file.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    if bytes_written == 0:
        staged_file.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Document file is empty")

    return staged_file


@router.post(
    "/ingest",
    response_model=DocumentIngestResponse,
    dependencies=[Depends(require_internal_api_key)],
)
async def ingest_document(
    file: UploadFile = File(...),
    project_id: int = Form(..., ge=1),
    document_id: int = Form(..., ge=1),
):
    """Receive bytes from Spring, stage them briefly, then index them.

    The client never supplies a filesystem path, Qdrant collection or a
    destructive recreate flag.  The project category is retained in Qdrant
    for the project-scoped RAG work planned for Sprint 3.
    """

    staged_file: Optional[Path] = None
    try:
        staged_file = await _stage_upload(file)
        service = DocumentIngestionService(
            collection_name=settings.DOCUMENT_COLLECTION,
            embedding_provider="openai",
            embedding_model="text-embedding-3-small",
            vector_size=1536,
        )
        return service.ingest_document(
            file_path=str(staged_file),
            category=f"project_{project_id}",
            source_type="project_document",
        )
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.exception(
            "Document ingestion failed | projectId=%s documentId=%s error=%s",
            project_id,
            document_id,
            error,
        )
        raise HTTPException(status_code=500, detail="Document ingestion failed")
    finally:
        if staged_file is not None:
            staged_file.unlink(missing_ok=True)


@router.post(
    "/ask",
    response_model=DocumentAskResponse,
    dependencies=[Depends(require_internal_api_key)],
)
def ask_uploaded_documents(request: DocumentAskRequest):
    try:
        rag_service = get_document_rag_service()
        return rag_service.answer_question(question=request.question, category=None)
    except Exception as error:
        logger.exception("Document ask failed: %s", error)
        raise HTTPException(status_code=500, detail="Document ask failed")
