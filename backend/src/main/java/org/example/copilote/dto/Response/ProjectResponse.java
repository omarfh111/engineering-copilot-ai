package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import org.example.copilote.entity.ProjectStatus;

import java.time.LocalDateTime;

@Getter
@Builder
public class ProjectResponse {
    private Long id;
    private String title;
    private String description;
    private ProjectStatus status;
    private TeamSummaryResponse team;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}