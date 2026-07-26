package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.entity.Documentation;
import org.example.copilote.entity.DocumentationStatus;
import org.example.copilote.entity.DocumentationType;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.User;
import org.example.copilote.repository.DocumentationRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.repository.UserRepository;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

/** Persists only the explicit, optional documentation result as a reviewable draft. */
@Service
@RequiredArgsConstructor
public class GeneratedDocumentationPersistenceService {
    private final DocumentationRepository documentationRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public void saveIfPresent(Long analysisId, Long projectId, Long requestedBy, JsonNode results) {
        JsonNode document = results == null ? null : results.path("documentation").path("documentation");
        if (document == null || document.isMissingNode() || !document.hasNonNull("markdown")) return;

        Project project = projectRepository.findById(projectId).orElseThrow();
        User author = userRepository.findById(requestedBy).orElseThrow();
        String title = "AI technical report - analysis " + analysisId;
        if (documentationRepository.existsByTitleAndProjectProjectId(title, projectId)) return;

        documentationRepository.save(Documentation.builder()
                .title(title)
                .description("Generated from repository analysis. Human review required before approval.")
                .type(DocumentationType.TECHNICAL_REPORT)
                .content(document.path("markdown").asText())
                .path("analysis/" + analysisId + "/technical-report.md")
                .status(DocumentationStatus.PENDING_REVIEW)
                .generatedByAI(true)
                .approved(false)
                .project(project)
                .createdBy(author)
                .build());
    }
}
