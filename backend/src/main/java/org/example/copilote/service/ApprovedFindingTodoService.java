package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.client.AiRagClient;
import org.example.copilote.dto.Response.TodoProposalResponse;
import org.example.copilote.dto.ai.AiApprovedFinding;
import org.example.copilote.dto.ai.AiFinding;
import org.example.copilote.dto.ai.AiFindingLocation;
import org.example.copilote.dto.ai.AiRepositoryScope;
import org.example.copilote.dto.ai.AiTodoProposalRequest;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisFinding;
import org.example.copilote.entity.Priority;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Review;
import org.example.copilote.entity.ReviewStatus;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.Todo;
import org.example.copilote.entity.TodoProposal;
import org.example.copilote.entity.TodoProposalStatus;
import org.example.copilote.entity.TodoStatus;
import org.example.copilote.entity.User;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.AnalysisFindingRepository;
import org.example.copilote.repository.AnalysisRepository;
import org.example.copilote.repository.ReviewRepository;
import org.example.copilote.repository.TodoProposalRepository;
import org.example.copilote.repository.TodoRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Keeps the IA output reviewable: generating a proposal never creates a business TODO.
 * Only a later explicit confirmation persists a Todo.
 */
@Service
@RequiredArgsConstructor
public class ApprovedFindingTodoService {
    private final AnalysisRepository analysisRepository;
    private final AnalysisFindingRepository findingRepository;
    private final ReviewRepository reviewRepository;
    private final TodoRepository todoRepository;
    private final TodoProposalRepository todoProposalRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AiRagClient aiRagClient;

