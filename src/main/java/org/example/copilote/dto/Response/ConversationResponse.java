package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ConversationResponse {

    private Long id;

    private Long conversationId;

    private String question;

    private String response;

    private Double confidenceScore;

    private Long responseTime;

    private UserSummaryResponse user;

    private ProjectSummaryResponse project;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
