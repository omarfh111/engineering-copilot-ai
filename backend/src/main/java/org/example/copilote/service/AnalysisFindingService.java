package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Response.AnalysisFindingResponse;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisFinding;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.AnalysisFindingRepository;
import org.example.copilote.repository.AnalysisRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor
public class AnalysisFindingService {
    private final AnalysisFindingRepository findingRepository;
    private final AnalysisRepository analysisRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public List<AnalysisFindingResponse> getByAnalysis(Long analysisId) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis record not found with id: " + analysisId));
        var user = currentUserProvider.getCurrentUser();
        boolean allowed = currentUserProvider.isAdmin(user) || currentUserProvider.hasRole(user, org.example.copilote.entity.Role.AUDITOR)
                || (analysis.getProject() != null && analysis.getProject().getTeam() != null
                && analysis.getProject().getTeam().getUsers().stream().anyMatch(member -> member.getId().equals(user.getId())));
        if (!allowed) throw new AccessDeniedException("You are not allowed to access analysis findings");
        return findingRepository.findByAnalysisAnalysisId(analysisId).stream().map(this::map).toList();
    }
    private AnalysisFindingResponse map(AnalysisFinding finding) {
        return AnalysisFindingResponse.builder().id(finding.getFindingId()).findingKey(finding.getFindingKey())
                .agent(finding.getAgent()).title(finding.getTitle()).severity(finding.getSeverity())
                .confidence(finding.getConfidence()).evidence(finding.getEvidence()).recommendation(finding.getRecommendation())
                .filePath(finding.getFilePath()).lineStart(finding.getLineStart()).sourcesJson(finding.getSourcesJson()).build();
    }
}
