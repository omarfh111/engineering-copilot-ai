"""
Embedding service for Engineering Copilot AI.

This service is responsible for converting text into vectors.

Validated baseline:
- Main model: OpenAI text-embedding-3-small
- Alternative local model: sentence-transformers/all-MiniLM-L6-v2
"""

from typing import List, Literal

from openai import OpenAI
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.core.logging import logger


EmbeddingProvider = Literal["openai", "sentence_transformers"]


class EmbeddingService:
    def __init__(
        self,
        provider: EmbeddingProvider = "openai",
        model_name: str = "text-embedding-3-small",
    ):
        self.provider = provider
        self.model_name = model_name
        self._client = None
        self._local_model = None

        logger.info(
            f"EmbeddingService initialized | provider={provider} | model={model_name}"
        )

    def _get_openai_client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)

        return self._client

    def _get_local_model(self) -> SentenceTransformer:
        if self._local_model is None:
            logger.info(f"Loading local embedding model: {self.model_name}")
            self._local_model = SentenceTransformer(self.model_name)

        return self._local_model

    def embed_query(self, query: str) -> List[float]:
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")

        if self.provider == "openai":
            return self._embed_openai([query])[0]

        if self.provider == "sentence_transformers":
            return self._embed_sentence_transformers([query])[0]

        raise ValueError(f"Unsupported embedding provider: {self.provider}")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            raise ValueError("Texts list cannot be empty")

        cleaned_texts = [text.strip() for text in texts if text and text.strip()]

        if not cleaned_texts:
            raise ValueError("Texts list contains only empty values")

        if self.provider == "openai":
            return self._embed_openai(cleaned_texts)

        if self.provider == "sentence_transformers":
            return self._embed_sentence_transformers(cleaned_texts)

        raise ValueError(f"Unsupported embedding provider: {self.provider}")

    def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        client = self._get_openai_client()

        response = client.embeddings.create(
            model=self.model_name,
            input=texts,
        )

        return [item.embedding for item in response.data]

    def _embed_sentence_transformers(self, texts: List[str]) -> List[List[float]]:
        model = self._get_local_model()

        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        return embeddings.tolist()

    def get_dimension(self) -> int:
        sample_embedding = self.embed_query("dimension test")
        return len(sample_embedding)