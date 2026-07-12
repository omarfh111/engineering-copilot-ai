import json
from pathlib import Path

from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.reranker_service import RerankerService


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SAMPLE_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_sample_balanced.jsonl"
)

COLLECTION_NAME = "test_app_reranker_service"
VECTOR_SIZE = 1536


def load_sample_chunks(limit=20):
    chunks = []

    with SAMPLE_FILE.open("r", encoding="utf-8") as file:
        for line in file:
            chunks.append(json.loads(line))

            if len(chunks) >= limit:
                break

    return chunks


def test_reranker_service():
    chunks = load_sample_chunks(limit=20)
    texts = [chunk["text"] for chunk in chunks]

    query = "What is clean architecture?"

    embedding_service = EmbeddingService(
        provider="openai",
        model_name="text-embedding-3-small",
    )

    qdrant_service = QdrantService()

    reranker_service = RerankerService()

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

    reranked_results = reranker_service.rerank(
        query=query,
        retrieved_chunks=retrieved_results,
        top_k=5,
    )

    print("=" * 60)
    print("Reranker Service Test")
    print("=" * 60)
    print(f"Retrieved results: {len(retrieved_results)}")
    print(f"Reranked results: {len(reranked_results)}")

    for index, result in enumerate(reranked_results, start=1):
        print("-" * 60)
        print(f"Result #{index}")
        print(f"Embedding score: {result.get('embedding_score')}")
        print(f"Rerank score: {result.get('rerank_score')}")
        print(f"Source: {result.get('source')}")
        print(f"Page: {result.get('page_number')}")
        print(f"Text preview: {result.get('text', '')[:300]}")

    print("=" * 60)

    assert len(retrieved_results) > 0
    assert len(reranked_results) > 0
    assert len(reranked_results) <= 5
    assert "rerank_score" in reranked_results[0]
    assert "embedding_score" in reranked_results[0]


if __name__ == "__main__":
    test_reranker_service()