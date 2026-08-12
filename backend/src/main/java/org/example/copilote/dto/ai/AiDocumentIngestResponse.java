package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** Minimal response returned after FastAPI has indexed an uploaded document. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiDocumentIngestResponse(
        String status,
        String filename,
        @JsonProperty("chunks_indexed")
        Integer chunksIndexed,
        @JsonProperty("collection_name")
        String collectionName
) {
}
