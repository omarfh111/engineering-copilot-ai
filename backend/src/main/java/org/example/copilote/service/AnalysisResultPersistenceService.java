package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.entity.Severity;
import org.example.copilote.repository.AnalysisRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Comparator;

/** Commits one completed analysis and all of its relational output atomically. */
@Service
@RequiredArgsConstructor
public class AnalysisResultPersistenceService {
    private final AnalysisRepository analysisRepository;
    private final ObjectMapper objectMapper;
    private final GeneratedDocumentationPersistenceService generatedDocumentationPersistenceService;
    private final AnalysisFindingPersistenceService analysisFindingPersistenceService;

    @Transactional
    public void persist(Long analysisId, Long projectId, Long requestedBy,
                        boolean generateDocumentation, JsonNode results) throws Exception {
        Analysis analysis = analysisRepository.findById(analysisId).orElse(null);
        if (analysis == null) {
            return;
        }
        if (results == null || !results.isObject() || results.isEmpty()) {
            throw new IllegalArgumentException("The IA service returned no agent result");
        }

        analysis.setAgentResultsJson(objectMapper.writeValueAsString(results));
        analysis.setSummary(buildSummary(results));
        analysis.setRecommendation(buildRecommendation(results));
        analysis.setSeverity(resolveHighestSeverity(results));
        analysis.setScore(calculateScore(results));
        analysis.setStatus(resolveExecutionStatus(results));
        analysisRepository.save(analysis);
        analysisFindingPersistenceService.replace(analysis, results);
        if (generateDocumentation) {
            generatedDocumentationPersistenceService.saveIfPresent(analysisId, projectId, requestedBy, results);
        }
    }

    private String buildSummary(JsonNode results) {
        int agents = results.size();
        int findings = results.findValues("findings").stream()
                .filter(JsonNode::isArray).mapToInt(JsonNode::size).sum();
        return "%d agent(s) completed; %d finding(s) retained. Review the detailed agent results before creating TODO items."
                .formatted(agents, findings);
    }

    private AnalysisStatus resolveExecutionStatus(JsonNode results) {
        boolean partial = results.findValues("status").stream()
                .filter(JsonNode::isTextual)
                .map(JsonNode::asText)
                .anyMatch(value -> "PARTIAL".equals(value) || "FAILED".equals(value));
        return partial ? AnalysisStatus.PARTIAL : AnalysisStatus.COMPLETED;
    }

    private String buildRecommendation(JsonNode results) {
        return results.findValues("recommendation").stream()
                .filter(JsonNode::isTextual)
                .map(JsonNode::asText)
                .filter(value -> !value.isBlank())
                .distinct()
                .limit(3)
                .reduce((left, right) -> left + "\n- " + right)
                .map(value -> "- " + value)
                .orElse("Review the detailed agent results and approve findings before creating TODO items.");
    }

    private Severity resolveHighestSeverity(JsonNode results) {
        return results.findValues("severity").stream()
                .filter(JsonNode::isTextual)
                .map(node -> parseSeverity(node.asText()))
                .max(Comparator.comparingInt(this::severityWeight))
                .orElse(Severity.LOW);
    }

    private double calculateScore(JsonNode results) {
        int penalty = results.findValues("severity").stream()
                .filter(JsonNode::isTextual)
                .map(node -> parseSeverity(node.asText()))
                .mapToInt(this::severityWeight)
                .sum();
        return Math.max(0, 100 - penalty);
    }

    private Severity parseSeverity(String value) {
        try { return Severity.valueOf(value); } catch (IllegalArgumentException exception) { return Severity.LOW; }
    }

    private int severityWeight(Severity severity) {
        return switch (severity) {
            case LOW -> 1;
            case MEDIUM -> 5;
            case HIGH -> 15;
            case CRITICAL -> 30;
        };
    }
}
