import json
from pathlib import Path

from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.llm_reranker_service import LLMRerankerService


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SAMPLE_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_sample_balanced.jsonl"
)

COLLECTION_NAME = "test_app_llm_reranker_service"
VECTOR_SIZE = 1536


def load_sample_chunks(limit=30):
    chunks = []

    with SAMPLE_FILE.open("r", encoding="utf-8") as file:
        for line in file:
            chunks.append(json.loads(line))

            if len(chunks) >= limit:
                break

    return chunks


def test_llm_reranker_service():
    chunks = load_sample_chunks(limit=30)
    texts = [chunk["text"] for chunk in chunks]

    query = "What is clean architecture?"

    embedding_service = EmbeddingService(
        provider="openai",
        model_name="text-embedding-3-small",
    )

    qdrant_service = QdrantService()

    llm_reranker_service = LLMRerankerService(
        model_name="gpt-4o-mini",
    )

    qdrant_service.recreate_collection(
        collection_name=COLLECTION_NAME,
        vector_size=VECTOR_SIZE,
    )

    embeddings = embedding_service.embed_documents(texts)

    qdrant_service.upsert_chunks(
        collection_name=COLLECTION_NAME,
        chunks=chunks,
        embeddings=embeddings,
    )

    query_vector = embedding_service.embed_query(query)

    retrieved_results = qdrant_service.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        top_k=10,
    )

    reranked_results = llm_reranker_service.rerank(
        query=query,
        retrieved_chunks=retrieved_results,
        top_k=5,
    )

    print("=" * 80)
    print("LLM Reranker Service Test")
    print("=" * 80)
    print(f"Retrieved results: {len(retrieved_results)}")
    print(f"Reranked results: {len(reranked_results)}")

    for index, result in enumerate(reranked_results, start=1):
        print("-" * 80)
        print(f"Result #{index}")
        print(f"Embedding score: {result.get('embedding_score')}")
        print(f"LLM rank: {result.get('llm_rerank_rank')}")
        print(f"Source: {result.get('source')}")
        print(f"Page: {result.get('page_number')}")
        print(f"Text preview: {result.get('text', '')[:300]}")

    print("=" * 80)

    assert len(retrieved_results) > 0
    assert len(reranked_results) > 0
    assert len(reranked_results) <= 5
    assert "llm_rerank_rank" in reranked_results[0]


if __name__ == "__main__":
    test_llm_reranker_service()