    /** Returns stored proposals and asks the IA agent only for newly accepted findings. */
    public List<TodoProposalResponse> proposals(Long analysisId) {
        Analysis analysis = findRepositoryBackedAnalysis(analysisId);
        ensureManager(analysis);

        List<AnalysisFinding> approved = approvedFindings(analysisId);
        Map<Long, TodoProposal> existingByFindingId = new HashMap<>();
        todoProposalRepository.findByAnalysisAnalysisIdOrderByCreatedAtDesc(analysisId)
                .forEach(proposal -> existingByFindingId.put(proposal.getFinding().getFindingId(), proposal));

        List<AnalysisFinding> missing = approved.stream()
                .filter(finding -> !existingByFindingId.containsKey(finding.getFindingId()))
                .toList();
        if (!missing.isEmpty()) {
            createMissingProposals(analysis, missing, currentUserProvider.getCurrentUser());
        }

        return todoProposalRepository.findByAnalysisAnalysisIdOrderByCreatedAtDesc(analysisId).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Creates real TODO items only from stored, still-approved proposal ids. */
    @Transactional
    public int confirm(Long analysisId, List<Long> proposalIds) {
        Analysis analysis = findRepositoryBackedAnalysis(analysisId);
        ensureManager(analysis);

        List<TodoProposal> proposals = todoProposalRepository.findByProposalIdInAndAnalysisAnalysisId(proposalIds, analysisId);
        if (proposals.size() != proposalIds.stream().distinct().count()) {
            throw new ResourceNotFoundException("One or more TODO proposals do not belong to this analysis");
        }

        int created = 0;
        for (TodoProposal proposal : proposals) {
            AnalysisFinding finding = proposal.getFinding();
            if (!isFindingAccepted(analysisId, finding.getFindingKey())) {
                throw new IllegalArgumentException("Finding is no longer approved: " + finding.getFindingKey());
            }
            if (proposal.getStatus() == TodoProposalStatus.CONFIRMED || todoRepository.existsByOriginFindingFindingId(finding.getFindingId())) {
                continue;
            }
            todoRepository.save(Todo.builder()
                    .analysis(analysis)
                    .originFinding(finding)
                    .title(proposal.getTitle())
                    .description(proposal.getDescription())
                    .priority(proposal.getPriority())
                    .status(TodoStatus.OPEN)
                    .filePath(finding.getFilePath())
                    .lineNumber(finding.getLineStart())
                    .build());
            proposal.setStatus(TodoProposalStatus.CONFIRMED);
            proposal.setConfirmedAt(LocalDateTime.now());
            created++;
        }
        return created;
    }

    private void createMissingProposals(Analysis analysis, List<AnalysisFinding> findings, User user) {
        JsonNode generated = aiRagClient.generateTodoProposals(new AiTodoProposalRequest(
                analysis.getAnalysisId(), analysis.getProject().getProjectId(), user.getId(), UUID.randomUUID().toString(),
                new AiRepositoryScope(analysis.getRepository().getRepoId(), analysis.getRepository().getUrl(), analysis.getRepository().getBranch()),
                findings.stream().map(finding -> new AiApprovedFinding(finding.getAgent(),
                        new AiFinding(finding.getTitle(), finding.getSeverity().name(), finding.getConfidence(), finding.getEvidence(),
                                finding.getRecommendation(), new AiFindingLocation(finding.getFilePath(), finding.getLineStart()), List.of()), user.getId()))
                        .toList())).results().path("todo").path("todo_proposals");
        if (!generated.isArray() || generated.size() != findings.size()) {
            throw new IllegalArgumentException("The IA TODO agent returned an invalid proposal set");
        }

        for (int index = 0; index < findings.size(); index++) {
            AnalysisFinding finding = findings.get(index);
            JsonNode proposal = generated.get(index);
            todoProposalRepository.save(TodoProposal.builder()
                    .analysis(analysis)
                    .finding(finding)
                    .title(proposal.path("title").asText(finding.getTitle()))
                    .description(proposal.path("description").asText(finding.getRecommendation()))
                    .priority(parsePriority(proposal.path("priority").asText(finding.getSeverity().name())))
                    .status(TodoProposalStatus.PENDING_CONFIRMATION)
                    .generatedBy(user)
                    .build());
        }
    }

    private List<AnalysisFinding> approvedFindings(Long analysisId) {
        return findingRepository.findByAnalysisAnalysisId(analysisId).stream()
                .filter(finding -> isFindingAccepted(analysisId, finding.getFindingKey()))
                .toList();
    }

    private boolean isFindingAccepted(Long analysisId, String findingKey) {
        return reviewRepository.findByAnalysisAnalysisIdAndFindingKey(analysisId, findingKey)
                .map(Review::getStatus)
                .filter(ReviewStatus.ACCEPTED::equals)
                .isPresent();
    }

    private Analysis findRepositoryBackedAnalysis(Long analysisId) {
        Analysis analysis = analysisRepository.findById(analysisId)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis not found"));
        if (analysis.getRepository() == null) {
            throw new IllegalArgumentException("TODO proposals require a repository-backed analysis");
        }
        return analysis;
    }

    private void ensureManager(Analysis analysis) {
        User user = currentUserProvider.getCurrentUser();
        if (currentUserProvider.isAdmin(user)) {
            return;
        }
        if ((currentUserProvider.hasRole(user, Role.QA) || currentUserProvider.hasRole(user, Role.MANAGER))
                && canAccessProject(user, analysis.getProject())) return;
        throw new AccessDeniedException("You are not allowed to confirm TODO proposals");
    }

    private boolean canAccessProject(User user, Project project) {
        return project != null && project.getTeam() != null && project.getTeam().getUsers() != null
                && project.getTeam().getUsers().stream().anyMatch(member -> member.getId().equals(user.getId()));
    }

    private Priority parsePriority(String value) {
        try {
            return Priority.valueOf(value);
        } catch (IllegalArgumentException exception) {
            return Priority.MEDIUM;
        }
    }

    private TodoProposalResponse toResponse(TodoProposal proposal) {
        AnalysisFinding finding = proposal.getFinding();
        return TodoProposalResponse.builder()
                .id(proposal.getProposalId())
                .findingKey(finding.getFindingKey())
                .agent(finding.getAgent())
                .title(proposal.getTitle())
                .description(proposal.getDescription())
                .priority(proposal.getPriority())
                .filePath(finding.getFilePath())
                .lineStart(finding.getLineStart())
                .status(proposal.getStatus())
                .createdAt(proposal.getCreatedAt())
                .build();
    }
}
