package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateRepositoryRequest;
import org.example.copilote.dto.Request.RepositorySearchRequest;
import org.example.copilote.dto.Request.UpdateRepositoryRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.dto.Response.RepositoryResponse;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Repository;
import org.example.copilote.entity.User;
import org.example.copilote.exception.DuplicateResourceException;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.repository.RepositoryRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.RepositoryService;
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
public class RepositoryServiceImpl implements RepositoryService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "repoId",
            "name",
            "url",
            "technology",
            "provider",
            "branch",
            "createdAt",
            "updatedAt"
    );

    private final RepositoryRepository repositoryRepository;
    private final ProjectRepository projectRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<RepositoryResponse> getAllRepositories(RepositorySearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new RepositorySearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(sortDirection, sortBy)
        );

        Specification<Repository> specification = buildSpecification(request, currentUser);
        Page<Repository> repositoryPage = repositoryRepository.findAll(specification, pageable);

        List<RepositoryResponse> content = repositoryPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return PagedResponse.<RepositoryResponse>builder()
                .content(content)
                .page(repositoryPage.getNumber())
                .size(repositoryPage.getSize())
                .totalElements(repositoryPage.getTotalElements())
                .totalPages(repositoryPage.getTotalPages())
                .first(repositoryPage.isFirst())
                .last(repositoryPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    public RepositoryResponse createRepository(CreateRepositoryRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        String name = safeTrim(request.getName());
        String url = safeTrim(request.getUrl());
        String technology = safeTrim(request.getTechnology());

        if (!StringUtils.hasText(name)) {
            throw new IllegalArgumentException("Repository name is required");
        }

        if (!StringUtils.hasText(url)) {
            throw new IllegalArgumentException("Repository url is required");
        }

        if (repositoryRepository.existsByUrl(url)) {
            throw new DuplicateResourceException("Repository url already exists");
        }

        Project project = findProjectById(request.getProjectId());

        Repository repository = Repository.builder()
                .name(name)
                .url(url)
                .technology(technology)
                .provider(request.getProvider())
                .branch(resolveBranch(request.getBranch()))
                .project(project)
                .build();

        return mapToResponse(repositoryRepository.save(repository));
    }

    @Override
    @Transactional(readOnly = true)
    public RepositoryResponse getRepositoryById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Repository repository = findRepositoryById(id);

        if (!canAccessProject(currentUser, repository.getProject())) {
            throw new AccessDeniedException("You are not allowed to access this repository");
        }

        return mapToResponse(repository);
    }

    @Override
    public RepositoryResponse updateRepository(Long id, UpdateRepositoryRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Repository repository = findRepositoryById(id);
        String name = safeTrim(request.getName());
        String url = safeTrim(request.getUrl());
        String technology = safeTrim(request.getTechnology());

        if (!StringUtils.hasText(name)) {
            throw new IllegalArgumentException("Repository name is required");
        }

        if (!StringUtils.hasText(url)) {
            throw new IllegalArgumentException("Repository url is required");
        }

        if (repositoryRepository.existsByUrlAndRepoIdNot(url, id)) {
            throw new DuplicateResourceException("Repository url already exists");
        }

        Project project = findProjectById(request.getProjectId());

        repository.setName(name);
        repository.setUrl(url);
        repository.setTechnology(technology);
        repository.setProvider(request.getProvider());
        repository.setBranch(resolveBranch(request.getBranch()));
        repository.setProject(project);

        return mapToResponse(repositoryRepository.save(repository));
    }

    @Override
    public void deleteRepository(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Repository repository = findRepositoryById(id);
        repositoryRepository.delete(repository);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RepositoryResponse> getRepositoriesByProjectId(Long projectId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(projectId);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access repositories for this project");
        }

        return repositoryRepository.findByProjectProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(Repository::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    private Specification<Repository> buildSpecification(RepositorySearchRequest request, User currentUser) {
        Specification<Repository> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            Specification<Repository> searchSpec = (root, query, criteriaBuilder) -> {
                var projectJoin = root.join("project", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("url")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("technology")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(projectJoin.get("title")), normalizedSearch)
                );
            };

            specification = specification.and(searchSpec);
        }

        if (request != null && request.getProvider() != null) {
            Specification<Repository> providerSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("provider"), request.getProvider());

            specification = specification.and(providerSpec);
        }

        if (request != null && request.getProjectId() != null) {
            Specification<Repository> projectSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("project").get("projectId"), request.getProjectId());

            specification = specification.and(projectSpec);
        }

        if (!currentUserProvider.isAdmin(currentUser)) {
            Specification<Repository> accessSpec = (root, query, criteriaBuilder) -> {
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

    private Repository findRepositoryById(Long id) {
        return repositoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Repository not found with id: " + id));
    }

    private Project findProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
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
            return "repoId";
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

    private RepositoryResponse mapToResponse(Repository repository) {
        return RepositoryResponse.builder()
                .id(repository.getRepoId())
                .name(repository.getName())
                .url(repository.getUrl())
                .technology(repository.getTechnology())
                .provider(repository.getProvider())
                .branch(repository.getBranch())
                .project(mapProjectSummary(repository.getProject()))
                .createdAt(repository.getCreatedAt())
                .updatedAt(repository.getUpdatedAt())
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

    private String resolveBranch(String branch) {
        String normalizedBranch = safeTrim(branch);
        return StringUtils.hasText(normalizedBranch) ? normalizedBranch : "main";
    }

    private String safeTrim(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }
}
