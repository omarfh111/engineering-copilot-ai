package org.example.copilote.dto.Response;

import java.util.List;

/**
 * Public answer returned to the frontend by {@code POST /api/assistant/ask}.
 *
 * <p>Kept distinct from the internal {@code AiAskResponse} so the IA contract
 * can evolve without leaking directly to the browser.</p>
 *
 * @param confidence     heuristic score in [0,1] derived from the best embedding
 *                       (cosine) score; {@code null} when no source was found.
 *                       CrossEncoder rerank scores are intentionally NOT used
 *                       here because they are unbounded and can be negative.
 * @param responseTimeMs wall-clock time spent calling the IA service.
 */
public record AssistantAnswerResponse(
        String question,
        String answer,
        List<AssistantSourceResponse> sources,
        Double confidence,
        Integer chunksUsed,
        Long responseTimeMs,
        String collectionName,
        String framework,
        String rerankerType
) {
}
