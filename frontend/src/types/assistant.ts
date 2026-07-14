/**
 * Types for the AI assistant feature.
 *
 * These mirror the SAE backend contract exposed by `POST /api/assistant/ask`,
 * which itself wraps the FastAPI IA route `POST /api/v1/rag/ask-simple`.
 * The frontend only ever talks to the Spring Boot backend, never to FastAPI.
 */

export interface AssistantSource {
  source: string | null;
  displayName: string | null;
  pageNumber: number | null;
  score: number | null;
  chunkId: string | null;
}

export interface AssistantAnswer {
  question: string;
  answer: string;
  sources: AssistantSource[];
  /** Heuristic confidence in [0,1]; null when no source was found. */
  confidence: number | null;
  chunksUsed: number | null;
  responseTimeMs: number | null;
  collectionName: string | null;
  framework: string | null;
  rerankerType: string | null;
}

export interface AssistantAskPayload {
  question: string;
  /** Reserved for next-sprint project-scoped RAG / saving the exchange. */
  projectId?: number | null;
}

export interface AssistantHealth {
  status: string;
  aiService: boolean;
}
