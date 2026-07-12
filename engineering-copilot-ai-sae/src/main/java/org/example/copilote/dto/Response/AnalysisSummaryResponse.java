package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AnalysisSummaryResponse {

    private final Long id;

    private final Long analysisId;

    private final String type;

    private final String status;

    private final String summary;

    private final Double score;

    private final Long projectId;

    private final String projectTitle;

    private final int todoCount;

    private final int reviewCount;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
