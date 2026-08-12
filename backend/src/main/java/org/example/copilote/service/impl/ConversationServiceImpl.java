package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.ConversationSearchRequest;
import org.example.copilote.dto.Request.CreateConversationRequest;
import org.example.copilote.dto.Request.UpdateConversationRequest;
import org.example.copilote.dto.Response.ConversationResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.dto.Response.UserSummaryResponse;
import org.example.copilote.entity.Conversation;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.ConversationRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.ConversationService;
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
public class ConversationServiceImpl implements ConversationService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "conversationId",
            "question",
            "confidenceScore",
            "responseTime",
            "createdAt",
            "updatedAt"
    );

    private final ConversationRepository conversationRepository;
    private final ProjectRepository projectRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ConversationResponse> getAllConversations(ConversationSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new ConversationSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(sortDirection, sortBy));
        Page<Conversation> conversationPage = conversationRepository.findAll(buildSpecification(request, currentUser), pageable);

        return buildPagedResponse(conversationPage, sortBy, sortDirection);
    }

    @Override
    public ConversationResponse createConversation(CreateConversationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(request.getProjectId());

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to create conversations for this project");
        }

        Conversation conversation = Conversation.builder()
                .question(safeTrim(request.getQuestion()))
                .response(safeTrim(request.getResponse()))
                .confidenceScore(request.getConfidenceScore())
                .responseTime(request.getResponseTime())
                .project(project)
                .user(currentUser)
                .build();

        return mapToResponse(conversationRepository.save(conversation));
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationResponse getConversationById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Conversation conversation = findConversationById(id);

        if (!canAccessConversation(currentUser, conversation)) {
            throw new AccessDeniedException("You are not allowed to access this conversation");
        }

        return mapToResponse(conversation);
    }

    @Override
    public ConversationResponse updateConversation(Long id, UpdateConversationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Conversation conversation = findConversationById(id);
        Project project = findProjectById(request.getProjectId());

        if (!canManageConversation(currentUser, conversation) || !canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to update this conversation");
        }

        conversation.setQuestion(safeTrim(request.getQuestion()));
        conversation.setResponse(safeTrim(request.getResponse()));
        conversation.setConfidenceScore(request.getConfidenceScore());
        conversation.setResponseTime(request.getResponseTime());
        conversation.setProject(project);

        return mapToResponse(conversationRepository.save(conversation));
    }

    @Override
    public void deleteConversation(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Conversation conversation = findConversationById(id);

        if (!canManageConversation(currentUser, conversation)) {
            throw new AccessDeniedException("You are not allowed to delete this conversation");
        }

        conversationRepository.delete(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversationsByProject(Long projectId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(projectId);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access conversations for this project");
        }

        return conversationRepository.findByProjectProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(Conversation::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    private Specification<Conversation> buildSpecification(ConversationSearchRequest request, User currentUser) {
        Specification<Conversation> specification = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            specification = specification.and((root, query, criteriaBuilder) -> {
                var projectJoin = root.join("project", JoinType.LEFT);
                var userJoin = root.join("user", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("question")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("response")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(projectJoin.get("title")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(userJoin.get("username")), normalizedSearch)
                );
            });
        }

        if (request != null && request.getProjectId() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("project").get("projectId"), request.getProjectId()));
        }

        if (request != null && request.getUserId() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("user").get("id"), request.getUserId()));
        }

        if (!currentUserProvider.isAdmin(currentUser)) {
            specification = specification.and((root, query, criteriaBuilder) -> {
                query.distinct(true);

                var userJoin = root.join("user", JoinType.LEFT);
                var projectJoin = root.join("project", JoinType.LEFT);
                var teamJoin = projectJoin.join("team", JoinType.LEFT);
                var usersJoin = teamJoin.join("users", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.equal(userJoin.get("id"), currentUser.getId()),
                        criteriaBuilder.equal(usersJoin.get("id"), currentUser.getId())
                );
            });
        }

        return specification;
    }

    private PagedResponse<ConversationResponse> buildPagedResponse(
            Page<Conversation> conversationPage,
            String sortBy,
            Sort.Direction sortDirection
    ) {
        return PagedResponse.<ConversationResponse>builder()
                .content(conversationPage.getContent().stream().map(this::mapToResponse).toList())
                .page(conversationPage.getNumber())
                .size(conversationPage.getSize())
                .totalElements(conversationPage.getTotalElements())
                .totalPages(conversationPage.getTotalPages())
                .first(conversationPage.isFirst())
                .last(conversationPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    private boolean canAccessConversation(User currentUser, Conversation conversation) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return true;
        }

        if (conversation.getUser() != null && conversation.getUser().getId().equals(currentUser.getId())) {
            return true;
        }

        return canAccessProject(currentUser, conversation.getProject());
    }

    private boolean canManageConversation(User currentUser, Conversation conversation) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return true;
        }

        return conversation.getUser() != null && conversation.getUser().getId().equals(currentUser.getId());
    }

    private boolean canAccessProject(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return true;
        }

        if (currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
            return false;
        }

        if (project == null || project.getTeam() == null || project.getTeam().getUsers() == null) {
            return false;
        }

        return project.getTeam()
                .getUsers()
                .stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));
    }

    private Conversation findConversationById(Long id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + id));
    }

    private Project findProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }

        String normalizedSortBy = sortBy.trim();

        if ("id".equals(normalizedSortBy)) {
            return "conversationId";
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

    private ConversationResponse mapToResponse(Conversation conversation) {
        return ConversationResponse.builder()
                .id(conversation.getConversationId())
                .conversationId(conversation.getConversationId())
                .question(conversation.getQuestion())
                .response(conversation.getResponse())
                .confidenceScore(conversation.getConfidenceScore())
                .responseTime(conversation.getResponseTime())
                .user(mapUserSummary(conversation.getUser()))
                .project(mapProjectSummary(conversation.getProject()))
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
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
