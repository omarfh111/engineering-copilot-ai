package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import org.example.copilote.entity.DocumentationStatus;
import org.example.copilote.entity.DocumentationType;

import java.time.LocalDateTime;

@Getter
@Builder
public class DocumentationResponse {

    private final Long id;

    private final String title;

    private final String description;

    private final DocumentationType type;

    private final String content;

    private final String path;

    private final DocumentationStatus status;

    private final boolean generatedByAI;

    private final boolean approved;

    private final ProjectSummaryResponse project;

    private final UserSummaryResponse createdBy;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
