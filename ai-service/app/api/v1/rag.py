"""
RAG API endpoints.

These endpoints expose the RAG pipeline to the frontend or Spring Boot backend.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.logging import logger
from app.services.langchain_rag_service import LangChainRAGService
from app.api.dependencies import get_langchain_rag_service
from app.api.security import require_internal_api_key

router = APIRouter(prefix="/rag", tags=["RAG"])


DEFAULT_COLLECTION_NAME = "exp_openai_text_embedding_3_small"

class RAGAskSimpleRequest(BaseModel):
    question: str = Field(..., min_length=3)
class RAGAskRequest(BaseModel):
    question: str = Field(..., min_length=3)
    collection_name: str = DEFAULT_COLLECTION_NAME
    category: Optional[str] = None
    reranker_type: str = "cross_encoder"

class RAGHealthResponse(BaseModel):
    status: str
    collection_name: str
    collection_exists: bool
    points_count: Optional[int] = None
class RAGSourceResponse(BaseModel):
    source: Optional[str] = None
    page_number: Optional[int] = None
    score: Optional[float] = None
    embedding_score: Optional[float] = None
    rerank_score: Optional[float] = None
    chunk_id: Optional[str] = None


class RAGAskResponse(BaseModel):
    question: str
    answer: str
    sources: List[RAGSourceResponse]
    chunks_used: int
    collection_name: str
    retrieval_top_k: int
    final_top_k: int
    reranker_type: str
    framework: str


class RAGRetrieveRequest(BaseModel):
    question: str = Field(..., min_length=3)
    collection_name: str = DEFAULT_COLLECTION_NAME
    category: Optional[str] = None
    reranker_type: str = "cross_encoder"


class RAGRetrieveResponse(BaseModel):
    question: str
    chunks: List[dict]
    chunks_used: int
    collection_name: str
    reranker_type: str


def build_rag_service(
    collection_name: str,
    reranker_type: str,
) -> LangChainRAGService:
    if reranker_type not in ["cross_encoder", "llm", "none"]:
        raise HTTPException(
            status_code=400,
            detail="reranker_type must be one of: cross_encoder, llm, none",
        )

    return get_langchain_rag_service(
        collection_name=collection_name,
        reranker_type=reranker_type,
    )


@router.post("/ask", response_model=RAGAskResponse, dependencies=[Depends(require_internal_api_key)])
def ask_rag(request: RAGAskRequest):
    try:
        rag_service = build_rag_service(
            collection_name=request.collection_name,
            reranker_type=request.reranker_type,
        )

        result = rag_service.answer_question(
            question=request.question,
            category=request.category,
        )

        return result

    except HTTPException:
        raise

    except Exception as error:
        logger.exception(f"RAG ask failed: {error}")
        raise HTTPException(
            status_code=500,
            detail="RAG ask failed",
        )


@router.post("/retrieve", response_model=RAGRetrieveResponse, dependencies=[Depends(require_internal_api_key)])
def retrieve_rag(request: RAGRetrieveRequest):
    try:
        rag_service = build_rag_service(
            collection_name=request.collection_name,
            reranker_type=request.reranker_type,
        )

        chunks = rag_service.retrieve(
            question=request.question,
            category=request.category,
        )

        return {
            "question": request.question,
            "chunks": chunks,
            "chunks_used": len(chunks),
            "collection_name": request.collection_name,
            "reranker_type": request.reranker_type,
        }

    except HTTPException:
        raise

    except Exception as error:
        logger.exception(f"RAG retrieve failed: {error}")
        raise HTTPException(
            status_code=500,
            detail="RAG retrieve failed",
        )
        
@router.get("/health", response_model=RAGHealthResponse, dependencies=[Depends(require_internal_api_key)])
def rag_health(collection_name: str = DEFAULT_COLLECTION_NAME):
    try:
        rag_service = build_rag_service(
            collection_name=collection_name,
            reranker_type="none",
        )

        collection_exists = rag_service.qdrant_service.collection_exists(
            collection_name
        )

        points_count = None

        if collection_exists:
            info = rag_service.qdrant_service.get_collection_info(
                collection_name
            )
            points_count = info.get("points_count")

        return {
            "status": "ok" if collection_exists else "collection_not_found",
            "collection_name": collection_name,
            "collection_exists": collection_exists,
            "points_count": points_count,
        }

    except Exception as error:
        logger.exception(f"RAG health check failed: {error}")
        raise HTTPException(
            status_code=500,
            detail="RAG health check failed",
        )
@router.post("/ask-simple", response_model=RAGAskResponse, dependencies=[Depends(require_internal_api_key)])
def ask_rag_simple(request: RAGAskSimpleRequest):
    try:
        rag_service = build_rag_service(
            collection_name=DEFAULT_COLLECTION_NAME,
            reranker_type="cross_encoder",
        )

        result = rag_service.answer_question(
            question=request.question,
            category=None,
        )

        return result

    except Exception as error:
        logger.exception(f"RAG ask-simple failed: {error}")
        raise HTTPException(
            status_code=500,
            detail="RAG ask-simple failed",
        )
