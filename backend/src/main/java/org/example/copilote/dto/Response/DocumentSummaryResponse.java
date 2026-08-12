package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DocumentSummaryResponse {

    private final Long id;

    private final Long docId;

    private final String title;

    private final String description;

    private final String type;

    private final String path;

    private final String source;

    private final Long projectId;

    private final String projectTitle;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
