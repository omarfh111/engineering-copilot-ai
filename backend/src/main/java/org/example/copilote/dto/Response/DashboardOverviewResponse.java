package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DashboardOverviewResponse {

    private final DashboardStatsResponse stats;

    private final List<DashboardProjectResponse> recentProjects;

    private final List<DashboardAnalysisResponse> recentAnalyses;

    private final List<DashboardRecommendationResponse> aiRecommendations;
}
