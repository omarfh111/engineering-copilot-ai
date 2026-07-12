package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.copilote.client.AiRagClient;
import org.example.copilote.dto.Request.AssistantAskRequest;
import org.example.copilote.dto.Response.AssistantAnswerResponse;
import org.example.copilote.dto.Response.AssistantSourceResponse;
import org.example.copilote.dto.ai.AiAskResponse;
import org.example.copilote.dto.ai.AiSourceResponse;
import org.example.copilote.entity.User;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.AssistantService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

/**
 * Orchestrates an assistant question:
 * <ol>
 *   <li>resolve the authenticated user (defence in depth on top of RBAC);</li>
 *   <li>call the IA {@code ask-simple} route and measure the latency;</li>
 *   <li>log the sensitive AI action for auditability (AUTH-04 / NFR-AUD-01);</li>
 *   <li>map the internal IA response to the public DTO and derive a confidence.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantServiceImpl implements AssistantService {

    private final AiRagClient aiRagClient;
    private final CurrentUserProvider currentUserProvider;

    @Override
    public AssistantAnswerResponse ask(AssistantAskRequest request) {
        User user = currentUserProvider.getCurrentUser();

        long startedAt = System.currentTimeMillis();
        AiAskResponse aiResponse = aiRagClient.askSimple(request.question());
        long elapsedMs = System.currentTimeMillis() - startedAt;

        log.info("Assistant question answered | userId={} email={} chunksUsed={} elapsedMs={}",
                user.getId(), user.getEmail(), aiResponse.chunksUsed(), elapsedMs);

        return new AssistantAnswerResponse(
                aiResponse.question(),
                aiResponse.answer(),
                mapSources(aiResponse),
                computeConfidence(aiResponse),
                aiResponse.chunksUsed(),
                elapsedMs,
                aiResponse.collectionName(),
                aiResponse.framework(),
                aiResponse.rerankerType()
        );
    }

    @Override
    public boolean isAiHealthy() {
        return aiRagClient.isHealthy();
    }

    private List<AssistantSourceResponse> mapSources(AiAskResponse aiResponse) {
        if (aiResponse.sources() == null) {
            return List.of();
        }
        return aiResponse.sources().stream()
                .map(this::mapSource)
                .toList();
    }

    private AssistantSourceResponse mapSource(AiSourceResponse source) {
        return new AssistantSourceResponse(
                source.source(),
                toDisplayName(source.source()),
                source.pageNumber(),
                source.score(),
                source.chunkId()
        );
    }

    private String toDisplayName(String source) {
        if (source == null || source.isBlank()) {
            return "Source inconnue";
        }
        int separator = Math.max(source.lastIndexOf('/'), source.lastIndexOf('\\'));
        return separator >= 0 ? source.substring(separator + 1) : source;
    }

    /**
     * Human-interpretable confidence in [0,1] based on the best embedding
     * (cosine) score. Rerank scores are excluded on purpose: they are
     * unbounded and can be negative, so only their ordering is meaningful.
     */
    private Double computeConfidence(AiAskResponse aiResponse) {
        if (aiResponse.sources() == null || aiResponse.sources().isEmpty()) {
            return null;
        }
        return aiResponse.sources().stream()
                .map(AiSourceResponse::embeddingScore)
                .filter(Objects::nonNull)
                .max(Double::compareTo)
                .map(value -> Math.max(0.0, Math.min(1.0, value)))
                .orElse(null);
    }
}
