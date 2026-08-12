package org.example.copilote.dto.ai;

/**
 * Body sent to the IA route {@code POST /api/v1/rag/ask-simple}.
 *
 * <p>Internal transport DTO — never returned to the browser.</p>
 */
public record AiAskSimpleRequest(String question) {
}
