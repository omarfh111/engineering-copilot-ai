package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Server-to-server request containing only findings already accepted by a human. */
public record AiTodoProposalRequest(
        @JsonProperty("analysis_id") Long analysisId,
        @JsonProperty("project_id") Long projectId,
        @JsonProperty("requested_by") Long requestedBy,
        @JsonProperty("correlation_id") String correlationId,
        AiRepositoryScope repository,
        @JsonProperty("approved_findings") List<AiApprovedFinding> approvedFindings
) {}
