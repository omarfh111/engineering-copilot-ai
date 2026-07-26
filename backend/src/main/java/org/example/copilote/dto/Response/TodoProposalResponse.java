package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Value;
import org.example.copilote.entity.Priority;
import org.example.copilote.entity.TodoProposalStatus;

import java.time.LocalDateTime;

@Value
@Builder
public class TodoProposalResponse {
    Long id;
    String findingKey;
    String agent;
    String title;
    String description;
    Priority priority;
    String filePath;
    Integer lineStart;
    TodoProposalStatus status;
    LocalDateTime createdAt;
}
