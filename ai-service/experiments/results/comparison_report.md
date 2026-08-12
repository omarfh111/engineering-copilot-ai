# RAG Experiments Comparison Report

## Objective

The objective of this experiment is to compare multiple embedding models and retrieval strategies for the Engineering Copilot RAG pipeline.

The evaluated pipeline is:

```text
Documents
↓
Chunking
↓
Embeddings
↓
Qdrant Retrieval
↓
Optional Reranking
↓
Final Context
```

## Embedding Models Performance

| provider | model | status | chunks_tested | dimension | embedding_time_seconds | avg_time_per_chunk_seconds |
| --- | --- | --- | --- | --- | --- | --- |
| ollama | qwen3-embedding:8b | success | 80 | 4096 | 50.534 | 0.6317 |
| openai | text-embedding-3-small | success | 80 | 1536 | 5.897 | 0.0737 |
| sentence_transformers | sentence-transformers/all-MiniLM-L6-v2 | success | 80 | 384 | 1.863 | 0.0233 |
| sentence_transformers | BAAI/bge-m3 | success | 80 | 1024 | 46.95 | 0.5869 |
| sentence_transformers | nomic-ai/nomic-embed-text-v1.5 | success | 80 | 768 | 18.786 | 0.2348 |

## Retrieval Evaluation — Embedding Only

| model | provider | questions_evaluated | eval_k | avg_hit_file | avg_precision_file | avg_recall_file | avg_mrr_file | avg_hit_category | avg_retrieval_time_seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sentence-transformers/all-MiniLM-L6-v2 | sentence_transformers | 64 | 10 | 0.9062 | 0.6281 | 0.888 | 0.7465 | 0.9531 | 4.9525 |
| text-embedding-3-small | openai | 64 | 10 | 0.8906 | 0.6703 | 0.8724 | 0.7942 | 0.9688 | 0.8125 |

## Retrieval Evaluation — Embedding + Reranker

| model | provider | questions_evaluated | eval_k | avg_hit_file | avg_precision_file | avg_recall_file | avg_mrr_file | avg_hit_category | avg_retrieval_time_seconds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| text-embedding-3-small | openai | 64 | 5 | 0.875 | 0.7063 | 0.849 | 0.8091 | 0.9375 | 0.8125 |
| sentence-transformers/all-MiniLM-L6-v2 | sentence_transformers | 64 | 5 | 0.8594 | 0.6719 | 0.8359 | 0.7786 | 0.9219 | 4.9525 |

## Interpretation

- `text-embedding-3-small` achieved the best overall balance between retrieval quality and execution time.
- `all-MiniLM-L6-v2` is a strong lightweight local alternative, especially when API cost or offline execution matters.
- `qwen3-embedding:8b` produced strong results but is heavier due to its 4096-dimensional vectors and slower execution.
- `BAAI/bge-m3` and `nomic-ai/nomic-embed-text-v1.5` were less competitive on this dataset.
- Reranking improved precision and MRR, meaning the most relevant chunks were ranked higher.

## Final Decision

The selected baseline pipeline is:

```text
Embedding model: OpenAI text-embedding-3-small
Vector database: Qdrant
Initial retrieval: Top 10
Reranker: cross-encoder/ms-marco-MiniLM-L-6-v2
Final context: Top 5 chunks
```

## Next Steps

1. Convert the experimental scripts into reusable application services.
2. Implement the final RAG service using the selected pipeline.
3. Add LangChain and LangSmith for prompt orchestration, tracing, and evaluation.
4. Build the first agent using this validated retrieval pipeline.