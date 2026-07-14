package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DashboardStatsResponse {

    private final long projects;

    private final long repositories;

    private final long documents;

    private final long analyses;

    private final long openTodos;
}
