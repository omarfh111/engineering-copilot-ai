package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.client.AiRagClient;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisFinding;
import org.example.copilote.entity.Document;
import org.example.copilote.entity.DocumentIndexingStatus;
import org.example.copilote.entity.Review;
import org.example.copilote.entity.ReviewStatus;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.repository.AnalysisFindingRepository;
import org.example.copilote.repository.AnalysisRepository;
import org.example.copilote.repository.ReviewRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/** Adds only explicitly approved human feedback to the project-scoped RAG corpus. */
@Service
@RequiredArgsConstructor
public class ApprovedFeedbackKnowledgeService {
    private final AnalysisRepository analysisRepository;
    private final AnalysisFindingRepository findingRepository;
    private final ReviewRepository reviewRepository;
    private final FeedbackDocumentPersistenceService feedbackDocumentPersistenceService;
    private final CurrentUserProvider currentUserProvider;
    private final AiRagClient aiRagClient;

    public Long publish(Long analysisId, String findingKey) {
        User user = currentUserProvider.getCurrentUser();
        if (!currentUserProvider.isAdmin(user) && !currentUserProvider.hasRole(user, Role.QA)) {
            throw new AccessDeniedException("Only Admin or QA can publish approved feedback to project knowledge");
        }
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new IllegalArgumentException("Analysis not found"));
        Review review = reviewRepository.findByAnalysisAnalysisIdAndFindingKey(analysisId, findingKey)
                .orElseThrow(() -> new IllegalArgumentException("Only an approved finding can be added to project knowledge"));
        if (review.getStatus() != ReviewStatus.ACCEPTED) {
            throw new IllegalArgumentException("Only an approved finding can be added to project knowledge");
        }
        AnalysisFinding finding = findingRepository.findByAnalysisAnalysisId(analysisId).stream()
                .filter(item -> findingKey.equals(item.getFindingKey())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Finding not found"));
        String title = "Validated feedback - " + analysisId + " - "
                + findingKey.substring(0, Math.min(findingKey.length(), 110));
        String markdown = "# Validated engineering feedback\n\n"
                + "- Analysis: " + analysisId + "\n- Finding: " + finding.getTitle() + "\n"
                + "- Severity: " + finding.getSeverity() + "\n- Agent: " + finding.getAgent() + "\n"
                + "- Decision: " + review.getStatus() + "\n- Reviewer: " + review.getReviewer() + "\n"
                + "- Reviewed at: " + review.getUpdatedAt() + "\n\n"
                + "## Evidence\n" + finding.getEvidence() + "\n\n## Approved recommendation\n"
                + (finding.getRecommendation() == null ? "No recommendation provided." : finding.getRecommendation())
                + "\n\n## Human review comment\n" + (review.getComment() == null ? "No comment provided." : review.getComment()) + "\n";
        Document document = feedbackDocumentPersistenceService.createPending(analysis.getProject(), title,
                "knowledge/analysis-" + analysisId + "/" + findingKey + ".md");
        try {
            aiRagClient.ingestDocument("approved-feedback-" + document.getDocId() + ".md",
                    markdown.getBytes(StandardCharsets.UTF_8), analysis.getProject().getProjectId(), document.getDocId());
            feedbackDocumentPersistenceService.markStatus(document.getDocId(), DocumentIndexingStatus.INDEXED);
        } catch (RuntimeException exception) {
            feedbackDocumentPersistenceService.markStatus(document.getDocId(), DocumentIndexingStatus.FAILED);
            throw exception;
        }
        return document.getDocId();
    }
}
