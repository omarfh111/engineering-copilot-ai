package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class TeamSummaryResponse {

    private final Long id;

    private final Long teamId;

    private final String name;

    private final String teamName;

    private final String description;

    private final int projectCount;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
