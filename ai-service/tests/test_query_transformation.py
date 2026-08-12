from app.services.langchain_rag_service import LangChainRAGService


def test_transform_query_keeps_baseline_when_disabled():
    service = LangChainRAGService.__new__(LangChainRAGService)
    result = service.transform_query(
        "How is JWT validated?",
        use_query_rewrite=False,
        use_query_expansion=False,
    )

    assert result["rewritten_question"] == "How is JWT validated?"
    assert result["expanded_queries"] == []
    assert result["search_queries"] == ["How is JWT validated?"]


def test_rrf_fuses_duplicate_chunks_across_queries():
    service = LangChainRAGService.__new__(LangChainRAGService)
    service.collection_name = "test-collection"
    service.retrieval_top_k = 3

    class Embeddings:
        def embed_query(self, query):
            return [float(len(query))]

    class Qdrant:
        def search(self, **kwargs):
            if kwargs["query_vector"] == [5.0]:
                return [{"chunk_id": "a", "score": 0.9}, {"chunk_id": "b", "score": 0.8}]
            return [{"chunk_id": "a", "score": 0.7}, {"chunk_id": "c", "score": 0.6}]

    service.embedding_service = Embeddings()
    service.qdrant_service = Qdrant()

    chunks = service._retrieve_fused_chunks(["first", "second"], categories=[])

    assert chunks[0]["chunk_id"] == "a"
    assert chunks[0]["matched_queries"] == ["first", "second"]
