package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** Explicit, repository-scoped request. It never triggers a full audit. */
@Getter
@Setter
public class ImpactAnalysisRequest {
    @NotNull private Long projectId;
    @NotNull private Long repositoryId;
    @NotBlank @Size(min = 5, max = 4000) private String changeDescription;
    @Size(max = 50) private List<@Size(max = 2048) String> paths = new ArrayList<>();
}
