from app.services.qdrant_service import QdrantService


def test_category_index_is_created_once_per_collection():
    service = QdrantService.__new__(QdrantService)
    service._payload_index_fields = set()

    class Client:
        def __init__(self):
            self.calls = []

        def create_payload_index(self, **kwargs):
            self.calls.append(kwargs)

    service.client = Client()

    service._ensure_category_index("documents")
    service._ensure_category_index("documents")

    assert len(service.client.calls) == 1
    assert service.client.calls[0]["field_name"] == "category"


def test_project_scope_is_sent_as_a_qdrant_filter():
    service = QdrantService.__new__(QdrantService)
    service._payload_index_fields = set()

    class Response:
        points = []

    class Client:
        def __init__(self):
            self.index_calls = []
            self.query_kwargs = None

        def create_payload_index(self, **kwargs):
            self.index_calls.append(kwargs)

        def query_points(self, **kwargs):
            self.query_kwargs = kwargs
            return Response()

    service.client = Client()

    assert service.search(
        collection_name="documents",
        query_vector=[0.1, 0.2],
        project_id=42,
        document_id=9,
    ) == []

    conditions = service.client.query_kwargs["query_filter"].must
    assert {condition.key for condition in conditions} == {"project_id", "document_id"}
    assert {call["field_name"] for call in service.client.index_calls} == {"project_id", "document_id"}
