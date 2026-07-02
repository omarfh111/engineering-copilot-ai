from pathlib import Path

from app.services.document_ingestion_service import DocumentIngestionService


PROJECT_ROOT = Path(__file__).resolve().parents[1]

TEST_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "raw"
    / "framework_docs"
    / "spring-boot-reference.pdf"
)

COLLECTION_NAME = "test_document_ingestion_service"


def test_document_ingestion_service():
    service = DocumentIngestionService(
        collection_name=COLLECTION_NAME,
        embedding_provider="openai",
        embedding_model="text-embedding-3-small",
        vector_size=1536,
    )

    result = service.ingest_document(
        file_path=str(TEST_FILE),
        category="framework_docs",
        source_type="enterprise_document",
        recreate_collection=True,
        max_chunks=20,
    )

    print("=" * 80)
    print("Document Ingestion Service Test")
    print("=" * 80)
    print(result)
    print("=" * 80)

    assert result["status"] == "success"
    assert result["chunks_indexed"] == 20
    assert result["collection_name"] == COLLECTION_NAME
    assert result["qdrant_info"]["points_count"] == 20


if __name__ == "__main__":
    test_document_ingestion_service()