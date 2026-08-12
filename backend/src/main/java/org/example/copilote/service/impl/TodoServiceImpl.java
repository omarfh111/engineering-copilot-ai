package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateTodoRequest;
import org.example.copilote.dto.Request.TodoSearchRequest;
import org.example.copilote.dto.Request.UpdateTodoRequest;
import org.example.copilote.dto.Response.AnalysisSummaryResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.dto.Response.TodoResponse;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.Todo;
import org.example.copilote.entity.TodoStatus;
import org.example.copilote.entity.User;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.AnalysisRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.repository.TodoRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.TodoService;
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

@Service
@RequiredArgsConstructor
@Transactional
public class TodoServiceImpl implements TodoService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "todoId",
            "title",
            "priority",
            "status",
            "filePath",
            "lineNumber",
            "createdAt",
            "updatedAt"
    );

    private final TodoRepository todoRepository;
    private final AnalysisRepository analysisRepository;
    private final ProjectRepository projectRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TodoResponse> getAllTodos(TodoSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new TodoSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(sortDirection, sortBy));
        Page<Todo> todoPage = todoRepository.findAll(buildSpecification(request, currentUser), pageable);

        return buildPagedResponse(todoPage, sortBy, sortDirection);
    }

    @Override
    public TodoResponse createTodo(CreateTodoRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Analysis analysis = findAnalysisById(request.getAnalysisId());
        ensureCanManageTodo(currentUser, analysis.getProject());

        Todo todo = Todo.builder()
                .title(safeTrim(request.getTitle()))
                .description(safeTrim(request.getDescription()))
                .priority(request.getPriority())
                .status(request.getStatus() == null ? TodoStatus.OPEN : request.getStatus())
                .filePath(safeTrim(request.getFilePath()))
                .lineNumber(request.getLineNumber())
                .analysis(analysis)
                .build();

        return mapToResponse(todoRepository.save(todo));
    }

    @Override
    @Transactional(readOnly = true)
    public TodoResponse getTodoById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Todo todo = findTodoById(id);

        if (!canAccessProject(currentUser, getProject(todo))) {
            throw new AccessDeniedException("You are not allowed to access this todo");
        }

        return mapToResponse(todo);
    }

    @Override
    public TodoResponse updateTodo(Long id, UpdateTodoRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Todo todo = findTodoById(id);
        Analysis analysis = findAnalysisById(request.getAnalysisId());

        ensureCanUpdateTodo(currentUser, todo, analysis.getProject());

        todo.setTitle(safeTrim(request.getTitle()));
        todo.setDescription(safeTrim(request.getDescription()));
        todo.setPriority(request.getPriority());
        todo.setStatus(request.getStatus());
        todo.setFilePath(safeTrim(request.getFilePath()));
        todo.setLineNumber(request.getLineNumber());
        todo.setAnalysis(analysis);

        return mapToResponse(todoRepository.save(todo));
    }

    @Override
    public void deleteTodo(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Todo todo = findTodoById(id);

        ensureCanManageTodo(currentUser, getProject(todo));
        todoRepository.delete(todo);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TodoResponse> getTodosByProject(Long projectId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(projectId);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access todos for this project");
        }

        return todoRepository.findByAnalysisProjectProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(Todo::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TodoResponse> getTodosByAnalysis(Long analysisId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Analysis analysis = findAnalysisById(analysisId);

        if (!canAccessProject(currentUser, analysis.getProject())) {
            throw new AccessDeniedException("You are not allowed to access todos for this analysis");
        }

        return todoRepository.findByAnalysisAnalysisId(analysisId)
                .stream()
                .sorted(Comparator.comparing(Todo::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    private Specification<Todo> buildSpecification(TodoSearchRequest request, User currentUser) {
        Specification<Todo> specification = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            specification = specification.and((root, query, criteriaBuilder) -> {
                var analysisJoin = root.join("analysis", JoinType.LEFT);
                var projectJoin = analysisJoin.join("project", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("filePath")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(projectJoin.get("title")), normalizedSearch)
                );
            });
        }

        if (request != null && request.getStatus() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), request.getStatus()));
        }

        if (request != null && request.getPriority() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("priority"), request.getPriority()));
        }

        if (request != null && request.getAnalysisId() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("analysis").get("analysisId"), request.getAnalysisId()));
        }

        if (request != null && request.getProjectId() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("analysis").get("project").get("projectId"), request.getProjectId()));
        }

        if (!currentUserProvider.isAdmin(currentUser)) {
            specification = specification.and((root, query, criteriaBuilder) -> {
                query.distinct(true);

                var analysisJoin = root.join("analysis");
                var projectJoin = analysisJoin.join("project");
                var teamJoin = projectJoin.join("team");
                var usersJoin = teamJoin.join("users");

                return criteriaBuilder.equal(usersJoin.get("id"), currentUser.getId());
            });
        }

        return specification;
    }

    private PagedResponse<TodoResponse> buildPagedResponse(Page<Todo> todoPage, String sortBy, Sort.Direction sortDirection) {
        return PagedResponse.<TodoResponse>builder()
                .content(todoPage.getContent().stream().map(this::mapToResponse).toList())
                .page(todoPage.getNumber())
                .size(todoPage.getSize())
                .totalElements(todoPage.getTotalElements())
                .totalPages(todoPage.getTotalPages())
                .first(todoPage.isFirst())
                .last(todoPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    private void ensureCanManageTodo(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        if ((currentUserProvider.hasRole(currentUser, Role.MANAGER) || currentUserProvider.hasRole(currentUser, Role.QA))
                && canAccessProject(currentUser, project)) {
            return;
        }

        throw new AccessDeniedException("You are not allowed to perform this action");
    }

    private void ensureCanUpdateTodo(User currentUser, Todo todo, Project targetProject) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        boolean canManage = currentUserProvider.hasRole(currentUser, Role.MANAGER)
                || currentUserProvider.hasRole(currentUser, Role.QA)
                || currentUserProvider.hasRole(currentUser, Role.DEVELOPER);

        if (canManage && canAccessProject(currentUser, getProject(todo)) && canAccessProject(currentUser, targetProject)) {
            return;
        }

        throw new AccessDeniedException("You are not allowed to perform this action");
    }

    private boolean canAccessProject(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return true;
        }

        if (project == null || project.getTeam() == null || project.getTeam().getUsers() == null) {
            return false;
        }

        return project.getTeam()
                .getUsers()
                .stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));
    }

    private Todo findTodoById(Long id) {
        return todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo not found with id: " + id));
    }

    private Analysis findAnalysisById(Long id) {
        return analysisRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis record not found with id: " + id));
    }

    private Project findProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private Project getProject(Todo todo) {
        return todo.getAnalysis() == null ? null : todo.getAnalysis().getProject();
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }

        String normalizedSortBy = sortBy.trim();

        if ("id".equals(normalizedSortBy)) {
            return "todoId";
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

    private TodoResponse mapToResponse(Todo todo) {
        return TodoResponse.builder()
                .id(todo.getTodoId())
                .todoId(todo.getTodoId())
                .title(todo.getTitle())
                .description(todo.getDescription())
                .priority(todo.getPriority())
                .status(todo.getStatus())
                .filePath(todo.getFilePath())
                .lineNumber(todo.getLineNumber())
                .analysis(mapAnalysisSummary(todo.getAnalysis()))
                .project(mapProjectSummary(getProject(todo)))
                .createdAt(todo.getCreatedAt())
                .updatedAt(todo.getUpdatedAt())
                .build();
    }

    private AnalysisSummaryResponse mapAnalysisSummary(Analysis analysis) {
        if (analysis == null) {
            return null;
        }

        return AnalysisSummaryResponse.builder()
                .id(analysis.getAnalysisId())
                .analysisId(analysis.getAnalysisId())
                .type(analysis.getType() == null ? null : analysis.getType().name())
                .status(analysis.getStatus() == null ? null : analysis.getStatus().name())
                .summary(analysis.getSummary())
                .score(analysis.getScore())
                .projectId(analysis.getProject() == null ? null : analysis.getProject().getProjectId())
                .projectTitle(analysis.getProject() == null ? null : analysis.getProject().getTitle())
                .todoCount(analysis.getTodos() == null ? 0 : analysis.getTodos().size())
                .reviewCount(analysis.getReviews() == null ? 0 : analysis.getReviews().size())
                .createdAt(analysis.getCreatedAt())
                .updatedAt(analysis.getUpdatedAt())
                .build();
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
