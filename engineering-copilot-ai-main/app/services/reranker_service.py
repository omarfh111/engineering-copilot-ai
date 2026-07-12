"""
Reranker service for Engineering Copilot AI.

This service reranks retrieved chunks using a CrossEncoder model.

Validated baseline:
- cross-encoder/ms-marco-MiniLM-L-6-v2
- Input: Qdrant top 10 results
- Output: final top 5 chunks
"""

from typing import Dict, List

from sentence_transformers import CrossEncoder

from app.core.logging import logger


class RerankerService:
    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    ):
        self.model_name = model_name
        self._model = None

        logger.info(f"RerankerService initialized | model={model_name}")

    def _get_model(self) -> CrossEncoder:
        if self._model is None:
            logger.info(f"Loading reranker model: {self.model_name}")
            self._model = CrossEncoder(self.model_name)

        return self._model

    def rerank(
        self,
        query: str,
        retrieved_chunks: List[Dict],
        top_k: int = 5,
    ) -> List[Dict]:
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")

        if not retrieved_chunks:
            return []

        model = self._get_model()

        pairs = [
            [query, chunk.get("text", "")]
            for chunk in retrieved_chunks
        ]

        scores = model.predict(pairs)

        reranked_chunks = []

        for chunk, score in zip(retrieved_chunks, scores):
            new_chunk = dict(chunk)
            new_chunk["embedding_score"] = chunk.get("score")
            new_chunk["rerank_score"] = float(score)
            reranked_chunks.append(new_chunk)

        reranked_chunks.sort(
            key=lambda item: item["rerank_score"],
            reverse=True,
        )

        return reranked_chunks[:top_k]