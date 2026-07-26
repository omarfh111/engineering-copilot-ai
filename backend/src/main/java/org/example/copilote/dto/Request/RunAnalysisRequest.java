package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** Request to launch a read-only, repository-scoped multi-agent audit. */
@Getter
@Setter
public class RunAnalysisRequest {

    @NotNull(message = "Project is required")
    private Long projectId;

    @NotNull(message = "Repository is required")
    private Long repositoryId;

    /** Optional reference profile. Only an explicit value enables profile compliance checks. */
    @Size(max = 80, message = "Architecture profile must be 80 characters or fewer")
    private String architectureProfile;

    /** Creates a DRAFT AI technical document after the audit has completed. */
    private boolean generateDocumentation;

    @Size(max = 30, message = "At most 30 rules may be supplied")
    private List<@Size(max = 250, message = "A rule must be 250 characters or fewer") String> rules = new ArrayList<>();
}
