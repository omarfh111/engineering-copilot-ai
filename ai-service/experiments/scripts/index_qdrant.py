"""
Index balanced chunks into Qdrant using multiple embedding models.

Input:
    experiments/data/processed/chunks/chunks_sample_balanced.jsonl

Collections created:
    exp_qwen3_embedding_8b
    exp_openai_text_embedding_3_small
    exp_minilm_l6_v2
    exp_bge_m3
    exp_nomic_embed_text_v15
"""

import json
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional

import requests
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from app.core.config import settings
from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "processed"
    / "chunks"
    / "chunks_sample_balanced.jsonl"
)

RESULTS_DIR = PROJECT_ROOT / "experiments" / "results"
RESULTS_FILE = RESULTS_DIR / "qdrant_indexing_results.json"

BATCH_SIZE = 8

# Mets 200 pour tester rapidement.
# Après validation, mets None pour indexer les 800 chunks.
MAX_CHUNKS_TO_INDEX: Optional[int] = None


MODELS_TO_INDEX = [
    #{
    #    "provider": "ollama",
    #    "name": "qwen3-embedding:8b",
    #    "collection": "exp_qwen3_embedding_8b",
    #    "dimension": 4096,
    #    "document_prefix": "",
    #},
    {
        "provider": "openai",
        "name": "text-embedding-3-small",
        "collection": "exp_openai_text_embedding_3_small",
        "dimension": 1536,
        "document_prefix": "",
    },
    {
        "provider": "sentence_transformers",
        "name": "sentence-transformers/all-MiniLM-L6-v2",
        "collection": "exp_minilm_l6_v2",
        "dimension": 384,
        "document_prefix": "",
    },
    #{
    #    "provider": "sentence_transformers",
    #    "name": "BAAI/bge-m3",
    #    "collection": "exp_bge_m3",
    #    "dimension": 1024,
    #    "document_prefix": "",
    #},
    #{
    #    "provider": "sentence_transformers",
    #    "name": "nomic-ai/nomic-embed-text-v1.5",
    #    "collection": "exp_nomic_embed_text_v15",
    #    "dimension": 768,
    #    "document_prefix": "search_document: ",
    #},
]


def load_chunks(file_path: Path, limit: Optional[int] = None) -> List[Dict]:
    chunks = []

    with file_path.open("r", encoding="utf-8") as file:
        for line in file:
            chunks.append(json.loads(line))

            if limit and len(chunks) >= limit:
                break

    return chunks


def batch_items(items: List, batch_size: int) -> List[List]:
    return [
        items[index : index + batch_size]
        for index in range(0, len(items), batch_size)
    ]


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
        timeout=300,
    )


def recreate_collection(
    client: QdrantClient,
    collection_name: str,
    vector_size: int,
) -> None:
    existing_collections = client.get_collections().collections
    existing_names = [collection.name for collection in existing_collections]

    if collection_name in existing_names:
        logger.warning(f"Deleting existing collection: {collection_name}")
        client.delete_collection(collection_name=collection_name)

    logger.info(f"Creating collection: {collection_name} | dimension={vector_size}")

    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=vector_size,
            distance=Distance.COSINE,
        ),
    )


def embed_with_sentence_transformers(
    model_name: str,
    texts: List[str],
) -> List[List[float]]:
    model = SentenceTransformer(model_name, trust_remote_code=True)

    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    return embeddings.tolist()


def embed_with_openai(
    model_name: str,
    texts: List[str],
) -> List[List[float]]:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    all_embeddings = []

    for batch in tqdm(batch_items(texts, BATCH_SIZE), desc=f"OpenAI {model_name}"):
        response = client.embeddings.create(
            model=model_name,
            input=batch,
        )

        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def embed_with_ollama(
    model_name: str,
    texts: List[str],
) -> List[List[float]]:
    ollama_url = "http://localhost:11434/api/embed"

    all_embeddings = []

    for batch in tqdm(batch_items(texts, BATCH_SIZE), desc=f"Ollama {model_name}"):
        response = requests.post(
            ollama_url,
            json={
                "model": model_name,
                "input": batch,
            },
            timeout=300,
        )

        response.raise_for_status()

        data = response.json()

        if "embeddings" not in data:
            raise ValueError(f"Ollama response does not contain embeddings: {data}")

        all_embeddings.extend(data["embeddings"])

    return all_embeddings


def embed_texts(model_config: Dict, texts: List[str]) -> List[List[float]]:
    provider = model_config["provider"]
    model_name = model_config["name"]
    prefix = model_config.get("document_prefix", "")

    prepared_texts = [prefix + text for text in texts]

    if provider == "sentence_transformers":
        return embed_with_sentence_transformers(model_name, prepared_texts)

    if provider == "openai":
        return embed_with_openai(model_name, prepared_texts)

    if provider == "ollama":
        return embed_with_ollama(model_name, prepared_texts)

    raise ValueError(f"Unsupported provider: {provider}")


