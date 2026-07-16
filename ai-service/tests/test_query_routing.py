from app.services.langchain_rag_service import LangChainRAGService


def test_route_categories_uses_explicit_category_without_llm():
    service = LangChainRAGService.__new__(LangChainRAGService)

    assert service.route_categories(
        question="Anything",
        category="security",
        use_hierarchical_retrieval=True,
    ) == ["security"]
