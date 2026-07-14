"""
Test retrieval quality from Qdrant collections.

This script sends test questions to each embedding collection and compares
the retrieved chunks.

Collections tested:
- exp_qwen3_embedding_8b
- exp_openai_text_embedding_3_small
- exp_minilm_l6_v2
- exp_bge_m3
- exp_nomic_embed_text_v15
"""

import json
import time
from pathlib import Path
from typing import Dict, List

import requests
from openai import OpenAI
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.core.logging import logger


PROJECT_ROOT = Path(__file__).resolve().parents[2]

RESULTS_DIR = PROJECT_ROOT / "experiments" / "results"
RESULTS_FILE = RESULTS_DIR / "retrieval_results.json"
GOLDEN_FILE = (
    PROJECT_ROOT
    / "experiments"
    / "data"
    / "evaluation"
    / "rag_golden_eval_v1.json"
)
TOP_K = 10


TEST_QUESTIONS = [
    {
        "id": "security_01",
        "category": "security",
        "question": "What are the main risks in API security according to OWASP?",
    },
    {
        "id": "security_02",
        "category": "security",
        "question": "How can secure software development be integrated into the SDLC?",
    },
    {
        "id": "architecture_01",
        "category": "architecture",
        "question": "What is clean architecture and why is dependency inversion important?",
    },
    {
        "id": "architecture_02",
        "category": "architecture",
        "question": "What is hexagonal architecture?",
    },
    {
        "id": "coding_01",
        "category": "coding_standards",
        "question": "What is the Single Responsibility Principle?",
    },
    {
        "id": "coding_02",
        "category": "coding_standards",
        "question": "What are clean code best practices?",
    },
    {
        "id": "framework_01",
        "category": "framework_docs",
        "question": "What are best practices for Spring Boot configuration?",
    },
    {
        "id": "framework_02",
        "category": "framework_docs",
        "question": "How does Spring Boot manage application properties?",
    },
]


MODELS_TO_TEST = [
    #{
    #    "provider": "ollama",
    #    "name": "qwen3-embedding:8b",
    #    "collection": "exp_qwen3_embedding_8b",
    #    "query_prefix": "",
    #},
    {
        "provider": "openai",
        "name": "text-embedding-3-small",
        "collection": "exp_openai_text_embedding_3_small",
        "query_prefix": "",
    },
    {
        "provider": "sentence_transformers",
        "name": "sentence-transformers/all-MiniLM-L6-v2",
        "collection": "exp_minilm_l6_v2",
        "query_prefix": "",
    },
    #{
    #    "provider": "sentence_transformers",
    #    "name": "BAAI/bge-m3",
    #    "collection": "exp_bge_m3",
    #    "query_prefix": "",
    #},
    #{
    #    "provider": "sentence_transformers",
    #    "name": "nomic-ai/nomic-embed-text-v1.5",
    #    "collection": "exp_nomic_embed_text_v15",
    #    "query_prefix": "search_query: ",
    #},
]


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
        timeout=300,
    )


def embed_query_sentence_transformers(model_name: str, query: str) -> List[float]:
    model = SentenceTransformer(model_name, trust_remote_code=True)

    embedding = model.encode(
        query,
        normalize_embeddings=True,
    )

    return embedding.tolist()


def embed_query_openai(model_name: str, query: str) -> List[float]:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.embeddings.create(
        model=model_name,
        input=query,
    )

    return response.data[0].embedding


def embed_query_ollama(model_name: str, query: str) -> List[float]:
    response = requests.post(
        "http://localhost:11434/api/embed",
        json={
            "model": model_name,
            "input": query,
        },
        timeout=300,
    )

    response.raise_for_status()

    data = response.json()

    if "embeddings" not in data:
        raise ValueError(f"Ollama response does not contain embeddings: {data}")

    return data["embeddings"][0]


def embed_query(model_config: Dict, question: str) -> List[float]:
    provider = model_config["provider"]
    model_name = model_config["name"]
    query_prefix = model_config.get("query_prefix", "")

    prepared_question = query_prefix + question

    if provider == "sentence_transformers":
        return embed_query_sentence_transformers(model_name, prepared_question)

    if provider == "openai":
        return embed_query_openai(model_name, prepared_question)

    if provider == "ollama":
        return embed_query_ollama(model_name, prepared_question)

    raise ValueError(f"Unsupported provider: {provider}")