def build_points(
    chunks: List[Dict],
    embeddings: List[List[float]],
    model_config: Dict,
) -> List[PointStruct]:
    points = []

    for chunk, embedding in zip(chunks, embeddings):
        point_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_DNS,
                f"{model_config['collection']}_{chunk['chunk_id']}",
            )
        )

        payload = {
            "chunk_id": chunk["chunk_id"],
            "source_type": chunk["source_type"],
            "category": chunk["category"],
            "source": chunk.get("source"),
            "filename": chunk["filename"],
            "file_path": chunk["file_path"],
            "extension": chunk["extension"],
            "page_number": chunk.get("page_number"),
            "chunk_index": chunk["chunk_index"],
            "text": chunk["text"],
            "embedding_model": model_config["name"],
            "embedding_provider": model_config["provider"],
        }

        points.append(
            PointStruct(
                id=point_id,
                vector=embedding,
                payload=payload,
            )
        )

    return points


def upsert_points(
    client: QdrantClient,
    collection_name: str,
    points: List[PointStruct],
) -> None:
    for batch in tqdm(batch_items(points, 64), desc=f"Upserting {collection_name}"):
        client.upsert(
            collection_name=collection_name,
            points=batch,
        )


def index_model(
    client: QdrantClient,
    chunks: List[Dict],
    model_config: Dict,
) -> Dict:
    collection_name = model_config["collection"]
    dimension = model_config["dimension"]

    logger.info(f"Indexing model: {model_config['name']}")
    logger.info(f"Collection: {collection_name}")

    start_time = time.perf_counter()

    recreate_collection(
        client=client,
        collection_name=collection_name,
        vector_size=dimension,
    )

    texts = [chunk["text"] for chunk in chunks]

    embeddings = embed_texts(model_config, texts)

    if len(embeddings[0]) != dimension:
        raise ValueError(
            f"Dimension mismatch for {model_config['name']}. "
            f"Expected {dimension}, got {len(embeddings[0])}"
        )

    points = build_points(
        chunks=chunks,
        embeddings=embeddings,
        model_config=model_config,
    )

    upsert_points(
        client=client,
        collection_name=collection_name,
        points=points,
    )

    total_time = time.perf_counter() - start_time

    collection_info = client.get_collection(collection_name=collection_name)

    return {
        "provider": model_config["provider"],
        "model": model_config["name"],
        "collection": collection_name,
        "dimension": dimension,
        "chunks_indexed": len(chunks),
        "points_count": collection_info.points_count,
        "total_time_seconds": round(total_time, 3),
        "avg_time_per_chunk_seconds": round(total_time / len(chunks), 4),
        "status": "success",
        "error": "",
    }


def save_results(results: List[Dict]) -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    with RESULTS_FILE.open("w", encoding="utf-8") as file:
        json.dump(results, file, ensure_ascii=False, indent=2)


def print_report(results: List[Dict]) -> None:
    print("=" * 100)
    print("Qdrant Indexing Report")
    print("=" * 100)

    for result in results:
        print(f"Model: {result['model']}")
        print(f"Collection: {result['collection']}")
        print(f"Dimension: {result['dimension']}")
        print(f"Chunks indexed: {result['chunks_indexed']}")
        print(f"Points count: {result['points_count']}")
        print(f"Status: {result['status']}")
        print(f"Total time: {result['total_time_seconds']} seconds")
        print(f"Avg time/chunk: {result['avg_time_per_chunk_seconds']} seconds")

        if result["error"]:
            print(f"Error: {result['error']}")

        print("-" * 100)

    print(f"Results saved to: {RESULTS_FILE}")
    print("=" * 100)


def main() -> None:
    logger.info("Starting Qdrant indexing experiment")

    if not INPUT_FILE.exists():
        logger.error(f"Input file not found: {INPUT_FILE}")
        return

    chunks = load_chunks(INPUT_FILE, limit=MAX_CHUNKS_TO_INDEX)

    logger.info(f"Chunks loaded: {len(chunks)}")

    client = get_qdrant_client()

    results = []

    for model_config in MODELS_TO_INDEX:
        try:
            result = index_model(
                client=client,
                chunks=chunks,
                model_config=model_config,
            )
            results.append(result)

        except Exception as error:
            logger.error(f"Indexing failed for {model_config['name']}: {error}")

            results.append(
                {
                    "provider": model_config["provider"],
                    "model": model_config["name"],
                    "collection": model_config["collection"],
                    "dimension": model_config["dimension"],
                    "chunks_indexed": len(chunks),
                    "points_count": 0,
                    "total_time_seconds": None,
                    "avg_time_per_chunk_seconds": None,
                    "status": "failed",
                    "error": str(error),
                }
            )

    save_results(results)
    print_report(results)

    logger.info("Qdrant indexing experiment finished")


if __name__ == "__main__":
    main()