import json
from pathlib import Path

from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SAMPLE_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_sample_balanced.jsonl"
)

COLLECTION_NAME = "test_app_qdrant_service"
VECTOR_SIZE = 1536


def load_sample_chunks(limit=10):
    chunks = []

    with SAMPLE_FILE.open("r", encoding="utf-8") as file:
        for line in file:
            chunks.append(json.loads(line))

            if len(chunks) >= limit:
                break

    return chunks


def test_qdrant_service():
    chunks = load_sample_chunks(limit=10)
    texts = [chunk["text"] for chunk in chunks]

    embedding_service = EmbeddingService(
        provider="openai",
        model_name="text-embedding-3-small",
    )

    qdrant_service = QdrantService()

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

    query_vector = embedding_service.embed_query("What is clean architecture?")

    results = qdrant_service.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        top_k=5,
    )

    info = qdrant_service.get_collection_info(COLLECTION_NAME)

    print("=" * 60)
    print("Qdrant Service Test")
    print("=" * 60)
    print(info)
    print(f"Results count: {len(results)}")

    for index, result in enumerate(results, start=1):
        print("-" * 60)
        print(f"Result #{index}")
        print(f"Score: {result['score']}")
        print(f"Source: {result['source']}")
        print(f"Page: {result['page_number']}")
        print(f"Text preview: {result['text'][:300]}")

    print("=" * 60)

    assert info["points_count"] == 10
    assert len(results) > 0


if __name__ == "__main__":
    test_qdrant_service()