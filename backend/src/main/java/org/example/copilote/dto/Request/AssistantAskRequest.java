package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Question submitted by the frontend to {@code POST /api/assistant/ask}.
 *
 * <p>{@code projectId} is optional and reserved for the next sprint
 * (project-scoped RAG and saving the exchange as a Conversation). It is not
 * used to scope retrieval yet — the IA {@code ask-simple} route answers over
 * the shared technical-documentation corpus.</p>
 */
public record AssistantAskRequest(

        @NotBlank(message = "question is required")
        @Size(min = 3, message = "question must be at least 3 characters")
        String question,

        Long projectId
) {
}
