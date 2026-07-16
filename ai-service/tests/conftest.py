"""Pytest policy separating deterministic tests from live provider checks."""

import os
from pathlib import Path

import pytest


LIVE_PROVIDER_TEST_FILES = {
    "test_document_ingestion_service.py",
    "test_embedding_service.py",
    "test_langchain_rag_service.py",
    "test_langsmith.py",
    "test_llm_reranker_service.py",
    "test_qdrant_service.py",
    "test_rag_service.py",
    "test_reranker_service.py",
}


def pytest_collection_modifyitems(config, items):
    """Skip paid/networked checks unless the caller opted in explicitly."""
    if os.getenv("RUN_LIVE_INTEGRATION_TESTS") == "1":
        return
    skip_live = pytest.mark.skip(
        reason="Live provider test disabled; set RUN_LIVE_INTEGRATION_TESTS=1 to run it."
    )
    for item in items:
        if Path(str(item.fspath)).name in LIVE_PROVIDER_TEST_FILES:
            item.add_marker(skip_live)
