from pathlib import Path

from app.services.chunking_service import ChunkingService
from app.services.document_loader_service import DocumentLoaderService


PROJECT_ROOT = Path(__file__).resolve().parents[1]

TEST_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "raw"
    / "framework_docs"
    / "spring-boot-reference.pdf"
)


def test_chunking_service():
    loader = DocumentLoaderService()
    chunker = ChunkingService()

    document = loader.load_document(str(TEST_FILE))

    chunks = chunker.chunk_document(
        document=document,
        category="framework_docs",
        source_type="enterprise_document",
    )

    print("=" * 80)
    print("Chunking Service Test")
    print("=" * 80)
    print(f"Filename: {document['filename']}")
    print(f"Pages: {document['page_count']}")
    print(f"Chunks created: {len(chunks)}")
    print("-" * 80)

    first_chunk = chunks[0]

    print(f"Chunk ID: {first_chunk['chunk_id']}")
    print(f"Source: {first_chunk['source']}")
    print(f"Page: {first_chunk['page_number']}")
    print(f"Category: {first_chunk['category']}")
    print(f"Text preview: {first_chunk['text'][:1000]}")
    print("=" * 80)

    assert len(chunks) > 0
    assert first_chunk["chunk_id"]
    assert first_chunk["source"] == "framework_docs/spring-boot-reference.pdf"
    assert first_chunk["page_number"] >= 1
    assert first_chunk["text"]


def test_split_text_keeps_configured_overlap():
    chunker = ChunkingService(chunk_size=10, chunk_overlap=3)
    chunks = chunker.split_text("abcdefghijklmnopqrstuvwxyz")

    assert len(chunks) >= 2
    assert chunks[0][-3:] == chunks[1][:3]


if __name__ == "__main__":
    test_chunking_service()
