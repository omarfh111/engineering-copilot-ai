package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateDocumentRequest;
import org.example.copilote.dto.Request.DocumentSearchRequest;
import org.example.copilote.dto.Request.UpdateDocumentRequest;
import org.example.copilote.dto.Response.DocumentResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.entity.Document;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.exception.DuplicateResourceException;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.DocumentRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.DocumentService;
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
public class DocumentServiceImpl implements DocumentService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "docId",
            "title",
            "type",
            "path",
            "source",
            "createdAt",
            "updatedAt"
    );

    private final DocumentRepository documentRepository;
    private final ProjectRepository projectRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> getAllDocuments(DocumentSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new DocumentSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(sortDirection, sortBy)
        );

        Specification<Document> specification = buildSpecification(request, currentUser);
        Page<Document> documentPage = documentRepository.findAll(specification, pageable);

        List<DocumentResponse> content = documentPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return PagedResponse.<DocumentResponse>builder()
                .content(content)
                .page(documentPage.getNumber())
                .size(documentPage.getSize())
                .totalElements(documentPage.getTotalElements())
                .totalPages(documentPage.getTotalPages())
                .first(documentPage.isFirst())
                .last(documentPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    public DocumentResponse createDocument(CreateDocumentRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        String title = safeTrim(request.getTitle());
        String description = safeTrim(request.getDescription());
        String path = safeTrim(request.getPath());
        String source = safeTrim(request.getSource());

        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Document title is required");
        }

        Project project = findProjectById(request.getProjectId());

        if (documentRepository.existsByTitleAndProjectProjectId(title, project.getProjectId())) {
            throw new DuplicateResourceException("Document title already exists in this project");
        }

        Document document = Document.builder()
                .title(title)
                .description(description)
                .type(request.getType())
                .path(path)
                .source(source)
                .project(project)
                .build();

        return mapToResponse(documentRepository.save(document));
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse getDocumentById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Document document = findDocumentById(id);

        if (!canAccessProject(currentUser, document.getProject())) {
            throw new AccessDeniedException("You are not allowed to access this document");
        }

        return mapToResponse(document);
    }

    @Override
    public DocumentResponse updateDocument(Long id, UpdateDocumentRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Document document = findDocumentById(id);
        String title = safeTrim(request.getTitle());
        String description = safeTrim(request.getDescription());
        String path = safeTrim(request.getPath());
        String source = safeTrim(request.getSource());

        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Document title is required");
        }

        Project project = findProjectById(request.getProjectId());

        if (documentRepository.existsByTitleAndProjectProjectIdAndDocIdNot(title, project.getProjectId(), id)) {
            throw new DuplicateResourceException("Document title already exists in this project");
        }

        document.setTitle(title);
        document.setDescription(description);
        document.setType(request.getType());
        document.setPath(path);
        document.setSource(source);
        document.setProject(project);

        return mapToResponse(documentRepository.save(document));
    }

    @Override
    public void deleteDocument(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Document document = findDocumentById(id);
        documentRepository.delete(document);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocumentsByProjectId(Long projectId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(projectId);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access documents for this project");
        }

        return documentRepository.findByProjectProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(Document::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    private Specification<Document> buildSpecification(DocumentSearchRequest request, User currentUser) {
        Specification<Document> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            Specification<Document> searchSpec = (root, query, criteriaBuilder) -> {
                var projectJoin = root.join("project", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("source")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("path")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(projectJoin.get("title")), normalizedSearch)
                );
            };

            specification = specification.and(searchSpec);
        }

        if (request != null && request.getType() != null) {
            Specification<Document> typeSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("type"), request.getType());

            specification = specification.and(typeSpec);
        }

        if (request != null && request.getProjectId() != null) {
            Specification<Document> projectSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("project").get("projectId"), request.getProjectId());

            specification = specification.and(projectSpec);
        }

        if (!currentUserProvider.isAdmin(currentUser) && !currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
            Specification<Document> accessSpec = (root, query, criteriaBuilder) -> {
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

    private Document findDocumentById(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
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
            return "docId";
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

    private DocumentResponse mapToResponse(Document document) {
        return DocumentResponse.builder()
                .id(document.getDocId())
                .title(document.getTitle())
                .description(document.getDescription())
                .type(document.getType())
                .path(document.getPath())
                .source(document.getSource())
                .project(mapProjectSummary(document.getProject()))
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
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
