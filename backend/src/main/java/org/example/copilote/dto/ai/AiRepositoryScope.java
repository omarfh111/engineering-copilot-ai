package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiRepositoryScope(
        @JsonProperty("repository_id") Long repositoryId,
        String url,
        String branch
) {
}
