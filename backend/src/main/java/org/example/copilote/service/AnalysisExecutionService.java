package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.copilote.client.AiRagClient;
import org.example.copilote.dto.ai.AiAnalysisRunRequest;
import org.example.copilote.dto.ai.AiAnalysisRunResponse;
import org.example.copilote.dto.ai.AiRepositoryScope;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.repository.AnalysisRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

/** Runs the IA call outside the HTTP transaction and persists a traceable outcome. */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisExecutionService {

    private final AnalysisRepository analysisRepository;
    private final AiRagClient aiRagClient;
    private final AnalysisResultPersistenceService analysisResultPersistenceService;

    @Async
    public void execute(Long analysisId, Long projectId, Long repositoryId, String repositoryUrl,
                        String branch, Long requestedBy, List<String> rules,
                        String architectureProfile, boolean generateDocumentation, String correlationId) {
        executeInternal(analysisId, projectId, repositoryId, repositoryUrl, branch, requestedBy,
                rules, architectureProfile, generateDocumentation, correlationId, null, List.of());
    }

    @Async
    public void executeImpact(Long analysisId, Long projectId, Long repositoryId, String repositoryUrl,
                              String branch, Long requestedBy, String changeDescription,
                              List<String> changePaths, String correlationId) {
        executeInternal(analysisId, projectId, repositoryId, repositoryUrl, branch, requestedBy,
                List.of(), null, false, correlationId, changeDescription, changePaths);
    }

    private void executeInternal(Long analysisId, Long projectId, Long repositoryId, String repositoryUrl,
                         String branch, Long requestedBy, List<String> rules,
                         String architectureProfile, boolean generateDocumentation, String correlationId,
                         String changeDescription, List<String> changePaths) {
        try {
            AiAnalysisRunResponse response = aiRagClient.runAnalysis(new AiAnalysisRunRequest(
                    analysisId, projectId, requestedBy, correlationId,
                    new AiRepositoryScope(repositoryId, repositoryUrl, branch), rules,
                    architectureProfile, generateDocumentation, changeDescription, changePaths));
            analysisResultPersistenceService.persist(analysisId, projectId, requestedBy, generateDocumentation, response.results());
            log.info("Repository analysis completed | analysisId={} correlationId={}", analysisId, correlationId);
        } catch (Exception error) {
            fail(analysisId, correlationId, error);
        }
    }

    private void fail(Long analysisId, String correlationId, Exception error) {
        analysisRepository.findById(analysisId).ifPresent(analysis -> {
            analysis.setStatus(AnalysisStatus.FAILED);
            analysis.setSummary("The AI analysis could not be completed. Check the correlation id in server logs.");
            analysis.setRecommendation("Verify the repository URL, the IA service health, and retry the analysis.");
            analysisRepository.save(analysis);
        });
        log.error("Repository analysis failed | analysisId={} correlationId={}", analysisId, correlationId, error);
    }

}
