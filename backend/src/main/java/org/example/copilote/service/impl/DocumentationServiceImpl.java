package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateDocumentationRequest;
import org.example.copilote.dto.Request.DocumentationSearchRequest;
import org.example.copilote.dto.Request.UpdateDocumentationRequest;
import org.example.copilote.dto.Response.DocumentationResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.dto.Response.UserSummaryResponse;
import org.example.copilote.entity.Documentation;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.exception.DuplicateResourceException;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.DocumentationRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.DocumentationService;
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
public class DocumentationServiceImpl implements DocumentationService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "documentationId",
            "title",
            "type",
            "status",
            "path",
            "generatedByAI",
            "approved",
            "createdAt",
            "updatedAt"
    );

    private final DocumentationRepository documentationRepository;
    private final ProjectRepository projectRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<DocumentationResponse> getAllDocumentation(DocumentationSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new DocumentationSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(sortDirection, sortBy)
        );

        Specification<Documentation> specification = buildSpecification(request, currentUser);
        Page<Documentation> documentationPage = documentationRepository.findAll(specification, pageable);

        List<DocumentationResponse> content = documentationPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return PagedResponse.<DocumentationResponse>builder()
                .content(content)
                .page(documentationPage.getNumber())
                .size(documentationPage.getSize())
                .totalElements(documentationPage.getTotalElements())
                .totalPages(documentationPage.getTotalPages())
                .first(documentationPage.isFirst())
                .last(documentationPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    public DocumentationResponse createDocumentation(CreateDocumentationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(request.getProjectId());
        ensureCanManageDocumentation(currentUser, project);

        String title = safeTrim(request.getTitle());
        String description = safeTrim(request.getDescription());
        String content = safeTrim(request.getContent());
        String path = safeTrim(request.getPath());

        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Documentation title is required");
        }

        if (documentationRepository.existsByTitleAndProjectProjectId(title, project.getProjectId())) {
            throw new DuplicateResourceException("Documentation title already exists in this project");
        }

        Documentation documentation = Documentation.builder()
                .title(title)
                .description(description)
                .type(request.getType())
                .content(content)
                .path(path)
                .status(request.getStatus())
                .generatedByAI(request.isGeneratedByAI())
                .approved(request.isApproved())
                .project(project)
                .createdBy(currentUser)
                .build();

        return mapToResponse(documentationRepository.save(documentation));
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentationResponse getDocumentationById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Documentation documentation = findDocumentationById(id);

        if (!canAccessProject(currentUser, documentation.getProject())) {
            throw new AccessDeniedException("You are not allowed to access this documentation");
        }

        return mapToResponse(documentation);
    }

    @Override
    public DocumentationResponse updateDocumentation(Long id, UpdateDocumentationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Documentation documentation = findDocumentationById(id);
        Project project = findProjectById(request.getProjectId());
        ensureCanUpdateDocumentation(currentUser, documentation, project);

        String title = safeTrim(request.getTitle());
        String description = safeTrim(request.getDescription());
        String content = safeTrim(request.getContent());
        String path = safeTrim(request.getPath());

        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Documentation title is required");
        }

        if (documentationRepository.existsByTitleAndProjectProjectIdAndDocumentationIdNot(
                title,
                project.getProjectId(),
                id
        )) {
            throw new DuplicateResourceException("Documentation title already exists in this project");
        }

        documentation.setTitle(title);
        documentation.setDescription(description);
        documentation.setType(request.getType());
        documentation.setContent(content);
        documentation.setPath(path);
        documentation.setStatus(request.getStatus());
        documentation.setGeneratedByAI(request.isGeneratedByAI());
        documentation.setApproved(request.isApproved());
        documentation.setProject(project);

        return mapToResponse(documentationRepository.save(documentation));
    }

    @Override
    public void deleteDocumentation(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (!currentUserProvider.isAdmin(currentUser)) {
            throw new AccessDeniedException("You are not allowed to perform this action");
        }

        Documentation documentation = findDocumentationById(id);
        documentationRepository.delete(documentation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentationResponse> getDocumentationByProjectId(Long projectId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(projectId);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access documentation for this project");
        }

        return documentationRepository.findByProjectProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(Documentation::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    private Specification<Documentation> buildSpecification(DocumentationSearchRequest request, User currentUser) {
        Specification<Documentation> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            Specification<Documentation> searchSpec = (root, query, criteriaBuilder) -> {
                var projectJoin = root.join("project", JoinType.LEFT);
                var createdByJoin = root.join("createdBy", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("content")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("path")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(projectJoin.get("title")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(createdByJoin.get("username")), normalizedSearch)
                );
            };

            specification = specification.and(searchSpec);
        }

        if (request != null && request.getType() != null) {
            Specification<Documentation> typeSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("type"), request.getType());

            specification = specification.and(typeSpec);
        }

        if (request != null && request.getStatus() != null) {
            Specification<Documentation> statusSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), request.getStatus());

            specification = specification.and(statusSpec);
        }

        if (request != null && request.getProjectId() != null) {
            Specification<Documentation> projectSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("project").get("projectId"), request.getProjectId());

            specification = specification.and(projectSpec);
        }

        if (!currentUserProvider.isAdmin(currentUser) && !currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
            Specification<Documentation> accessSpec = (root, query, criteriaBuilder) -> {
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

    private Documentation findDocumentationById(Long id) {
        return documentationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documentation not found with id: " + id));
    }

    private Project findProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private void ensureCanManageDocumentation(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        if (currentUserProvider.hasRole(currentUser, Role.ARCHITECT) && canAccessProject(currentUser, project)) {
            return;
        }

        throw new AccessDeniedException("You are not allowed to perform this action");
    }

    private void ensureCanUpdateDocumentation(User currentUser, Documentation documentation, Project targetProject) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        if (currentUserProvider.hasRole(currentUser, Role.ARCHITECT)
                && canAccessProject(currentUser, documentation.getProject())
                && canAccessProject(currentUser, targetProject)) {
            return;
        }

        throw new AccessDeniedException("You are not allowed to perform this action");
    }

    private boolean canAccessProject(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser) || currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
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

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }

        String normalizedSortBy = sortBy.trim();

        if ("id".equals(normalizedSortBy)) {
            return "documentationId";
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

    private DocumentationResponse mapToResponse(Documentation documentation) {
        return DocumentationResponse.builder()
                .id(documentation.getDocumentationId())
                .title(documentation.getTitle())
                .description(documentation.getDescription())
                .type(documentation.getType())
                .content(documentation.getContent())
                .path(documentation.getPath())
                .status(documentation.getStatus())
                .generatedByAI(documentation.isGeneratedByAI())
                .approved(documentation.isApproved())
                .project(mapProjectSummary(documentation.getProject()))
                .createdBy(mapUserSummary(documentation.getCreatedBy()))
                .createdAt(documentation.getCreatedAt())
                .updatedAt(documentation.getUpdatedAt())
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

    private UserSummaryResponse mapUserSummary(User user) {
        if (user == null) {
            return null;
        }

        return UserSummaryResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
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
