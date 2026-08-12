package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisFinding;
import org.example.copilote.entity.Severity;
import org.example.copilote.repository.AnalysisFindingRepository;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service @RequiredArgsConstructor
public class AnalysisFindingPersistenceService {
    private final AnalysisFindingRepository repository;
    private final ObjectMapper objectMapper;

    public void replace(Analysis analysis, JsonNode results) {
        for (var entry : results.properties()) {
            String agent = entry.getKey().toString();
            JsonNode result = entry.getValue();
            JsonNode findings = result.path("findings");
            for (int index = 0; index < findings.size(); index++) {
                JsonNode finding = findings.get(index);
                String title = finding.path("title").asText("Untitled finding");
                String evidence = finding.path("evidence").asText();
                String path = finding.path("location").path("path").asText(null);
                Integer lineStart = finding.path("location").path("line_start").isInt()
                        ? finding.path("location").path("line_start").asInt() : null;
                String findingKey = stableFindingKey(agent, title, evidence, path, lineStart);
                AnalysisFinding persisted = repository.findByAnalysisAnalysisIdAndFindingKey(analysis.getAnalysisId(), findingKey)
                        .orElseGet(() -> AnalysisFinding.builder().analysis(analysis).findingKey(findingKey).build());
                persisted.setAgent(agent);
                persisted.setTitle(title);
                persisted.setSeverity(parseSeverity(finding.path("severity").asText()));
                persisted.setConfidence(finding.path("confidence").asDouble(0d));
                persisted.setEvidence(evidence);
                persisted.setRecommendation(finding.path("recommendation").asText());
                persisted.setFilePath(path);
                persisted.setLineStart(lineStart);
                persisted.setSourcesJson(writeSources(finding.path("sources")));
                repository.save(persisted);
            }
        }
    }
    private String stableFindingKey(String agent, String title, String evidence, String path, Integer lineStart) {
        String value = String.join("|", agent, normalize(title), normalize(path), String.valueOf(lineStart), normalize(evidence));
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte item : hash) hex.append(String.format("%02x", item));
            return agent + ":" + hex.substring(0, 24);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
    private String normalize(String value) { return value == null ? "" : value.trim().replaceAll("\\s+", " "); }
    private Severity parseSeverity(String value) { try { return Severity.valueOf(value); } catch (Exception e) { return Severity.MEDIUM; } }
    private String writeSources(JsonNode sources) { try { return objectMapper.writeValueAsString(sources); } catch (Exception e) { return "[]"; } }
}
