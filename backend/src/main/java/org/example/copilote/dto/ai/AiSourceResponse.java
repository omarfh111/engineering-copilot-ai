package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * One retrieved source as returned by the IA service (snake_case JSON).
 *
 * <p>{@code @JsonIgnoreProperties(ignoreUnknown = true)} lets the IA add new
 * non-critical fields later without breaking this client.</p>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiSourceResponse(
        String source,
        @JsonProperty("page_number") Integer pageNumber,
        Double score,
        @JsonProperty("embedding_score") Double embeddingScore,
        @JsonProperty("rerank_score") Double rerankScore,
        @JsonProperty("chunk_id") String chunkId
) {
}
