package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ProjectSummaryResponse {

    private final Long id;

    private final Long projectId;

    private final String title;

    private final String description;

    private final String status;

    private final String teamName;

    private final int repositoryCount;

    private final int documentCount;

    private final long todoCount;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
