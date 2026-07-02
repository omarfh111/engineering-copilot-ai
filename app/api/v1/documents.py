"""
Document ingestion API endpoints.

These endpoints expose document ingestion to the backend or frontend.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.api.dependencies import get_document_rag_service
from app.core.logging import logger
from app.services.document_ingestion_service import DocumentIngestionService


router = APIRouter(prefix="/documents", tags=["Documents"])


DEFAULT_DOCUMENT_COLLECTION = "documents_openai_text_embedding_3_small"

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
class DocumentIngestPathRequest(BaseModel):
    file_path: str = Field(..., min_length=3)
    collection_name: str = DEFAULT_DOCUMENT_COLLECTION
    category: str = "uploaded_documents"
    source_type: str = "uploaded_document"
    recreate_collection: bool = False
    max_chunks: Optional[int] = None


class DocumentIngestResponse(BaseModel):
    status: str
    filename: str
    extension: str
    page_count: int
    chunks_indexed: int
    collection_name: str
    embedding_model: str
    qdrant_info: dict


@router.post("/ingest-path", response_model=DocumentIngestResponse)
def ingest_document_path(request: DocumentIngestPathRequest):
    try:
        service = DocumentIngestionService(
            collection_name=request.collection_name,
            embedding_provider="openai",
            embedding_model="text-embedding-3-small",
            vector_size=1536,
        )

        result = service.ingest_document(
            file_path=request.file_path,
            category=request.category,
            source_type=request.source_type,
            recreate_collection=request.recreate_collection,
            max_chunks=request.max_chunks,
        )

        return result

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        logger.exception(f"Document ingestion failed: {error}")
        raise HTTPException(
            status_code=500,
            detail="Document ingestion failed",
        )
@router.post("/ask", response_model=DocumentAskResponse)
def ask_uploaded_documents(request: DocumentAskRequest):
    try:
        rag_service = get_document_rag_service()

        result = rag_service.answer_question(
            question=request.question,
            category=None,
        )

        return result

    except Exception as error:
        logger.exception(f"Document ask failed: {error}")
        raise HTTPException(
            status_code=500,
            detail="Document ask failed",
        )