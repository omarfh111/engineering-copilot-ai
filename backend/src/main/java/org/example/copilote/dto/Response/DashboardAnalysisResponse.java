package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DashboardAnalysisResponse {

    private final Long id;

    private final String projectTitle;

    private final String type;

    private final String status;

    private final String createdAt;

    private final Double score;
}
