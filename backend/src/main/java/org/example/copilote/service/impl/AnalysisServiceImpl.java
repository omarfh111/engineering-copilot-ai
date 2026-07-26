package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.RunAnalysisRequest;
import org.example.copilote.dto.Request.ImpactAnalysisRequest;
import org.example.copilote.dto.Request.AnalysisSearchRequest;
import org.example.copilote.dto.Request.CreateAnalysisRequest;
import org.example.copilote.dto.Request.UpdateAnalysisRequest;
import org.example.copilote.dto.Response.AnalysisResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.dto.Response.RepositorySummaryResponse;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.Repository;
import org.example.copilote.entity.RepositoryProvider;
import org.example.copilote.entity.Severity;
import org.example.copilote.entity.User;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.AnalysisRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.repository.RepositoryRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.AnalysisExecutionService;
import org.example.copilote.service.AnalysisService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AnalysisServiceImpl implements AnalysisService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "analysisId",
            "title",
            "type",
            "status",
            "summary",
            "recommendation",
            "severity",
            "score",
            "createdAt",
            "updatedAt"
    );

    private final AnalysisRepository analysisRepository;
    private final ProjectRepository projectRepository;
    private final RepositoryRepository repositoryRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AnalysisExecutionService analysisExecutionService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<AnalysisResponse> getAllAnalyses(AnalysisSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new AnalysisSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(sortDirection, sortBy)
        );

        Specification<Analysis> specification = buildSpecification(request, currentUser);
        Page<Analysis> analysisPage = analysisRepository.findAll(specification, pageable);

        List<AnalysisResponse> content = analysisPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return PagedResponse.<AnalysisResponse>builder()
                .content(content)
                .page(analysisPage.getNumber())
                .size(analysisPage.getSize())
                .totalElements(analysisPage.getTotalElements())
                .totalPages(analysisPage.getTotalPages())
                .first(analysisPage.isFirst())
                .last(analysisPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    public AnalysisResponse createAnalysis(CreateAnalysisRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(request.getProjectId());

        ensureCanManageAnalysis(currentUser, project);

        Analysis analysis = Analysis.builder()
                .title(safeTrim(request.getTitle()))
                .type(request.getAnalysisType())
                .status(request.getStatus() == null ? AnalysisStatus.PENDING : request.getStatus())
                .summary(safeTrim(request.getSummary()))
                .recommendation(safeTrim(request.getRecommendation()))
                .severity(request.getSeverity() == null ? Severity.MEDIUM : request.getSeverity())
                .score(request.getScore() != null ? request.getScore().doubleValue() : null)
                .project(project)
                .build();

        return mapToResponse(analysisRepository.save(analysis));
    }

    @Override
    public AnalysisResponse runAnalysis(RunAnalysisRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(request.getProjectId());
        Repository repository = findRepositoryById(request.getRepositoryId());

        if (!repository.getProject().getProjectId().equals(project.getProjectId())) {
            throw new IllegalArgumentException("The repository must belong to the selected project");
        }
        if (repository.getProvider() != RepositoryProvider.GITHUB) {
            throw new IllegalArgumentException("Sprint 3 repository analysis currently supports public GitHub repositories only");
        }
        ensureCanRunAnalysis(currentUser, project);

        String correlationId = UUID.randomUUID().toString();
        Analysis analysis = Analysis.builder()
                .title("Repository audit - " + repository.getName())
                .type(org.example.copilote.entity.AnalysisType.FULL_AUDIT)
                .status(AnalysisStatus.RUNNING)
                .summary("Repository analysis is running.")
                .recommendation("Results will be available when the agent run completes.")
                .severity(Severity.LOW)
                .score(0d)
                .project(project)
                .repository(repository)
                .correlationId(correlationId)
                .build();
        Analysis saved = analysisRepository.save(analysis);

        List<String> rules = request.getRules() == null ? List.of() : request.getRules().stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
        String profile = safeTrim(request.getArchitectureProfile());
        analysisExecutionService.execute(
                saved.getAnalysisId(), project.getProjectId(), repository.getRepoId(), repository.getUrl(),
                repository.getBranch(), currentUser.getId(), rules, profile,
                request.isGenerateDocumentation(), correlationId
        );
        return mapToResponse(saved);
    }

    @Override
    public AnalysisResponse runImpactAnalysis(ImpactAnalysisRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(request.getProjectId());
        Repository repository = findRepositoryById(request.getRepositoryId());
        if (!repository.getProject().getProjectId().equals(project.getProjectId())) {
            throw new IllegalArgumentException("The repository must belong to the selected project");
        }
        if (repository.getProvider() != RepositoryProvider.GITHUB) {
            throw new IllegalArgumentException("Impact analysis currently supports public GitHub repositories only");
        }
        ensureCanRunAnalysis(currentUser, project);
        String correlationId = UUID.randomUUID().toString();
        Analysis saved = analysisRepository.save(Analysis.builder()
                .title("Impact analysis - " + repository.getName())
                .type(org.example.copilote.entity.AnalysisType.IMPACT)
                .status(AnalysisStatus.RUNNING)
                .summary("Impact analysis is running.")
                .recommendation("Results will be available when the impact scope completes.")
                .severity(Severity.LOW).score(0d).project(project).repository(repository)
                .correlationId(correlationId).build());
        List<String> paths = request.getPaths() == null ? List.of() : request.getPaths().stream()
                .filter(StringUtils::hasText).map(String::trim).distinct().toList();
        analysisExecutionService.executeImpact(saved.getAnalysisId(), project.getProjectId(), repository.getRepoId(),
                repository.getUrl(), repository.getBranch(), currentUser.getId(),
                request.getChangeDescription().trim(), paths, correlationId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysisById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Analysis analysis = findAnalysisById(id);

        if (!canAccessProject(currentUser, analysis.getProject())) {
            throw new AccessDeniedException("You are not allowed to access this analysis");
        }

        return mapToResponse(analysis);
    }

    @Override
    public AnalysisResponse updateAnalysis(Long id, UpdateAnalysisRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Analysis analysis = findAnalysisById(id);
        Project project = findProjectById(request.getProjectId());

        ensureCanUpdateAnalysis(currentUser, analysis, project);

        analysis.setTitle(safeTrim(request.getTitle()));
        analysis.setType(request.getAnalysisType());
        analysis.setStatus(request.getStatus());
        analysis.setSummary(safeTrim(request.getSummary()));
        analysis.setRecommendation(safeTrim(request.getRecommendation()));
        analysis.setSeverity(request.getSeverity());
        analysis.setScore(request.getScore() != null ? request.getScore().doubleValue() : null);
        analysis.setProject(project);

        return mapToResponse(analysisRepository.save(analysis));
    }

    @Override
    public void deleteAnalysis(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (!currentUserProvider.isAdmin(currentUser)) {
            throw new AccessDeniedException("You are not allowed to delete analyses");
        }

        Analysis analysis = findAnalysisById(id);
        analysisRepository.delete(analysis);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnalysisResponse> getAnalysesByProject(Long projectId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(projectId);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access analyses for this project");
        }

        return analysisRepository.findByProjectProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(Analysis::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnalysisResponse> getRecentAnalyses() {
        User currentUser = currentUserProvider.getCurrentUser();

        Pageable topFive = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Analysis> specification = buildSpecification(null, currentUser);

        return analysisRepository.findAll(specification, topFive).getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private Specification<Analysis> buildSpecification(AnalysisSearchRequest request, User currentUser) {
        Specification<Analysis> specification = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            Specification<Analysis> searchSpec = (root, query, criteriaBuilder) -> {
                var projectJoin = root.join("project", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("summary")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("recommendation")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(projectJoin.get("title")), normalizedSearch)
                );
            };
            specification = specification.and(searchSpec);
        }

        if (request != null && request.getProjectId() != null) {
            Specification<Analysis> projectSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("project").get("projectId"), request.getProjectId());
            specification = specification.and(projectSpec);
        }

        if (request != null && request.getStatus() != null) {
            Specification<Analysis> statusSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), request.getStatus());
            specification = specification.and(statusSpec);
        }

        if (request != null && request.getType() != null) {
            Specification<Analysis> typeSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("type"), request.getType());
            specification = specification.and(typeSpec);
        }

        if (!currentUserProvider.isAdmin(currentUser) && !currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
            Specification<Analysis> accessSpec = (root, query, criteriaBuilder) -> {
                query.distinct(true);
                var projectJoin = root.join("project");
                var teamJoin = projectJoin.join("team");
                var usersJoin = teamJoin.join("users");
                return criteriaBuilder.equal(usersJoin.get("id"), currentUser.getId());
            };
            specification = specification.and(accessSpec);
        }

        return specification;
    }

    private void ensureCanManageAnalysis(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        if (currentUserProvider.hasRole(currentUser, Role.QA) && canAccessProject(currentUser, project)) {
            return;
        }

        throw new AccessDeniedException("You are not allowed to perform this action");
    }

    private void ensureCanUpdateAnalysis(User currentUser, Analysis analysis, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        if (currentUserProvider.hasRole(currentUser, Role.QA)
                && canAccessProject(currentUser, analysis.getProject())
                && canAccessProject(currentUser, project)) {
            return;
        }

        throw new AccessDeniedException("You are not allowed to perform this action");
    }

    private Analysis findAnalysisById(Long id) {
        return analysisRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis record not found with id: " + id));
    }

    private Project findProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private Repository findRepositoryById(Long id) {
        return repositoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found with id: " + id));
    }

    private void ensureCanRunAnalysis(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser) || currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
            return;
        }
        if ((currentUserProvider.hasRole(currentUser, Role.QA)
                || currentUserProvider.hasRole(currentUser, Role.ARCHITECT)
                || currentUserProvider.hasRole(currentUser, Role.DEVELOPER))
                && canAccessProject(currentUser, project)) {
            return;
        }
        throw new AccessDeniedException("You are not allowed to run analyses for this project");
    }

    private boolean canAccessProject(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser) || currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
            return true;
        }
        if (project == null || project.getTeam() == null || project.getTeam().getUsers() == null) {
            return false;
        }
        return project.getTeam().getUsers().stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }
        String normalizedSortBy = sortBy.trim();
        if ("id".equals(normalizedSortBy)) {
            return "analysisId";
        }
        if (!ALLOWED_SORT_FIELDS.contains(normalizedSortBy)) {
            throw new IllegalArgumentException("Invalid sortBy value: " + normalizedSortBy);
        }
        return normalizedSortBy;
    }

    private Sort.Direction resolveSortDirection(String sortDirection) {
        if (!StringUtils.hasText(sortDirection)) {
            return Sort.Direction.DESC;
        }
        return Sort.Direction.fromString(sortDirection.trim());
    }

    private AnalysisResponse mapToResponse(Analysis analysis) {
        return AnalysisResponse.builder()
                .id(analysis.getAnalysisId())
                .title(resolveAnalysisTitle(analysis))
                .summary(analysis.getSummary())
                .recommendation(analysis.getRecommendation())
                .analysisType(analysis.getType())
                .severity(analysis.getSeverity())
                .status(analysis.getStatus())
                .score(analysis.getScore() != null ? analysis.getScore().intValue() : null)
                .project(mapProjectSummary(analysis.getProject()))
                .repository(mapRepositorySummary(analysis.getRepository()))
                .correlationId(analysis.getCorrelationId())
                .agentResults(parseAgentResults(analysis.getAgentResultsJson()))
                .createdAt(analysis.getCreatedAt())
                .updatedAt(analysis.getUpdatedAt())
                .build();
    }

    private RepositorySummaryResponse mapRepositorySummary(Repository repository) {
        if (repository == null) {
            return null;
        }
        return RepositorySummaryResponse.builder()
                .id(repository.getRepoId())
                .repoId(repository.getRepoId())
                .name(repository.getName())
                .url(repository.getUrl())
                .technology(repository.getTechnology())
                .provider(repository.getProvider())
                .branch(repository.getBranch())
                .projectId(repository.getProject() == null ? null : repository.getProject().getProjectId())
                .projectTitle(repository.getProject() == null ? null : repository.getProject().getTitle())
                .createdAt(repository.getCreatedAt())
                .updatedAt(repository.getUpdatedAt())
                .build();
    }

    private JsonNode parseAgentResults(String resultsJson) {
        if (!StringUtils.hasText(resultsJson)) {
            return null;
        }
        try {
            return objectMapper.readTree(resultsJson);
        } catch (Exception exception) {
            return null;
        }
    }

    private String resolveAnalysisTitle(Analysis analysis) {
        if (StringUtils.hasText(analysis.getTitle())) {
            return analysis.getTitle();
        }

        return "Analysis " + analysis.getAnalysisId() + " - " + analysis.getType();
    }

    private ProjectSummaryResponse mapProjectSummary(Project project) {
        if (project == null) {
            return null;
        }
        return ProjectSummaryResponse.builder()
                .id(project.getProjectId())
                .projectId(project.getProjectId())
                .title(project.getTitle())
                .description(project.getDescription())
                .status(project.getStatus() == null ? null : project.getStatus().name())
                .build();
    }

    private String safeTrim(String value) {
        if (value == null) {
            return null;
        }
        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }
}
