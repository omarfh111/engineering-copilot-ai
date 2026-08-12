package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import org.example.copilote.entity.RepositoryProvider;

import java.time.LocalDateTime;

@Getter
@Builder
public class RepositoryResponse {

    private final Long id;

    private final String name;

    private final String url;

    private final String technology;

    private final RepositoryProvider provider;

    private final String branch;

    private final ProjectSummaryResponse project;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
