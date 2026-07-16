"""
Qdrant service for Engineering Copilot AI.

This service manages:
- collection creation
- collection recreation
- chunk indexing
- semantic search
"""

import uuid
from typing import Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

from app.core.config import settings
from app.core.logging import logger


class QdrantService:
    def __init__(self):
        self.client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
            timeout=300,
        )
        self._payload_index_fields = set()

        logger.info("QdrantService initialized")

    def collection_exists(self, collection_name: str) -> bool:
        collections = self.client.get_collections().collections
        collection_names = [collection.name for collection in collections]

        return collection_name in collection_names

    def create_collection(
        self,
        collection_name: str,
        vector_size: int,
        distance: Distance = Distance.COSINE,
    ) -> None:
        if self.collection_exists(collection_name):
            logger.info(f"Collection already exists: {collection_name}")
            return

        self.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=distance,
            ),
        )

        logger.info(
            f"Collection created: {collection_name} | vector_size={vector_size}"
        )

    def recreate_collection(
        self,
        collection_name: str,
        vector_size: int,
        distance: Distance = Distance.COSINE,
    ) -> None:
        if self.collection_exists(collection_name):
            logger.warning(f"Deleting collection: {collection_name}")
            self.client.delete_collection(collection_name=collection_name)

        self.create_collection(
            collection_name=collection_name,
            vector_size=vector_size,
            distance=distance,
        )

    def build_point(
        self,
        collection_name: str,
        chunk: Dict,
        embedding: List[float],
    ) -> PointStruct:
        chunk_id = chunk.get("chunk_id")

        point_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_DNS,
                "_".join(
                    str(value)
                    for value in (
                        collection_name,
                        chunk.get("project_id"),
                        chunk.get("repository_id"),
                        chunk.get("document_id"),
                        chunk_id,
                    )
                ),
            )
        )

        payload = {
            "chunk_id": chunk.get("chunk_id"),
            "source_type": chunk.get("source_type"),
            "category": chunk.get("category"),
            "source": chunk.get("source"),
            "filename": chunk.get("filename"),
            "file_path": chunk.get("file_path"),
            "extension": chunk.get("extension"),
            "page_number": chunk.get("page_number"),
            "chunk_index": chunk.get("chunk_index"),
            "project_id": chunk.get("project_id"),
            "repository_id": chunk.get("repository_id"),
            "document_id": chunk.get("document_id"),
            "branch": chunk.get("branch"),
            "commit_sha": chunk.get("commit_sha"),
            "text": chunk.get("text"),
            "metadata": chunk.get("metadata", {}),
        }
        payload = {key: value for key, value in payload.items() if value is not None}

        return PointStruct(
            id=point_id,
            vector=embedding,
            payload=payload,
        )

    def upsert_chunks(
        self,
        collection_name: str,
        chunks: List[Dict],
        embeddings: List[List[float]],
        batch_size: int = 64,
    ) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings must have the same length")

        points = [
            self.build_point(
                collection_name=collection_name,
                chunk=chunk,
                embedding=embedding,
            )
            for chunk, embedding in zip(chunks, embeddings)
        ]

        for start in range(0, len(points), batch_size):
            batch = points[start : start + batch_size]

            self.client.upsert(
                collection_name=collection_name,
                points=batch,
            )

        logger.info(
            f"Upsert completed | collection={collection_name} | points={len(points)}"
        )

    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 10,
        category: Optional[str] = None,
        project_id: Optional[int] = None,
        repository_id: Optional[int] = None,
        document_id: Optional[int] = None,
        branch: Optional[str] = None,
        commit_sha: Optional[str] = None,
    ) -> List[Dict]:
        query_filter = None
        filter_values = {
            "category": (category, PayloadSchemaType.KEYWORD),
            "project_id": (project_id, PayloadSchemaType.INTEGER),
            "repository_id": (repository_id, PayloadSchemaType.INTEGER),
            "document_id": (document_id, PayloadSchemaType.INTEGER),
            "branch": (branch, PayloadSchemaType.KEYWORD),
            "commit_sha": (commit_sha, PayloadSchemaType.KEYWORD),
        }
        must = []
        for field_name, (value, schema) in filter_values.items():
            if value is None:
                continue
            self._ensure_payload_index(collection_name, field_name, schema)
            must.append(FieldCondition(key=field_name, match=MatchValue(value=value)))
        if must:
            query_filter = Filter(must=must)
        response = self.client.query_points(
            collection_name=collection_name,
            query=query_vector,
            limit=top_k,
            with_payload=True,
            query_filter=query_filter,
        )

        results = []

        for point in response.points:
            payload = point.payload or {}

            results.append(
                {
                    "score": point.score,
                    "chunk_id": payload.get("chunk_id"),
                    "category": payload.get("category"),
                    "source": payload.get("source"),
                    "filename": payload.get("filename"),
                    "page_number": payload.get("page_number"),
                    "chunk_index": payload.get("chunk_index"),
                    "project_id": payload.get("project_id"),
                    "repository_id": payload.get("repository_id"),
                    "document_id": payload.get("document_id"),
                    "branch": payload.get("branch"),
                    "commit_sha": payload.get("commit_sha"),
                    "text": payload.get("text"),
                    "metadata": payload.get("metadata", {}),
                }
            )

        return results

    def _ensure_category_index(self, collection_name: str) -> None:
        """Create the Qdrant keyword index needed by hierarchical retrieval once."""
        self._ensure_payload_index(
            collection_name,
            "category",
            PayloadSchemaType.KEYWORD,
        )

    def _ensure_payload_index(
        self,
        collection_name: str,
        field_name: str,
        field_schema: PayloadSchemaType,
    ) -> None:
        index_key = (collection_name, field_name)
        if index_key in self._payload_index_fields:
            return
        self.client.create_payload_index(
            collection_name=collection_name,
            field_name=field_name,
            field_schema=field_schema,
            wait=True,
        )
        self._payload_index_fields.add(index_key)
        logger.info(
            "Qdrant payload index ready | collection=%s | field=%s",
            collection_name,
            field_name,
        )

    def get_collection_info(self, collection_name: str) -> Dict:
        info = self.client.get_collection(collection_name=collection_name)

        return {
            "collection_name": collection_name,
            "points_count": info.points_count,
            "status": str(info.status),
        }
