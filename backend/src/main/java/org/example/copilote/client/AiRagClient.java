package org.example.copilote.client;

import lombok.extern.slf4j.Slf4j;
import org.example.copilote.config.AiProperties;
import org.example.copilote.dto.ai.AiDocumentIngestResponse;
import org.example.copilote.dto.ai.AiAskResponse;
import org.example.copilote.dto.ai.AiAskSimpleRequest;
import org.example.copilote.dto.ai.AiAnalysisRunRequest;
import org.example.copilote.dto.ai.AiAnalysisRunResponse;
import org.example.copilote.dto.ai.AiTodoProposalRequest;
import org.example.copilote.exception.AiServiceUnavailableException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

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
    private static final String HEALTH_URI = "/api/v1/rag/health";
    private static final String DOCUMENT_INGEST_URI = "/api/v1/documents/ingest";
    private static final String ANALYSIS_RUN_URI = "/api/v1/analyses/run";
    private static final String TODO_PROPOSALS_URI = "/api/v1/analyses/todo-proposals";
    private static final String INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key";
    private static final int MAX_ATTEMPTS = 2;

    private final RestClient aiRestClient;
    private final String internalApiKey;

    public AiRagClient(@Qualifier("aiRestClient") RestClient aiRestClient, AiProperties properties) {
        this.aiRestClient = aiRestClient;
        this.internalApiKey = resolveInternalApiKey(properties.getInternalApiKey());
        if (!StringUtils.hasText(this.internalApiKey)) {
            throw new IllegalStateException(
                    "AI_INTERNAL_API_KEY is required in backend/.env or the process environment");
        }
        log.info("AI internal authentication configured successfully");
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
                        .header(INTERNAL_API_KEY_HEADER, internalApiKey)
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
                    .header(INTERNAL_API_KEY_HEADER, internalApiKey)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.debug("AI health check failed: {}", ex.getMessage());
            return false;
        }
    }

    /**
     * Execute the protected repository-analysis endpoint. Spring deliberately
     * sends only persisted repository metadata; FastAPI never receives user JWTs.
     */
    public AiAnalysisRunResponse runAnalysis(AiAnalysisRunRequest request) {
        AiServiceUnavailableException lastFailure = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return aiRestClient.post()
                        .uri(ANALYSIS_RUN_URI)
                        .header(INTERNAL_API_KEY_HEADER, internalApiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(request)
                        .retrieve()
                        .body(AiAnalysisRunResponse.class);
            } catch (RestClientResponseException ex) {
                int status = ex.getStatusCode().value();
                if (status == 400 || status == 422) {
                    throw new IllegalArgumentException("The AI service rejected this analysis request.");
                }
                log.warn("AI analysis returned HTTP {} (attempt {}/{})", status, attempt, MAX_ATTEMPTS);
                lastFailure = new AiServiceUnavailableException("The AI service could not complete the analysis.");
                if (status != 502 && status != 503) {
                    break;
                }
            } catch (ResourceAccessException ex) {
                log.warn("AI analysis network error (attempt {}/{}): {}", attempt, MAX_ATTEMPTS, ex.getMessage());
                lastFailure = new AiServiceUnavailableException("The AI service is currently unreachable.");
            }
        }

        throw lastFailure != null ? lastFailure
                : new AiServiceUnavailableException("The AI service is currently unreachable.");
    }

    /** Calls the IA TODO agent; it returns proposals but never writes a business TODO. */
    public AiAnalysisRunResponse generateTodoProposals(AiTodoProposalRequest request) {
        try {
            return aiRestClient.post().uri(TODO_PROPOSALS_URI)
                    .header(INTERNAL_API_KEY_HEADER, internalApiKey).contentType(MediaType.APPLICATION_JSON)
                    .body(request).retrieve().body(AiAnalysisRunResponse.class);
        } catch (RestClientResponseException | ResourceAccessException exception) {
            throw new AiServiceUnavailableException("The AI service could not generate TODO proposals.");
        }
    }

    /** Send document bytes to FastAPI. Filesystem paths are never shared. */
    public AiDocumentIngestResponse ingestDocument(
            String filename, byte[] content, Long projectId, Long documentId
    ) {
        ByteArrayResource fileResource = new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentDispositionFormData("file", filename);
        fileHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);

        MultiValueMap<String, Object> multipart = new LinkedMultiValueMap<>();
        multipart.add("file", new HttpEntity<>(fileResource, fileHeaders));
        multipart.add("project_id", projectId.toString());
        multipart.add("document_id", documentId.toString());

        try {
            return aiRestClient.post()
                    .uri(DOCUMENT_INGEST_URI)
                    .header(INTERNAL_API_KEY_HEADER, internalApiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(multipart)
                    .retrieve()
                    .body(AiDocumentIngestResponse.class);
        } catch (RestClientResponseException ex) {
            log.warn("AI document ingestion failed | status={} response={}",
                    ex.getStatusCode().value(), ex.getResponseBodyAsString());
            throw new AiServiceUnavailableException("The AI service could not index the document.");
        } catch (ResourceAccessException ex) {
            log.warn("AI document ingestion network failure: {}", ex.getMessage());
            throw new AiServiceUnavailableException("The AI service could not index the document.");
        } catch (RestClientException ex) {
            log.warn("AI document ingestion response could not be processed: {}", ex.getMessage());
            throw new AiServiceUnavailableException("The AI service returned an invalid ingestion response.");
        }
    }

    private String resolveInternalApiKey(String configuredValue) {
        String environmentValue = System.getenv("AI_INTERNAL_API_KEY");
        if (StringUtils.hasText(environmentValue)) {
            return environmentValue.trim();
        }

        for (Path candidate : List.of(Path.of(".env"), Path.of("backend", ".env"))) {
            Path localEnv = candidate.toAbsolutePath().normalize();
            if (!Files.isRegularFile(localEnv)) {
                continue;
            }
            try {
                return Files.readAllLines(localEnv).stream()
                        .map(String::trim)
                        .filter(line -> line.startsWith("AI_INTERNAL_API_KEY="))
                        .map(line -> line.substring("AI_INTERNAL_API_KEY=".length()).trim())
                        .filter(StringUtils::hasText)
                        .reduce((first, second) -> second)
                        .orElse(configuredValue);
            } catch (IOException exception) {
                log.warn("Could not read local .env file: {}", exception.getMessage());
            }
        }

        return configuredValue == null ? "" : configuredValue.trim();
    }
}
