package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AnalysisSearchRequest;
import org.example.copilote.dto.Request.PageQueryRequest;
import org.example.copilote.dto.Request.ReviewSearchRequest;
import org.example.copilote.dto.Request.TodoSearchRequest;
import org.example.copilote.dto.Response.AnalysisSummaryResponse;
import org.example.copilote.dto.Response.DashboardAnalysisResponse;
import org.example.copilote.dto.Response.DashboardOverviewResponse;
import org.example.copilote.dto.Response.DashboardProjectResponse;
import org.example.copilote.dto.Response.DashboardRecommendationResponse;
import org.example.copilote.dto.Response.DashboardStatsResponse;
import org.example.copilote.dto.Response.DocumentSummaryResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.dto.Response.RepositorySummaryResponse;
import org.example.copilote.dto.Response.ReviewSummaryResponse;
import org.example.copilote.dto.Response.TeamSummaryResponse;
import org.example.copilote.dto.Response.TodoSummaryResponse;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.entity.Document;
import org.example.copilote.entity.Priority;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Review;
import org.example.copilote.entity.ReviewStatus;
import org.example.copilote.entity.Team;
import org.example.copilote.entity.Todo;
import org.example.copilote.entity.TodoStatus;
import org.example.copilote.repository.AnalysisRepository;
import org.example.copilote.repository.DocumentRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.repository.RepositoryRepository;
import org.example.copilote.repository.ReviewRepository;
import org.example.copilote.repository.TeamRepository;
import org.example.copilote.repository.TodoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceReadService {

    private static final int DASHBOARD_PAGE_SIZE = 5;

    private static final Set<String> TEAM_SORT_FIELDS = Set.of("teamId", "teamName", "createdAt", "updatedAt");
    private static final Set<String> PROJECT_SORT_FIELDS = Set.of("projectId", "title", "status", "createdAt", "updatedAt");
    private static final Set<String> REPOSITORY_SORT_FIELDS = Set.of("repoId", "name", "technology", "provider", "branch", "createdAt", "updatedAt");
    private static final Set<String> DOCUMENT_SORT_FIELDS = Set.of("docId", "title", "type", "source", "createdAt", "updatedAt");
    private static final Set<String> ANALYSIS_SORT_FIELDS = Set.of("analysisId", "type", "status", "score", "createdAt", "updatedAt");
    private static final Set<String> REVIEW_SORT_FIELDS = Set.of("reviewId", "reviewer", "status", "score", "createdAt", "updatedAt");
    private static final Set<String> TODO_SORT_FIELDS = Set.of("todoId", "title", "priority", "status", "createdAt", "updatedAt");

    private static final Map<String, String> TEAM_SORT_ALIASES = Map.of("id", "teamId", "name", "teamName");
    private static final Map<String, String> PROJECT_SORT_ALIASES = Map.of("id", "projectId", "name", "title");
    private static final Map<String, String> REPOSITORY_SORT_ALIASES = Map.of("id", "repoId");
    private static final Map<String, String> DOCUMENT_SORT_ALIASES = Map.of("id", "docId");
    private static final Map<String, String> ANALYSIS_SORT_ALIASES = Map.of("id", "analysisId");
    private static final Map<String, String> REVIEW_SORT_ALIASES = Map.of("id", "reviewId");
    private static final Map<String, String> TODO_SORT_ALIASES = Map.of("id", "todoId");

    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final RepositoryRepository repositoryRepository;
    private final DocumentRepository documentRepository;
    private final AnalysisRepository analysisRepository;
    private final ReviewRepository reviewRepository;
    private final TodoRepository todoRepository;

    public DashboardOverviewResponse getDashboardOverview() {
        long projects = projectRepository.count();
        long repositories = repositoryRepository.count();
        long documents = documentRepository.count();
        long analyses = analysisRepository.count();
        long openTodos = todoRepository.findByStatus(TodoStatus.OPEN).size() + todoRepository.findByStatus(TodoStatus.IN_PROGRESS).size();

        Page<Project> recentProjects = projectRepository.findAll(
                buildPageable(0, DASHBOARD_PAGE_SIZE, "updatedAt", "desc", PROJECT_SORT_FIELDS, PROJECT_SORT_ALIASES)
        );

        Page<Analysis> recentAnalyses = analysisRepository.findAll(
                buildPageable(0, DASHBOARD_PAGE_SIZE, "createdAt", "desc", ANALYSIS_SORT_FIELDS, ANALYSIS_SORT_ALIASES)
        );

        return DashboardOverviewResponse.builder()
                .stats(DashboardStatsResponse.builder()
                        .projects(projects)
                        .repositories(repositories)
                        .documents(documents)
                        .analyses(analyses)
                        .openTodos(openTodos)
                        .build())
                .recentProjects(recentProjects.getContent().stream().map(this::mapDashboardProject).toList())
                .recentAnalyses(recentAnalyses.getContent().stream().map(this::mapDashboardAnalysis).toList())
                .aiRecommendations(buildRecommendations())
                .build();
    }

    public PagedResponse<TeamSummaryResponse> getTeams(PageQueryRequest request) {
        Pageable pageable = buildPageable(request, TEAM_SORT_FIELDS, TEAM_SORT_ALIASES, "createdAt");
        String sortBy = resolveSortBy(request.getSortBy(), TEAM_SORT_FIELDS, TEAM_SORT_ALIASES, "createdAt");
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Page<Team> page = teamRepository.findAll(pageable);
        return buildPagedResponse(page, this::mapTeam, sortBy, sortDirection);
    }

    public PagedResponse<ProjectSummaryResponse> getProjects(PageQueryRequest request) {
        Pageable pageable = buildPageable(request, PROJECT_SORT_FIELDS, PROJECT_SORT_ALIASES, "updatedAt");
        String sortBy = resolveSortBy(request.getSortBy(), PROJECT_SORT_FIELDS, PROJECT_SORT_ALIASES, "updatedAt");
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Page<Project> page = projectRepository.findAll(pageable);
        return buildPagedResponse(page, this::mapProject, sortBy, sortDirection);
    }

    public PagedResponse<RepositorySummaryResponse> getRepositories(PageQueryRequest request) {
        Pageable pageable = buildPageable(request, REPOSITORY_SORT_FIELDS, REPOSITORY_SORT_ALIASES, "updatedAt");
        String sortBy = resolveSortBy(request.getSortBy(), REPOSITORY_SORT_FIELDS, REPOSITORY_SORT_ALIASES, "updatedAt");
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Page<org.example.copilote.entity.Repository> page = repositoryRepository.findAll(pageable);
        return buildPagedResponse(page, this::mapRepository, sortBy, sortDirection);
    }

    public PagedResponse<DocumentSummaryResponse> getDocuments(PageQueryRequest request) {
        Pageable pageable = buildPageable(request, DOCUMENT_SORT_FIELDS, DOCUMENT_SORT_ALIASES, "updatedAt");
        String sortBy = resolveSortBy(request.getSortBy(), DOCUMENT_SORT_FIELDS, DOCUMENT_SORT_ALIASES, "updatedAt");
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Page<Document> page = documentRepository.findAll(pageable);
        return buildPagedResponse(page, this::mapDocument, sortBy, sortDirection);
    }

    public PagedResponse<AnalysisSummaryResponse> getAnalyses(AnalysisSearchRequest request) {
        Pageable pageable = buildPageable(request, ANALYSIS_SORT_FIELDS, ANALYSIS_SORT_ALIASES, "createdAt");
        String sortBy = resolveSortBy(request.getSortBy(), ANALYSIS_SORT_FIELDS, ANALYSIS_SORT_ALIASES, "createdAt");
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Page<Analysis> page;
        if (request.getStatus() != null && request.getType() != null) {
            page = analysisRepository.findByStatusAndType(request.getStatus(), request.getType(), pageable);
        } else if (request.getStatus() != null) {
            page = analysisRepository.findByStatus(request.getStatus(), pageable);
        } else if (request.getType() != null) {
            page = analysisRepository.findByType(request.getType(), pageable);
        } else {
            page = analysisRepository.findAll(pageable);
        }

        return buildPagedResponse(page, this::mapAnalysis, sortBy, sortDirection);
    }

    public PagedResponse<ReviewSummaryResponse> getReviews(ReviewSearchRequest request) {
        Pageable pageable = buildPageable(request, REVIEW_SORT_FIELDS, REVIEW_SORT_ALIASES, "createdAt");
        String sortBy = resolveSortBy(request.getSortBy(), REVIEW_SORT_FIELDS, REVIEW_SORT_ALIASES, "createdAt");
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Page<Review> page = request.getStatus() == null
                ? reviewRepository.findAll(pageable)
                : reviewRepository.findByStatus(request.getStatus(), pageable);

        return buildPagedResponse(page, this::mapReview, sortBy, sortDirection);
    }

    public PagedResponse<TodoSummaryResponse> getTodos(TodoSearchRequest request) {
        Pageable pageable = buildPageable(request, TODO_SORT_FIELDS, TODO_SORT_ALIASES, "createdAt");
        String sortBy = resolveSortBy(request.getSortBy(), TODO_SORT_FIELDS, TODO_SORT_ALIASES, "createdAt");
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Page<Todo> page = request.getStatus() == null
                ? todoRepository.findAll(pageable)
                : todoRepository.findByStatus(request.getStatus(), pageable);

        return buildPagedResponse(page, this::mapTodo, sortBy, sortDirection);
    }

    private TeamSummaryResponse mapTeam(Team team) {
        return TeamSummaryResponse.builder()
                .id(team.getTeamId())
                .teamId(team.getTeamId())
                .name(team.getTeamName())
                .teamName(team.getTeamName())
                .description(team.getDescription())
                .projectCount(safeSize(team.getProjects()))
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }

    private ProjectSummaryResponse mapProject(Project project) {
        return ProjectSummaryResponse.builder()
                .id(project.getProjectId())
                .projectId(project.getProjectId())
                .title(project.getTitle())
                .status(project.getStatus().name())
                .teamName(project.getTeam() != null ? project.getTeam().getTeamName() : null)
                .repositoryCount(safeSize(project.getRepositories()))
                .documentCount(safeSize(project.getDocuments()))
                .todoCount(countOpenTodos(project))
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private RepositorySummaryResponse mapRepository(org.example.copilote.entity.Repository repository) {
        return RepositorySummaryResponse.builder()
                .id(repository.getRepoId())
                .repoId(repository.getRepoId())
                .name(repository.getName())
                .url(repository.getUrl())
                .technology(repository.getTechnology())
                .provider(repository.getProvider())
                .branch(repository.getBranch())
                .projectId(repository.getProject() != null ? repository.getProject().getProjectId() : null)
                .projectTitle(repository.getProject() != null ? repository.getProject().getTitle() : null)
                .createdAt(repository.getCreatedAt())
                .updatedAt(repository.getUpdatedAt())
                .build();
    }

    private DocumentSummaryResponse mapDocument(Document document) {
        return DocumentSummaryResponse.builder()
                .id(document.getDocId())
                .docId(document.getDocId())
                .title(document.getTitle())
                .description(document.getDescription())
                .type(document.getType().name())
                .path(document.getPath())
                .source(document.getSource())
                .projectId(document.getProject() != null ? document.getProject().getProjectId() : null)
                .projectTitle(document.getProject() != null ? document.getProject().getTitle() : null)
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }

    private AnalysisSummaryResponse mapAnalysis(Analysis analysis) {
        return AnalysisSummaryResponse.builder()
                .id(analysis.getAnalysisId())
                .analysisId(analysis.getAnalysisId())
                .type(analysis.getType().name())
                .status(analysis.getStatus().name())
                .summary(analysis.getSummary())
                .score(analysis.getScore())
                .projectId(analysis.getProject() != null ? analysis.getProject().getProjectId() : null)
                .projectTitle(analysis.getProject() != null ? analysis.getProject().getTitle() : null)
                .todoCount(safeSize(analysis.getTodos()))
                .reviewCount(safeSize(analysis.getReviews()))
                .createdAt(analysis.getCreatedAt())
                .updatedAt(analysis.getUpdatedAt())
                .build();
    }

    private ReviewSummaryResponse mapReview(Review review) {
        return ReviewSummaryResponse.builder()
                .id(review.getReviewId())
                .reviewId(review.getReviewId())
                .reviewer(review.getReviewer())
                .comment(review.getComment())
                .score(review.getScore())
                .status(review.getStatus().name())
                .analysisId(review.getAnalysis() != null ? review.getAnalysis().getAnalysisId() : null)
                .analysisType(review.getAnalysis() != null ? review.getAnalysis().getType().name() : null)
                .projectTitle(review.getAnalysis() != null && review.getAnalysis().getProject() != null
                        ? review.getAnalysis().getProject().getTitle()
                        : null)
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private TodoSummaryResponse mapTodo(Todo todo) {
        return TodoSummaryResponse.builder()
                .id(todo.getTodoId())
                .todoId(todo.getTodoId())
                .title(todo.getTitle())
                .description(todo.getDescription())
                .priority(todo.getPriority().name())
                .status(todo.getStatus().name())
                .filePath(todo.getFilePath())
                .lineNumber(todo.getLineNumber())
                .analysisId(todo.getAnalysis() != null ? todo.getAnalysis().getAnalysisId() : null)
                .analysisType(todo.getAnalysis() != null ? todo.getAnalysis().getType().name() : null)
                .projectTitle(todo.getAnalysis() != null && todo.getAnalysis().getProject() != null
                        ? todo.getAnalysis().getProject().getTitle()
                        : null)
                .createdAt(todo.getCreatedAt())
                .updatedAt(todo.getUpdatedAt())
                .build();
    }

    private DashboardProjectResponse mapDashboardProject(Project project) {
        return DashboardProjectResponse.builder()
                .id(project.getProjectId())
                .title(project.getTitle())
                .status(project.getStatus().name())
                .repositoryCount(safeSize(project.getRepositories()))
                .lastUpdated(toIsoValue(project.getUpdatedAt() != null ? project.getUpdatedAt() : project.getCreatedAt()))
                .teamName(project.getTeam() != null ? project.getTeam().getTeamName() : null)
                .build();
    }

    private DashboardAnalysisResponse mapDashboardAnalysis(Analysis analysis) {
        return DashboardAnalysisResponse.builder()
                .id(analysis.getAnalysisId())
                .projectTitle(analysis.getProject() != null ? analysis.getProject().getTitle() : "Workspace analysis")
                .type(analysis.getType().name())
                .status(analysis.getStatus().name())
                .createdAt(toIsoValue(analysis.getCreatedAt()))
                .score(analysis.getScore())
                .build();
    }

    private List<DashboardRecommendationResponse> buildRecommendations() {
        List<DashboardRecommendationResponse> failedAnalysisRecommendations = analysisRepository.findByStatus(AnalysisStatus.FAILED)
                .stream()
                .limit(2)
                .map(analysis -> DashboardRecommendationResponse.builder()
                        .id("analysis-" + analysis.getAnalysisId())
                        .title("Recover failed analysis")
                        .description("Re-run the " + analysis.getType().name().toLowerCase() + " workflow for "
                                + resolveProjectTitle(analysis.getProject()) + ".")
                        .priority("High")
                        .build())
                .toList();

        List<DashboardRecommendationResponse> todoRecommendations = todoRepository.findAll(
                        buildPageable(0, DASHBOARD_PAGE_SIZE, "createdAt", "desc", TODO_SORT_FIELDS, TODO_SORT_ALIASES)
                )
                .getContent()
                .stream()
                .filter(todo -> todo.getStatus() == TodoStatus.OPEN || todo.getStatus() == TodoStatus.IN_PROGRESS)
                .filter(todo -> todo.getPriority() == Priority.CRITICAL || todo.getPriority() == Priority.HIGH)
                .limit(2)
                .map(todo -> DashboardRecommendationResponse.builder()
                        .id("todo-" + todo.getTodoId())
                        .title("Address priority remediation")
                        .description("Resolve " + todo.getPriority().name().toLowerCase() + " todo \"" + todo.getTitle()
                                + "\" in " + resolveProjectTitle(todo.getAnalysis() != null ? todo.getAnalysis().getProject() : null) + ".")
                        .priority(todo.getPriority() == Priority.CRITICAL ? "High" : "Medium")
                        .build())
                .toList();

        List<DashboardRecommendationResponse> pendingReviewRecommendations = reviewRepository.findByStatus(ReviewStatus.PENDING)
                .stream()
                .limit(1)
                .map(review -> DashboardRecommendationResponse.builder()
                        .id("review-" + review.getReviewId())
                        .title("Close pending review")
                        .description("Reviewer " + review.getReviewer() + " still has an open review for "
                                + resolveProjectTitle(review.getAnalysis() != null ? review.getAnalysis().getProject() : null) + ".")
                        .priority("Medium")
                        .build())
                .toList();

        return List.of(failedAnalysisRecommendations, todoRecommendations, pendingReviewRecommendations)
                .stream()
                .flatMap(List::stream)
                .limit(DASHBOARD_PAGE_SIZE)
                .toList();
    }

    private Pageable buildPageable(
            PageQueryRequest request,
            Set<String> allowedSortFields,
            Map<String, String> sortAliases,
            String defaultSortBy
    ) {
        return buildPageable(
                request.getPage(),
                request.getSize(),
                request.getSortBy(),
                request.getSortDirection(),
                allowedSortFields,
                sortAliases,
                defaultSortBy
        );
    }

    private Pageable buildPageable(
            int page,
            int size,
            String sortBy,
            String sortDirection,
            Set<String> allowedSortFields,
            Map<String, String> sortAliases
    ) {
        return buildPageable(page, size, sortBy, sortDirection, allowedSortFields, sortAliases, "createdAt");
    }

    private Pageable buildPageable(
            int page,
            int size,
            String sortBy,
            String sortDirection,
            Set<String> allowedSortFields,
            Map<String, String> sortAliases,
            String defaultSortBy
    ) {
        String resolvedSortBy = resolveSortBy(sortBy, allowedSortFields, sortAliases, defaultSortBy);
        Sort.Direction resolvedSortDirection = resolveSortDirection(sortDirection);
        return PageRequest.of(page, size, Sort.by(resolvedSortDirection, resolvedSortBy));
    }

    private String resolveSortBy(
            String sortBy,
            Set<String> allowedSortFields,
            Map<String, String> sortAliases,
            String defaultSortBy
    ) {
        String normalizedSortBy = StringUtils.hasText(sortBy) ? sortBy.trim() : defaultSortBy;
        normalizedSortBy = sortAliases.getOrDefault(normalizedSortBy, normalizedSortBy);

        if (!allowedSortFields.contains(normalizedSortBy)) {
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

    private <T, R> PagedResponse<R> buildPagedResponse(
            Page<T> page,
            Function<T, R> mapper,
            String sortBy,
            Sort.Direction sortDirection
    ) {
        return PagedResponse.<R>builder()
                .content(page.getContent().stream().map(mapper).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    private long countOpenTodos(Project project) {
        if (project.getAnalyses() == null) {
            return 0;
        }

        return project.getAnalyses()
                .stream()
                .flatMap(analysis -> analysis.getTodos().stream())
                .filter(todo -> todo.getStatus() == TodoStatus.OPEN || todo.getStatus() == TodoStatus.IN_PROGRESS)
                .count();
    }

    private int safeSize(List<?> items) {
        return items == null ? 0 : items.size();
    }

    private String resolveProjectTitle(Project project) {
        return project == null || !StringUtils.hasText(project.getTitle()) ? "the workspace" : project.getTitle();
    }

    private String toIsoValue(LocalDateTime value) {
        return value == null ? "" : value.toString();
    }
}
