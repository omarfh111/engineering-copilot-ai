"""
Test multiple embedding models on a balanced chunks sample.

Models tested:
- Ollama qwen3-embedding:8b
- OpenAI text-embedding-3-small
- sentence-transformers/all-MiniLM-L6-v2
- BAAI/bge-m3
- nomic-ai/nomic-embed-text-v1.5

Input:
    experiments/data/processed/chunks/chunks_sample_balanced.jsonl

Outputs:
    experiments/results/embedding_results.csv
    experiments/results/embedding_results.json
"""

import json
import time
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
import requests
from openai import OpenAI
from sentence_transformers import SentenceTransformer

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
CSV_OUTPUT_FILE = RESULTS_DIR / "embedding_results.csv"
JSON_OUTPUT_FILE = RESULTS_DIR / "embedding_results.json"


# For the first experiment, we do not need all 800 chunks.
# Start with 80 chunks to avoid long execution time.
MAX_CHUNKS_TO_TEST = 80
BATCH_SIZE = 8


LOCAL_MODELS = [
    {
        "provider": "sentence_transformers",
        "name": "sentence-transformers/all-MiniLM-L6-v2",
    },
    {
        "provider": "sentence_transformers",
        "name": "BAAI/bge-m3",
    },
    {
        "provider": "sentence_transformers",
        "name": "nomic-ai/nomic-embed-text-v1.5",
    },
]

OPENAI_MODELS = [
    {
        "provider": "openai",
        "name": "text-embedding-3-small",
    }
]

OLLAMA_MODELS = [
    {
        "provider": "ollama",
        "name": "qwen3-embedding:8b",
    }
]


def load_chunks(file_path: Path, limit: Optional[int] = None) -> List[Dict]:
    chunks = []

    with file_path.open("r", encoding="utf-8") as file:
        for line in file:
            chunks.append(json.loads(line))

            if limit and len(chunks) >= limit:
                break

    return chunks


def batch_texts(texts: List[str], batch_size: int) -> List[List[str]]:
    return [
        texts[index : index + batch_size]
        for index in range(0, len(texts), batch_size)
    ]


def test_sentence_transformer_model(model_name: str, texts: List[str]) -> Dict:
    logger.info(f"Testing sentence-transformers model: {model_name}")

    start_load = time.perf_counter()
    model = SentenceTransformer(model_name, trust_remote_code=True)
    load_time = time.perf_counter() - start_load

    start_embedding = time.perf_counter()
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    embedding_time = time.perf_counter() - start_embedding

    dimension = len(embeddings[0])

    return {
        "provider": "sentence_transformers",
        "model": model_name,
        "status": "success",
        "chunks_tested": len(texts),
        "dimension": dimension,
        "load_time_seconds": round(load_time, 3),
        "embedding_time_seconds": round(embedding_time, 3),
        "avg_time_per_chunk_seconds": round(embedding_time / len(texts), 4),
        "error": "",
    }


def test_openai_model(model_name: str, texts: List[str]) -> Dict:
    logger.info(f"Testing OpenAI embedding model: {model_name}")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    start_load = time.perf_counter()

    all_embeddings = []

    start_embedding = time.perf_counter()

    for batch in batch_texts(texts, BATCH_SIZE):
        response = client.embeddings.create(
            model=model_name,
            input=batch,
        )

        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    embedding_time = time.perf_counter() - start_embedding
    load_time = time.perf_counter() - start_load - embedding_time

    dimension = len(all_embeddings[0])

    return {
        "provider": "openai",
        "model": model_name,
        "status": "success",
        "chunks_tested": len(texts),
        "dimension": dimension,
        "load_time_seconds": round(load_time, 3),
        "embedding_time_seconds": round(embedding_time, 3),
        "avg_time_per_chunk_seconds": round(embedding_time / len(texts), 4),
        "error": "",
    }


def test_ollama_model(model_name: str, texts: List[str]) -> Dict:
    logger.info(f"Testing Ollama embedding model: {model_name}")

    ollama_url = "http://localhost:11434/api/embed"

    all_embeddings = []

    start_load = time.perf_counter()
    load_time = 0

    start_embedding = time.perf_counter()

    for batch in batch_texts(texts, BATCH_SIZE):
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

    embedding_time = time.perf_counter() - start_embedding

    dimension = len(all_embeddings[0])

    return {
        "provider": "ollama",
        "model": model_name,
        "status": "success",
        "chunks_tested": len(texts),
        "dimension": dimension,
        "load_time_seconds": round(load_time, 3),
        "embedding_time_seconds": round(embedding_time, 3),
        "avg_time_per_chunk_seconds": round(embedding_time / len(texts), 4),
        "error": "",
    }


def test_model(model_config: Dict, texts: List[str]) -> Dict:
    provider = model_config["provider"]
    model_name = model_config["name"]

    try:
        if provider == "sentence_transformers":
            return test_sentence_transformer_model(model_name, texts)

        if provider == "openai":
            return test_openai_model(model_name, texts)

        if provider == "ollama":
            return test_ollama_model(model_name, texts)

        raise ValueError(f"Unsupported provider: {provider}")

    except Exception as error:
        logger.error(f"Model failed: {model_name} | {error}")

        return {
            "provider": provider,
            "model": model_name,
            "status": "failed",
            "chunks_tested": len(texts),
            "dimension": None,
            "load_time_seconds": None,
            "embedding_time_seconds": None,
            "avg_time_per_chunk_seconds": None,
            "error": str(error),
        }


def save_results(results: List[Dict]) -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    dataframe = pd.DataFrame(results)
    dataframe.to_csv(CSV_OUTPUT_FILE, index=False, encoding="utf-8")

    with JSON_OUTPUT_FILE.open("w", encoding="utf-8") as file:
        json.dump(results, file, ensure_ascii=False, indent=2)


def print_report(results: List[Dict]) -> None:
    print("=" * 100)
    print("Embedding Models Test Report")
    print("=" * 100)

    for result in results:
        print(f"Provider: {result['provider']}")
        print(f"Model: {result['model']}")
        print(f"Status: {result['status']}")
        print(f"Chunks tested: {result['chunks_tested']}")
        print(f"Dimension: {result['dimension']}")
        print(f"Load time: {result['load_time_seconds']} seconds")
        print(f"Embedding time: {result['embedding_time_seconds']} seconds")
        print(f"Avg time/chunk: {result['avg_time_per_chunk_seconds']} seconds")

        if result["error"]:
            print(f"Error: {result['error']}")

        print("-" * 100)

    print(f"CSV saved to: {CSV_OUTPUT_FILE}")
    print(f"JSON saved to: {JSON_OUTPUT_FILE}")
    print("=" * 100)


def main() -> None:
    logger.info("Starting embedding models experiment")

    if not INPUT_FILE.exists():
        logger.error(f"Input file not found: {INPUT_FILE}")
        return

    chunks = load_chunks(INPUT_FILE, limit=MAX_CHUNKS_TO_TEST)
    texts = [chunk["text"] for chunk in chunks]

    logger.info(f"Chunks loaded for test: {len(texts)}")

    models_to_test = []
    models_to_test.extend(OLLAMA_MODELS)
    models_to_test.extend(OPENAI_MODELS)
    models_to_test.extend(LOCAL_MODELS)

    results = []

    for model_config in models_to_test:
        result = test_model(model_config, texts)
        results.append(result)

    save_results(results)
    print_report(results)

    logger.info("Embedding models experiment finished")


if __name__ == "__main__":
    main()