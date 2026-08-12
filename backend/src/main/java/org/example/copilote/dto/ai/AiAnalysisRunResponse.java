package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.JsonNode;

public record AiAnalysisRunResponse(
        @JsonProperty("analysis_id") Long analysisId,
        @JsonProperty("project_id") Long projectId,
        @JsonProperty("correlation_id") String correlationId,
        JsonNode results
) {
}
