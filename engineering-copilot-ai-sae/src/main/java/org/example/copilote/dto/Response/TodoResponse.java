package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.Priority;
import org.example.copilote.entity.TodoStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class TodoResponse {

    private Long id;

    private Long todoId;

    private String title;

    private String description;

    private Priority priority;

    private TodoStatus status;

    private String filePath;

    private Integer lineNumber;

    private AnalysisSummaryResponse analysis;

    private ProjectSummaryResponse project;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
