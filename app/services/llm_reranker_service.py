"""
LLM reranker service for Engineering Copilot AI.

This service uses an OpenAI chat model to rerank retrieved chunks.

Use case:
- Input: Qdrant top 10 results
- Model: gpt-4o-mini
- Output: final top 5 chunks selected by the LLM
"""

import json
from typing import Dict, List

from openai import OpenAI

from app.core.config import settings
from app.core.logging import logger


class LLMRerankerService:
    def __init__(
        self,
        model_name: str = "gpt-4o-mini",
    ):
        self.model_name = model_name
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

        logger.info(f"LLMRerankerService initialized | model={model_name}")

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

        candidates = []

        for index, chunk in enumerate(retrieved_chunks):
            text = chunk.get("text", "")

            candidates.append(
                {
                    "index": index,
                    "source": chunk.get("source"),
                    "page_number": chunk.get("page_number"),
                    "text": text[:1200],
                }
            )

        prompt = f"""
You are a reranking model for a RAG system.

Your task is to select the most relevant chunks for answering the user question.

User question:
{query}

Candidate chunks:
{json.dumps(candidates, ensure_ascii=False, indent=2)}

Return ONLY valid JSON using this exact format:
{{
  "selected_indexes": [0, 1, 2, 3, 4]
}}

Rules:
- Select at most {top_k} chunks.
- Use only indexes from the candidate chunks.
- Rank the indexes from most relevant to least relevant.
- Do not explain.
"""

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise reranking model for retrieval augmented generation.",
                },
                {
                    "role": "user",
                    "content": prompt.strip(),
                },
            ],
            temperature=0,
        )

        raw_output = response.choices[0].message.content

        try:
            parsed = json.loads(raw_output)
            selected_indexes = parsed.get("selected_indexes", [])
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from LLM reranker: {raw_output}")
            return retrieved_chunks[:top_k]

        reranked_chunks = []

        for rank, index in enumerate(selected_indexes, start=1):
            if not isinstance(index, int):
                continue

            if index < 0 or index >= len(retrieved_chunks):
                continue

            chunk = dict(retrieved_chunks[index])
            chunk["llm_rerank_rank"] = rank
            chunk["rerank_score"] = None
            chunk["embedding_score"] = chunk.get("score")
            reranked_chunks.append(chunk)

        if not reranked_chunks:
            return retrieved_chunks[:top_k]

        return reranked_chunks[:top_k]