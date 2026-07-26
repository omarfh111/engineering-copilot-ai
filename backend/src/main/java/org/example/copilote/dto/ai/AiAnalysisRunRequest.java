package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiAnalysisRunRequest(
        @JsonProperty("analysis_id") Long analysisId,
        @JsonProperty("project_id") Long projectId,
        @JsonProperty("requested_by") Long requestedBy,
        @JsonProperty("correlation_id") String correlationId,
        AiRepositoryScope repository,
        List<String> rules,
        @JsonProperty("architecture_profile") String architectureProfile,
        @JsonProperty("generate_documentation") boolean generateDocumentation,
        @JsonProperty("change_description") String changeDescription,
        @JsonProperty("change_paths") List<String> changePaths
) {
}
