"""
LangChain RAG service for Engineering Copilot AI.

This version keeps our validated retrieval pipeline:
- EmbeddingService
- QdrantService
- RerankerService

And uses LangChain for:
- PromptTemplate
- ChatOpenAI
- chain execution
"""

from typing import Dict, List, Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.core.logging import logger
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.reranker_service import RerankerService
from app.services.llm_reranker_service import LLMRerankerService
from app.services.query_transformation_service import QueryTransformationService
from app.services.query_routing_service import QueryRoutingService
import os
from langsmith import traceable

class LangChainRAGService:
    def __init__(
        self,
        collection_name: str,
        embedding_provider: str = "openai",
        embedding_model: str = "text-embedding-3-small",
        llm_model: Optional[str] = None,
        retrieval_top_k: int = 10,
        final_top_k: int = 5,
        reranker_type: str = "cross_encoder",
    ):
        self.collection_name = collection_name
        self.retrieval_top_k = retrieval_top_k
        self.final_top_k = final_top_k
        self.reranker_type = reranker_type

        self.llm_model = llm_model or getattr(
            settings,
            "OPENAI_CHAT_MODEL",
            "gpt-4o-mini",
        )

        self.embedding_service = EmbeddingService(
            provider=embedding_provider,
            model_name=embedding_model,
        )

        self.qdrant_service = QdrantService()

        if self.reranker_type == "cross_encoder":
            self.reranker_service = RerankerService()
        elif self.reranker_type == "llm":
            self.reranker_service = LLMRerankerService(
                model_name=self.llm_model,
            )
        elif self.reranker_type == "none":
            self.reranker_service = None
        else:
            raise ValueError(f"Unsupported reranker_type: {self.reranker_type}")

        self.llm = ChatOpenAI(
            model=self.llm_model,
            api_key=settings.OPENAI_API_KEY,
            temperature=0.2,
        )

        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
