package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DashboardProjectResponse {

    private final Long id;

    private final String title;

    private final String status;

    private final int repositoryCount;

    private final String lastUpdated;

    private final String teamName;
}
