package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateDocumentRequest;
import org.example.copilote.dto.Request.DocumentSearchRequest;
import org.example.copilote.dto.Request.UpdateDocumentRequest;
import org.example.copilote.dto.Response.DocumentResponse;
import org.example.copilote.dto.Response.DocumentFileResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.client.AiRagClient;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

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
    private final AiRagClient aiRagClient;

    @Value("${app.document-storage.location:./storage/documents}")
    private String documentStorageLocation;

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
    public DocumentResponse createDocumentWithFile(CreateDocumentRequest request, MultipartFile file) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A non-empty document file is required");
        }

        String title = safeTrim(request.getTitle());
        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Document title is required");
        }
        Project project = findProjectById(request.getProjectId());
        if (documentRepository.existsByTitleAndProjectProjectId(title, project.getProjectId())) {
            throw new DuplicateResourceException("Document title already exists in this project");
        }

        String filename = StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "document" : file.getOriginalFilename());
        String storedPath = storeUploadedFile(project.getProjectId(), filename, file);
        try {
            Document document = Document.builder()
                    .title(title)
                    .description(safeTrim(request.getDescription()))
                    .type(request.getType())
                    .path(storedPath)
                    .source(StringUtils.hasText(safeTrim(request.getSource())) ? safeTrim(request.getSource()) : filename)
                    .project(project)
                    .build();
            document = documentRepository.save(document);
            aiRagClient.ingestDocument(filename, file.getBytes(), project.getProjectId(), document.getDocId());
            return mapToResponse(document);
        } catch (IOException exception) {
            deleteStoredFile(storedPath);
            throw new IllegalArgumentException("The document file could not be read");
        } catch (RuntimeException exception) {
            deleteStoredFile(storedPath);
            throw exception;
        }
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
    @Transactional(readOnly = true)
    public DocumentFileResponse getDocumentFile(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Document document = findDocumentById(id);
        if (!canAccessProject(currentUser, document.getProject())) {
            throw new AccessDeniedException("You are not allowed to access this document");
        }
        if (!StringUtils.hasText(document.getPath())) {
            throw new ResourceNotFoundException("This document has no stored file");
        }

        try {
            Path root = Path.of(documentStorageLocation).toAbsolutePath().normalize();
            Path target = root.resolve(document.getPath()).normalize();
            if (!target.startsWith(root) || !Files.isRegularFile(target)) {
                throw new ResourceNotFoundException("The stored document file was not found");
            }
            String contentType = Files.probeContentType(target);
            return new DocumentFileResponse(
                    Files.readAllBytes(target),
                    target.getFileName().toString(),
                    contentType == null ? "application/octet-stream" : contentType
            );
        } catch (IOException exception) {
            throw new IllegalStateException("The stored document file could not be read", exception);
        }
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

    private String storeUploadedFile(Long projectId, String filename, MultipartFile file) {
        String lowerFilename = filename.toLowerCase();
        if (!(lowerFilename.endsWith(".pdf") || lowerFilename.endsWith(".docx") ||
                lowerFilename.endsWith(".txt") || lowerFilename.endsWith(".md") ||
                lowerFilename.endsWith(".html") || lowerFilename.endsWith(".htm"))) {
            throw new IllegalArgumentException("Only PDF, DOCX, TXT, MD and HTML documents are supported");
        }
        try {
            Path root = Path.of(documentStorageLocation)
                    .toAbsolutePath().normalize();
            Path directory = root.resolve("project-" + projectId).normalize();
            Files.createDirectories(directory);
            Path target = directory.resolve(UUID.randomUUID() + "-" + filename.replaceAll("[^a-zA-Z0-9._-]", "_")).normalize();
            if (!target.startsWith(root)) {
                throw new IllegalArgumentException("Invalid document file name");
            }
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return root.relativize(target).toString().replace('\\', '/');
        } catch (IOException exception) {
            throw new IllegalArgumentException("The document file could not be stored");
        }
    }

    private void deleteStoredFile(String storedPath) {
        if (!StringUtils.hasText(storedPath)) {
            return;
        }
        try {
            Path root = Path.of(documentStorageLocation)
                    .toAbsolutePath().normalize();
            Path target = root.resolve(storedPath).normalize();
            if (target.startsWith(root)) {
                Files.deleteIfExists(target);
            }
        } catch (IOException ignored) {
            // Keep the original application failure; orphan cleanup is best effort.
        }
    }
}
