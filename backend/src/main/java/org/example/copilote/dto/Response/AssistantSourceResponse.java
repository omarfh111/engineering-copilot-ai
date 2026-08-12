package org.example.copilote.dto.Response;

/**
 * A single citation returned to the frontend (camelCase JSON).
 *
 * <p>Public DTO, deliberately narrower than the internal IA source: only the
 * fields the UI needs to render a source badge are exposed.</p>
 */
public record AssistantSourceResponse(
        String source,
        String displayName,
        Integer pageNumber,
        Double score,
        String chunkId
) {
}
