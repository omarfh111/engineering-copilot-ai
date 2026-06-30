"""
API dependencies for reusable services.

This avoids recreating heavy services on every request.
"""

from functools import lru_cache

from app.services.langchain_rag_service import LangChainRAGService


@lru_cache(maxsize=10)
def get_langchain_rag_service(
    collection_name: str,
    reranker_type: str,
) -> LangChainRAGService:
    return LangChainRAGService(
        collection_name=collection_name,
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        retrieval_top_k=10,
        final_top_k=5,
        reranker_type=reranker_type,
    )