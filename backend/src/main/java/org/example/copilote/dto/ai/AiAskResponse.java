package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Full response of the IA routes {@code /api/v1/rag/ask-simple} and
 * {@code /api/v1/rag/ask} (snake_case JSON).
 *
 * <p>Internal transport DTO. The controller maps it to a distinct public DTO
 * ({@code AssistantAnswerResponse}) before returning it to the frontend.</p>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiAskResponse(
        String question,
        String answer,
        List<AiSourceResponse> sources,
        @JsonProperty("chunks_used") Integer chunksUsed,
        @JsonProperty("collection_name") String collectionName,
        @JsonProperty("retrieval_top_k") Integer retrievalTopK,
        @JsonProperty("final_top_k") Integer finalTopK,
        @JsonProperty("reranker_type") String rerankerType,
        String framework
) {
}
