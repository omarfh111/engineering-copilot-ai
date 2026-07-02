from pathlib import Path

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


def test_document_loader_service():
    loader = DocumentLoaderService()

    result = loader.load_document(str(TEST_FILE))

    print("=" * 80)
    print("Document Loader Service Test")
    print("=" * 80)
    print(f"Filename: {result['filename']}")
    print(f"Extension: {result['extension']}")
    print(f"Page count: {result['page_count']}")
    print(f"Total characters: {result['total_characters']}")
    print("-" * 80)

    first_page = result["pages"][0]

    print(f"First extracted page: {first_page['page_number']}")
    print(first_page["text"][:1000])
    print("=" * 80)

    assert result["filename"]
    assert result["page_count"] > 0
    assert result["total_characters"] > 0
    assert len(result["pages"]) > 0


if __name__ == "__main__":
    test_document_loader_service()