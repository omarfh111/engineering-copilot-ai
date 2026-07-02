package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DashboardRecommendationResponse {

    private final String id;

    private final String title;

    private final String description;

    private final String priority;
}
