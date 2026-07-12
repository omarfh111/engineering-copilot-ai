package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.ReviewStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ReviewResponse {

    private Long id;

    private Long reviewId;

    private String reviewer;

    private String comment;

    private Double score;

    private ReviewStatus status;

    private AnalysisSummaryResponse analysis;

    private ProjectSummaryResponse project;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
