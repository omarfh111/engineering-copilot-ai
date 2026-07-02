package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RepositorySummaryResponse {

    private final Long id;

    private final Long repoId;

    private final String name;

    private final String url;

    private final String technology;

    private final String provider;

    private final String branch;

    private final Long projectId;

    private final String projectTitle;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
