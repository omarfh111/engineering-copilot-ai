from app.services.embedding_service import EmbeddingService


def test_openai_embedding_service():
    service = EmbeddingService(
        provider="openai",
        model_name="text-embedding-3-small",
    )

    embedding = service.embed_query("What is clean architecture?")

    print("=" * 60)
    print("OpenAI Embedding Service Test")
    print("=" * 60)
    print(f"Embedding dimension: {len(embedding)}")
    print(f"First 5 values: {embedding[:5]}")
    print("=" * 60)

    assert isinstance(embedding, list)
    assert len(embedding) == 1536


def test_minilm_embedding_service():
    service = EmbeddingService(
        provider="sentence_transformers",
        model_name="sentence-transformers/all-MiniLM-L6-v2",
    )

    embedding = service.embed_query("What is clean architecture?")

    print("=" * 60)
    print("MiniLM Embedding Service Test")
    print("=" * 60)
    print(f"Embedding dimension: {len(embedding)}")
    print(f"First 5 values: {embedding[:5]}")
    print("=" * 60)

    assert isinstance(embedding, list)
    assert len(embedding) == 384


if __name__ == "__main__":
    test_openai_embedding_service()
    test_minilm_embedding_service()