import { apiClient } from '../lib/api';
import type {
  AssistantAnswer,
  AssistantAskPayload,
  AssistantHealth,
  AssistantSource
} from '../types/assistant';

/**
 * Client for the SAE AI-assistant endpoints. The backend returns camelCase
 * JSON already; normalization here only guards against nulls and string/number
 * drift so the UI can rely on stable types.
 */

type ApiAssistantSource = Partial<AssistantSource> & {
  source?: string | null;
  displayName?: string | null;
  pageNumber?: number | string | null;
  score?: number | string | null;
  chunkId?: string | null;
};

type ApiAssistantAnswer = Omit<AssistantAnswer, 'sources' | 'confidence' | 'chunksUsed' | 'responseTimeMs'> & {
  sources?: ApiAssistantSource[] | null;
  confidence?: number | string | null;
  chunksUsed?: number | string | null;
  responseTimeMs?: number | string | null;
};

function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSource(source: ApiAssistantSource): AssistantSource {
  return {
    source: source.source ?? null,
    displayName: source.displayName ?? source.source ?? null,
    pageNumber: toNumberOrNull(source.pageNumber),
    score: toNumberOrNull(source.score),
    chunkId: source.chunkId ?? null
  };
}

function normalizeAnswer(answer: ApiAssistantAnswer): AssistantAnswer {
  return {
    question: answer.question,
    answer: answer.answer,
    sources: (answer.sources ?? []).map(normalizeSource),
    confidence: toNumberOrNull(answer.confidence),
    chunksUsed: toNumberOrNull(answer.chunksUsed),
    responseTimeMs: toNumberOrNull(answer.responseTimeMs),
    collectionName: answer.collectionName ?? null,
    framework: answer.framework ?? null,
    rerankerType: answer.rerankerType ?? null
  };
}

export const assistantService = {
  async ask(payload: AssistantAskPayload): Promise<AssistantAnswer> {
    const response = await apiClient.post<ApiAssistantAnswer>('/api/assistant/ask', payload);
    return normalizeAnswer(response.data);
  },

  async getHealth(): Promise<AssistantHealth> {
    const response = await apiClient.get<AssistantHealth>('/api/assistant/health');
    return response.data;
  }
};
