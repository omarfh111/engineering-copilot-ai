package org.example.copilote.config;

import tools.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Builds the {@link RestClient} used to call the FastAPI IA service.
 *
 * <p>The bean is named {@code aiRestClient} and is the only HTTP client the
 * backend uses to reach the AI microservice. Timeouts come from
 * {@link AiProperties} so they stay configurable per environment.</p>
 *
 * <p>Uses the core Spring Web {@link SimpleClientHttpRequestFactory} to stay
 * independent of any Spring Boot HTTP-client helper class.</p>
 */
@Configuration
@PropertySource(value = "file:./.env", ignoreResourceNotFound = true)
@EnableConfigurationProperties(AiProperties.class)
public class AiClientConfig {

    /**
     * JSON mapper shared by the IA client and the asynchronous analysis worker.
     * Declared explicitly because this project does not rely on Jackson auto-configuration.
     */
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public RestClient aiRestClient(RestClient.Builder builder, AiProperties properties) {

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.getConnectTimeout());
        requestFactory.setReadTimeout(properties.getResponseTimeout());

        return builder
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }
}