def search_qdrant(
    client: QdrantClient,
    collection_name: str,
    query_vector: List[float],
) -> List[Dict]:
    response = client.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=TOP_K,
        with_payload=True,
    )

    formatted_results = []

    for result in response.points:
        payload = result.payload or {}

        formatted_results.append(
            {
                "score": result.score,
                "category": payload.get("category"),
                "source": payload.get("source"),
                "filename": payload.get("filename"),
                "page_number": payload.get("page_number"),
                "chunk_id": payload.get("chunk_id"),
                "chunk_index": payload.get("chunk_index"),
                "text_preview": payload.get("text", "")[:500],
            }
        )

    return formatted_results

def load_golden_questions(file_path: Path) -> List[Dict]:
    with file_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    questions = []

    for item in data["questions"]:
        questions.append(
            {
                "id": item["id"],
                "category": (
                    item["relevant_chunks"][0]["category"]
                    if item.get("relevant_chunks")
                    else "negative"
                ),
                "question": item["question"],
                "type": item.get("type"),
                "difficulty": item.get("difficulty"),
            }
        )

    return questions

def test_model_on_question(
    client: QdrantClient,
    model_config: Dict,
    question_data: Dict,
) -> Dict:
    start_time = time.perf_counter()

    query_vector = embed_query(
        model_config=model_config,
        question=question_data["question"],
    )

    retrieved_chunks = search_qdrant(
        client=client,
        collection_name=model_config["collection"],
        query_vector=query_vector,
    )

    total_time = time.perf_counter() - start_time

    return {
        "question_id": question_data["id"],
        "expected_category": question_data["category"],
        "question": question_data["question"],
        "provider": model_config["provider"],
        "model": model_config["name"],
        "collection": model_config["collection"],
        "retrieval_time_seconds": round(total_time, 3),
        "top_k": TOP_K,
        "results": retrieved_chunks,
    }


def save_results(results: List[Dict]) -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    with RESULTS_FILE.open("w", encoding="utf-8") as file:
        json.dump(results, file, ensure_ascii=False, indent=2)


def print_report(results: List[Dict]) -> None:
    print("=" * 100)
    print("Retrieval Test Report")
    print("=" * 100)

    for item in results:
        print(f"Question ID: {item['question_id']}")
        print(f"Expected category: {item['expected_category']}")
        print(f"Question: {item['question']}")
        print(f"Model: {item['model']}")
        print(f"Collection: {item['collection']}")
        print(f"Retrieval time: {item['retrieval_time_seconds']} seconds")

        print("Top results:")

        for index, result in enumerate(item["results"], start=1):
            print(
                f"{index}. score={round(result['score'], 4)} | "
                f"category={result['category']} | "
                f"file={result['filename']} | "
                f"chunk={result['chunk_index']}"
            )
            print(f"   preview: {result['text_preview'][:250]}")
            print()

        print("-" * 100)

    print(f"Results saved to: {RESULTS_FILE}")
    print("=" * 100)


def main() -> None:
    logger.info("Starting retrieval experiment")

    if not GOLDEN_FILE.exists():
        logger.error(f"Golden eval file not found: {GOLDEN_FILE}")
        return

    client = get_qdrant_client()

    golden_questions = load_golden_questions(GOLDEN_FILE)

    logger.info(f"Golden questions loaded: {len(golden_questions)}")

    all_results = []

    for question_data in golden_questions:
        for model_config in MODELS_TO_TEST:
            try:
                result = test_model_on_question(
                    client=client,
                    model_config=model_config,
                    question_data=question_data,
                )

                all_results.append(result)

            except Exception as error:
                logger.error(
                    f"Retrieval failed | model={model_config['name']} | "
                    f"question={question_data['id']} | error={error}"
                )

                all_results.append(
                    {
                        "question_id": question_data["id"],
                        "expected_category": question_data["category"],
                        "question": question_data["question"],
                        "provider": model_config["provider"],
                        "model": model_config["name"],
                        "collection": model_config["collection"],
                        "retrieval_time_seconds": None,
                        "top_k": TOP_K,
                        "results": [],
                        "error": str(error),
                    }
                )

    save_results(all_results)
    print_report(all_results)

    logger.info("Retrieval experiment finished")

if __name__ == "__main__":
    main()