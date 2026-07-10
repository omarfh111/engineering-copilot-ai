package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import org.example.copilote.entity.DocumentType;

import java.time.LocalDateTime;

@Getter
@Builder
public class DocumentResponse {

    private final Long id;

    private final String title;

    private final String description;

    private final DocumentType type;

    private final String path;

    private final String source;

    private final ProjectSummaryResponse project;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
