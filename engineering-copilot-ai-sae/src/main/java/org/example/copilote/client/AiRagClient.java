package org.example.copilote.client;

import lombok.extern.slf4j.Slf4j;
import org.example.copilote.dto.ai.AiAskResponse;
import org.example.copilote.dto.ai.AiAskSimpleRequest;
import org.example.copilote.exception.AiServiceUnavailableException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Thin client over the FastAPI IA RAG API.
 *
 * <p>Implements the SAE / IA hand-off rules:</p>
 * <ul>
 *   <li>calls the recommended route {@code POST /api/v1/rag/ask-simple};</li>
 *   <li>at most one retry, only on a network error or a {@code 502/503};</li>
 *   <li>never retries {@code 400/422} (bad request) or {@code 500};</li>
 *   <li>translates IA failures into stable business exceptions.</li>
 * </ul>
 */
@Slf4j
@Component
public class AiRagClient {

    private static final String ASK_SIMPLE_URI = "/api/v1/rag/ask-simple";
    private static final String HEALTH_URI = "/health";
    private static final int MAX_ATTEMPTS = 2;

    private final RestClient aiRestClient;

    public AiRagClient(@Qualifier("aiRestClient") RestClient aiRestClient) {
        this.aiRestClient = aiRestClient;
    }

    /**
     * Ask a question over the shared technical-documentation corpus.
     *
     * @throws IllegalArgumentException        when the IA rejects the request (400/422)
     * @throws AiServiceUnavailableException   when the IA is unreachable or fails (5xx/network)
     */
    public AiAskResponse askSimple(String question) {
        AiServiceUnavailableException lastFailure = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return aiRestClient.post()
                        .uri(ASK_SIMPLE_URI)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(new AiAskSimpleRequest(question))
                        .retrieve()
                        .body(AiAskResponse.class);

            } catch (RestClientResponseException ex) {
                int status = ex.getStatusCode().value();

                if (status == 400 || status == 422) {
                    // The question itself is invalid — do not retry, surface as 400.
                    throw new IllegalArgumentException(
                            "The AI service rejected the question (HTTP " + status + ").");
                }

                log.warn("AI ask-simple returned HTTP {} (attempt {}/{})", status, attempt, MAX_ATTEMPTS);
                lastFailure = new AiServiceUnavailableException(
                        "The AI service could not answer the question.");

                if (status != 502 && status != 503) {
                    break; // only 502/503 are worth retrying
                }

            } catch (ResourceAccessException ex) {
                // connection refused / read timeout
                log.warn("AI ask-simple network error (attempt {}/{}): {}",
                        attempt, MAX_ATTEMPTS, ex.getMessage());
                lastFailure = new AiServiceUnavailableException(
                        "The AI service is currently unreachable.");
            }
        }

        throw lastFailure != null
                ? lastFailure
                : new AiServiceUnavailableException("The AI service is currently unreachable.");
    }

    /**
     * Liveness probe against the IA {@code GET /health} route.
     * Never throws — returns {@code false} when the service is down.
     */
    public boolean isHealthy() {
        try {
            aiRestClient.get()
                    .uri(HEALTH_URI)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.debug("AI health check failed: {}", ex.getMessage());
            return false;
        }
    }
}
