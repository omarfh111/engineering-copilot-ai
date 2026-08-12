import json
from pathlib import Path

from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.rag_service import RAGService


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SAMPLE_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_sample_balanced.jsonl"
)

COLLECTION_NAME = "test_app_rag_service"
VECTOR_SIZE = 1536


def load_sample_chunks(limit=30):
    chunks = []

    with SAMPLE_FILE.open("r", encoding="utf-8") as file:
        for line in file:
            chunks.append(json.loads(line))

            if len(chunks) >= limit:
                break

    return chunks


def prepare_test_collection():
    chunks = load_sample_chunks(limit=30)
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


def test_rag_service():
    prepare_test_collection()

    rag_service = RAGService(
        collection_name=COLLECTION_NAME,
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        retrieval_top_k=10,
        final_top_k=5,
        use_reranker=True,
    )

    result = rag_service.answer_question(
        question="What is clean architecture?",
    )

    print("=" * 80)
    print("RAG Service Test")
    print("=" * 80)
    print("Question:")
    print(result["question"])
    print("-" * 80)
    print("Answer:")
    print(result["answer"])
    print("-" * 80)
    print("Sources:")

    for source in result["sources"]:
        print(source)

    print("=" * 80)

    assert result["answer"]
    assert result["chunks_used"] > 0
    assert len(result["sources"]) > 0


if __name__ == "__main__":
    test_rag_service()