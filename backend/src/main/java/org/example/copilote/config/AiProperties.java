package org.example.copilote.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Configuration for the FastAPI AI microservice (RAG).
 *
 * <p>Bound from the {@code ai.service.*} keys in {@code application.properties}.
 * The base URL is read from an environment variable so that no service
 * endpoint is hard-coded (see the SAE / IA hand-off contract).</p>
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "ai.service")
public class AiProperties {

    /** Base URL of the FastAPI IA service, e.g. {@code http://localhost:8000}. */
    private String baseUrl = "http://localhost:8000";

    /** Connection timeout. Short on purpose: the IA service is server-to-server. */
    private Duration connectTimeout = Duration.ofSeconds(5);

    /**
     * Response timeout. Generous: the first RAG call loads the CrossEncoder
     * lazily and a full generation can take tens of seconds.
     */
    private Duration responseTimeout = Duration.ofSeconds(90);

    /** Shared secret sent only by Spring Boot to protected FastAPI routes. */
    private String internalApiKey = "";
}
