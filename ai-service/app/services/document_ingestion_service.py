"""
Document ingestion service for Engineering Copilot AI.

This service performs the complete ingestion pipeline:

Document file
↓
Text extraction
↓
Chunking
↓
Embedding
↓
Qdrant indexing
"""

from typing import Dict, Optional

from app.core.logging import logger
from app.services.chunking_service import ChunkingService
from app.services.document_loader_service import DocumentLoaderService
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService


class DocumentIngestionService:
    def __init__(
        self,
        collection_name: str = "documents_openai_text_embedding_3_small",
        embedding_provider: str = "openai",
        embedding_model: str = "text-embedding-3-small",
        vector_size: int = 1536,
    ):
        self.collection_name = collection_name
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self.vector_size = vector_size

        self.document_loader = DocumentLoaderService()
        self.chunking_service = ChunkingService()
        self.embedding_service = EmbeddingService(
            provider=embedding_provider,
            model_name=embedding_model,
        )
        self.qdrant_service = QdrantService()

        logger.info(
            "DocumentIngestionService initialized | "
            f"collection={collection_name} | "
            f"embedding={embedding_model}"
        )

    def ingest_document(
        self,
        file_path: str,
        category: str = "uploaded_documents",
        source_type: str = "uploaded_document",
        recreate_collection: bool = False,
        batch_size: int = 32,
        max_chunks: Optional[int] = None,
        project_id: Optional[int] = None,
        document_id: Optional[int] = None,
    ) -> Dict:
        logger.info(f"Starting document ingestion | file={file_path}")

        document = self.document_loader.load_document(file_path)

        chunks = self.chunking_service.chunk_document(
            document=document,
            category=category,
            source_type=source_type,
            scope_metadata={
                "project_id": project_id,
                "document_id": document_id,
            },
        )

        if max_chunks is not None:
            chunks = chunks[:max_chunks]

        if not chunks:
            raise ValueError("No chunks generated from document")

        texts = [chunk["text"] for chunk in chunks]

        if recreate_collection:
            self.qdrant_service.recreate_collection(
                collection_name=self.collection_name,
                vector_size=self.vector_size,
            )
        else:
            self.qdrant_service.create_collection(
                collection_name=self.collection_name,
                vector_size=self.vector_size,
            )

        embeddings = self.embedding_service.embed_documents(texts)

        self.qdrant_service.upsert_chunks(
            collection_name=self.collection_name,
            chunks=chunks,
            embeddings=embeddings,
            batch_size=batch_size,
        )

        info = self.qdrant_service.get_collection_info(
            collection_name=self.collection_name
        )

        result = {
            "status": "success",
            "filename": document["filename"],
            "extension": document["extension"],
            "page_count": document["page_count"],
            "chunks_indexed": len(chunks),
            "collection_name": self.collection_name,
            "embedding_model": self.embedding_model,
            "qdrant_info": info,
        }

        logger.info(f"Document ingestion completed | result={result}")

        return result
