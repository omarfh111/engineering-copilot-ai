package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReviewSummaryResponse {

    private final Long id;

    private final Long reviewId;

    private final String reviewer;

    private final String comment;

    private final Double score;

    private final String status;

    private final Long analysisId;

    private final String analysisType;

    private final String projectTitle;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
