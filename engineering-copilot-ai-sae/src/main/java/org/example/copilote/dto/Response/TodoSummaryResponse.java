package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class TodoSummaryResponse {

    private final Long id;

    private final Long todoId;

    private final String title;

    private final String description;

    private final String priority;

    private final String status;

    private final String filePath;

    private final Integer lineNumber;

    private final Long analysisId;

    private final String analysisType;

    private final String projectTitle;

    private final LocalDateTime createdAt;

    private final LocalDateTime updatedAt;
}