"""
You are Engineering Copilot AI, an assistant specialized in software engineering,
software architecture, clean code, cybersecurity, and documentation.

You must answer only using the provided context.
If the context is not enough, say that the documents do not contain enough information.

If the user asks a broad or general question, synthesize a general answer from the retrieved context instead of listing only isolated implementation details.

Always be clear, structured, and practical.
When possible, mention the source file and page.
""",
                ),
                (
                    "human",
                    """
Question:
{question}

Context:
{context}

Answer in French.
""",
                ),
            ]
        )

        self.chain = self.prompt | self.llm | StrOutputParser()
        self.query_transformation_service = QueryTransformationService(
            model_name=self.llm_model,
            api_key=settings.OPENAI_API_KEY,
        )
        self.query_routing_service = QueryRoutingService(
            model_name=self.llm_model,
            api_key=settings.OPENAI_API_KEY,
        )
        os.environ["LANGCHAIN_TRACING_V2"] = str(
            getattr(settings, "LANGCHAIN_TRACING_V2", "true")
        ).lower()

        os.environ["LANGCHAIN_PROJECT"] = str(
            getattr(settings, "LANGCHAIN_PROJECT", "engineering-copilot-rag")
        )
        if getattr(settings, "LANGCHAIN_API_KEY", None):
            os.environ["LANGCHAIN_API_KEY"] = str(settings.LANGCHAIN_API_KEY)
        logger.info(
            "LangChainRAGService initialized | "
            f"collection={collection_name} | "
            f"embedding={embedding_model} | "
            f"llm={self.llm_model} | "
            f"reranker_type={self.reranker_type}"
        )
    @traceable(name="Retrieve relevant chunks")
    def retrieve(
        self,
        question: str,
        category: Optional[str] = None,
        use_query_rewrite: Optional[bool] = None,
        use_query_expansion: Optional[bool] = None,
        use_hierarchical_retrieval: Optional[bool] = None,
        project_id: Optional[int] = None,
        repository_id: Optional[int] = None,
        document_id: Optional[int] = None,
        branch: Optional[str] = None,
        commit_sha: Optional[str] = None,
    ) -> List[Dict]:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")

        transformation = self.transform_query(
            question,
            use_query_rewrite=use_query_rewrite,
            use_query_expansion=use_query_expansion,
        )
        retrieved_chunks = self._retrieve_fused_chunks(
            search_queries=transformation["search_queries"],
            categories=self.route_categories(
                question=question,
                category=category,
                use_hierarchical_retrieval=use_hierarchical_retrieval,
            ),
            project_id=project_id,
            repository_id=repository_id,
            document_id=document_id,
            branch=branch,
            commit_sha=commit_sha,
        )

        if self.reranker_service is not None:
            return self.reranker_service.rerank(
                query=transformation["rewritten_question"],
                retrieved_chunks=retrieved_chunks,
                top_k=self.final_top_k,
            )

        return retrieved_chunks[: self.final_top_k]

    def transform_query(
        self,
        question: str,
        use_query_rewrite: Optional[bool] = None,
        use_query_expansion: Optional[bool] = None,
    ) -> Dict:
        """Build the retrieval queries, with safe fallback to the original question."""
        rewrite_enabled = (
            settings.QUERY_REWRITE_ENABLED
            if use_query_rewrite is None
            else use_query_rewrite
        )
        expansion_enabled = (
            settings.QUERY_EXPANSION_ENABLED
            if use_query_expansion is None
            else use_query_expansion
        )
        rewritten_question = (
            self.query_transformation_service.rewrite(question)
            if rewrite_enabled
            else question
        )
        expansions = (
            self.query_transformation_service.expand(
                rewritten_question,
                max_variants=settings.QUERY_EXPANSION_VARIANTS,
            )
            if expansion_enabled
            else []
        )

        search_queries = []
        for candidate in [question, rewritten_question, *expansions]:
            if candidate.casefold() not in {item.casefold() for item in search_queries}:
                search_queries.append(candidate)

        return {
            "rewritten_question": rewritten_question,
            "expanded_queries": expansions,
            "search_queries": search_queries,
            "query_rewrite_enabled": rewrite_enabled,
            "query_expansion_enabled": expansion_enabled,
        }

    def _retrieve_fused_chunks(
        self,
        search_queries: List[str],
        categories: List[str],
        project_id: Optional[int] = None,
        repository_id: Optional[int] = None,
        document_id: Optional[int] = None,
        branch: Optional[str] = None,
        commit_sha: Optional[str] = None,
    ) -> List[Dict]:
        """Fuse results from each query using reciprocal-rank fusion (RRF)."""
        fused = {}
        for query in search_queries:
            query_vector = self.embedding_service.embed_query(query)
            for category in categories or [None]:
                chunks = self.qdrant_service.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    top_k=self.retrieval_top_k,
                    category=category,
                    project_id=project_id,
                    repository_id=repository_id,
                    document_id=document_id,
                    branch=branch,
                    commit_sha=commit_sha,
                )
                for rank, chunk in enumerate(chunks, start=1):
                    chunk_key = chunk.get("chunk_id") or (
                        chunk.get("source"), chunk.get("page_number"), chunk.get("chunk_index")
                    )
                    if chunk_key not in fused:
                        fused[chunk_key] = {
                            **chunk,
                            "rrf_score": 0.0,
                            "matched_queries": [],
                        }
                    fused[chunk_key]["rrf_score"] += 1 / (settings.QUERY_RRF_K + rank)
                    fused[chunk_key]["matched_queries"].append(query)

        return sorted(
            fused.values(),
            key=lambda chunk: chunk["rrf_score"],
            reverse=True,
        )[: self.retrieval_top_k]

    def route_categories(
        self,
        question: str,
        category: Optional[str],
        use_hierarchical_retrieval: Optional[bool],
    ) -> List[str]:
        if category:
            return [category]
        enabled = (
            settings.HIERARCHICAL_RETRIEVAL_ENABLED
            if use_hierarchical_retrieval is None
            else use_hierarchical_retrieval
        )
        return self.query_routing_service.route(question) if enabled else []
    @traceable(name="Build RAG context")
    def build_context(self, chunks: List[Dict]) -> str:
        if not chunks:
            return ""

        context_parts = []

        for index, chunk in enumerate(chunks, start=1):
            source = chunk.get("source", "unknown source")
            page = chunk.get("page_number", "unknown page")
            text = chunk.get("text", "")

            context_parts.append(
                f"[Source {index}]\n"
                f"File: {source}\n"
                f"Page: {page}\n"
                f"Content:\n{text}"
            )

        return "\n\n---\n\n".join(context_parts)
    @traceable(name="Generate answer with LangChain")
    def generate_answer(
        self,
        question: str,
        context: str,
    ) -> str:
        if not context.strip():
            return (
                "Je n'ai pas trouvé assez d'informations dans les documents "
                "pour répondre correctement à cette question."
            )

        return self.chain.invoke(
            {
                "question": question,
                "context": context,
            }
        )
    @traceable(name="Answer question with RAG")
    def answer_question(
        self,
        question: str,
        category: Optional[str] = None,
        use_query_rewrite: Optional[bool] = None,
        use_query_expansion: Optional[bool] = None,
        use_hierarchical_retrieval: Optional[bool] = None,
        project_id: Optional[int] = None,
        repository_id: Optional[int] = None,
        document_id: Optional[int] = None,
        branch: Optional[str] = None,
        commit_sha: Optional[str] = None,
    ) -> Dict:
        transformation = self.transform_query(
            question,
            use_query_rewrite=use_query_rewrite,
            use_query_expansion=use_query_expansion,
        )
        retrieved_chunks = self._retrieve_fused_chunks(
            search_queries=transformation["search_queries"],
            categories=self.route_categories(
                question=question,
                category=category,
                use_hierarchical_retrieval=use_hierarchical_retrieval,
            ),
            project_id=project_id,
            repository_id=repository_id,
            document_id=document_id,
            branch=branch,
            commit_sha=commit_sha,
        )
        chunks = (
            self.reranker_service.rerank(
                query=transformation["rewritten_question"],
                retrieved_chunks=retrieved_chunks,
                top_k=self.final_top_k,
            )
            if self.reranker_service is not None
            else retrieved_chunks[: self.final_top_k]
        )

        context = self.build_context(chunks)

        answer = self.generate_answer(
            question=question,
            context=context,
        )

        return {
            "question": question,
            "answer": answer,
            "sources": [
                {
                    "source": chunk.get("source"),
                    "page_number": chunk.get("page_number"),
                    "score": chunk.get("score"),
                    "embedding_score": chunk.get("embedding_score"),
                    "rerank_score": chunk.get("rerank_score"),
                    "chunk_id": chunk.get("chunk_id"),
                }
                for chunk in chunks
            ],
            "chunks_used": len(chunks),
            "collection_name": self.collection_name,
            "retrieval_top_k": self.retrieval_top_k,
            "final_top_k": self.final_top_k,
            "reranker_type": self.reranker_type,
            "framework": "langchain",
            "rewritten_question": transformation["rewritten_question"],
            "expanded_queries": transformation["expanded_queries"],
            "query_rewrite_enabled": transformation["query_rewrite_enabled"],
            "query_expansion_enabled": transformation["query_expansion_enabled"],
        }
