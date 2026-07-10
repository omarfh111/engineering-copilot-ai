package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateProjectRequest;
import org.example.copilote.dto.Request.ProjectSearchRequest;
import org.example.copilote.dto.Request.UpdateProjectRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectResponse;
import org.example.copilote.dto.Response.TeamSummaryResponse;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.ProjectStatus;
import org.example.copilote.entity.Team;
import org.example.copilote.entity.User;
import org.example.copilote.exception.DuplicateResourceException;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.repository.TeamRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.ProjectService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectServiceImpl implements ProjectService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "projectId",
            "title",
            "status",
            "createdAt",
            "updatedAt"
    );

    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ProjectResponse> getAllProjects(ProjectSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new ProjectSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(sortDirection, sortBy)
        );

        Specification<Project> specification = buildSpecification(request, currentUser);

        Page<Project> projectPage = projectRepository.findAll(specification, pageable);

        List<ProjectResponse> content = projectPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return PagedResponse.<ProjectResponse>builder()
                .content(content)
                .page(projectPage.getNumber())
                .size(projectPage.getSize())
                .totalElements(projectPage.getTotalElements())
                .totalPages(projectPage.getTotalPages())
                .first(projectPage.isFirst())
                .last(projectPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    public ProjectResponse createProject(CreateProjectRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        String title = safeTrim(request.getTitle());
        String description = safeTrim(request.getDescription());

        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Project title is required");
        }

        if (projectRepository.existsByTitle(title)) {
            throw new DuplicateResourceException("Project title already exists");
        }

        Team team = findTeamById(request.getTeamId());

        Project project = Project.builder()
                .title(title)
                .description(description)
                .status(request.getStatus() == null ? ProjectStatus.CREATED : request.getStatus())
                .team(team)
                .build();

        Project savedProject = projectRepository.save(project);
        return mapToResponse(savedProject);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();

        Project project = findProjectById(id);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access this project");
        }

        return mapToResponse(project);
    }

    @Override
    public ProjectResponse updateProject(Long id, UpdateProjectRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Project project = findProjectById(id);

        String title = safeTrim(request.getTitle());
        String description = safeTrim(request.getDescription());

        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Project title is required");
        }

        if (projectRepository.existsByTitleAndProjectIdNot(title, id)) {
            throw new DuplicateResourceException("Project title already exists");
        }

        Team team = findTeamById(request.getTeamId());

        project.setTitle(title);
        project.setDescription(description);
        project.setStatus(request.getStatus() == null ? ProjectStatus.CREATED : request.getStatus());
        project.setTeam(team);

        Project savedProject = projectRepository.save(project);
        return mapToResponse(savedProject);
    }

    @Override
    public void deleteProject(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Project project = findProjectById(id);
        projectRepository.delete(project);
    }

    private Specification<Project> buildSpecification(ProjectSearchRequest request, User currentUser) {
        Specification<Project> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            Specification<Project> searchSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.or(
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), normalizedSearch),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), normalizedSearch)
                    );

            specification = specification.and(searchSpec);
        }

        if (request != null && request.getStatus() != null) {
            Specification<Project> statusSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), request.getStatus());

            specification = specification.and(statusSpec);
        }

        if (request != null && request.getTeamId() != null) {
            Specification<Project> teamSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("team").get("teamId"), request.getTeamId());

            specification = specification.and(teamSpec);
        }

        /*
         * Access rule:
         * ADMIN can see all projects.
         * Other roles only see projects where they belong to the assigned team.
         */
        if (!currentUserProvider.isAdmin(currentUser)) {
            Specification<Project> accessSpec = (root, query, criteriaBuilder) -> {
                query.distinct(true);
                var teamJoin = root.join("team");
                var usersJoin = teamJoin.join("users");
                return criteriaBuilder.equal(usersJoin.get("id"), currentUser.getId());
            };

            specification = specification.and(accessSpec);
        }

        return specification;
    }

    private boolean canAccessProject(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return true;
        }

        if (project.getTeam() == null || project.getTeam().getUsers() == null) {
            return false;
        }

        return project.getTeam()
                .getUsers()
                .stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));
    }

    private Project findProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private Team findTeamById(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + id));
    }

    private void ensureAdmin(User currentUser) {
        if (!currentUserProvider.isAdmin(currentUser)) {
            throw new AccessDeniedException("You are not allowed to perform this action");
        }
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }

        String normalizedSortBy = sortBy.trim();

        if ("id".equals(normalizedSortBy)) {
            return "projectId";
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

    private ProjectResponse mapToResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getProjectId())
                .title(project.getTitle())
                .description(project.getDescription())
                .status(project.getStatus())
                .team(mapTeamSummary(project.getTeam()))
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private TeamSummaryResponse mapTeamSummary(Team team) {
        if (team == null) {
            return null;
        }

        return TeamSummaryResponse.builder()
                .id(team.getTeamId())
                .teamName(team.getTeamName())
                .description(team.getDescription())
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