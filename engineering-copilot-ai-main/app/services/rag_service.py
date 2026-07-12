"""
RAG service for Engineering Copilot AI.

This service performs the complete RAG pipeline:

User question
↓
Embedding
↓
Qdrant retrieval
↓
Reranking
↓
Context building
↓
LLM answer generation
"""

from typing import Dict, List, Optional

from openai import OpenAI

from app.core.config import settings
from app.core.logging import logger
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.reranker_service import RerankerService


class RAGService:
    def __init__(
        self,
        collection_name: str,
        embedding_provider: str = "openai",
        embedding_model: str = "text-embedding-3-small",
        llm_model: Optional[str] = None,
        retrieval_top_k: int = 10,
        final_top_k: int = 5,
        use_reranker: bool = True,
    ):
        self.collection_name = collection_name
        self.retrieval_top_k = retrieval_top_k
        self.final_top_k = final_top_k
        self.use_reranker = use_reranker

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

        self.reranker_service = RerankerService() if use_reranker else None

        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

        logger.info(
            "RAGService initialized | "
            f"collection={collection_name} | "
            f"embedding={embedding_model} | "
            f"llm={self.llm_model} | "
            f"reranker={use_reranker}"
        )

    def retrieve(
        self,
        question: str,
        category: Optional[str] = None,
    ) -> List[Dict]:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")

        query_vector = self.embedding_service.embed_query(question)

        retrieved_chunks = self.qdrant_service.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            top_k=self.retrieval_top_k,
            category=category,
        )

        if self.use_reranker and self.reranker_service is not None:
            return self.reranker_service.rerank(
                query=question,
                retrieved_chunks=retrieved_chunks,
                top_k=self.final_top_k,
            )

        return retrieved_chunks[: self.final_top_k]

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

        system_prompt = """
You are Engineering Copilot AI, an assistant specialized in software engineering,
software architecture, clean code, cybersecurity, and documentation.

You must answer only using the provided context.
If the context is not enough, say that the documents do not contain enough information.
Always be clear, structured, and practical.
When possible, mention the source file and page.
"""

        user_prompt = f"""
Question:
{question}

Context:
{context}

Answer in French.
"""

        response = self.openai_client.chat.completions.create(
            model=self.llm_model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                },
                {
                    "role": "user",
                    "content": user_prompt.strip(),
                },
            ],
            temperature=0.2,
        )

        return response.choices[0].message.content

    def answer_question(
        self,
        question: str,
        category: Optional[str] = None,
    ) -> Dict:
        chunks = self.retrieve(
            question=question,
            category=category,
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
            "use_reranker": self.use_reranker,
        }