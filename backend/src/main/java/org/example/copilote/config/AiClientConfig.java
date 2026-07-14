package org.example.copilote.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
@EnableConfigurationProperties(AiProperties.class)
public class AiClientConfig {

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
