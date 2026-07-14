package org.example.copilote.service.impl;

import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateReviewRequest;
import org.example.copilote.dto.Request.ReviewSearchRequest;
import org.example.copilote.dto.Request.UpdateReviewRequest;
import org.example.copilote.dto.Response.AnalysisSummaryResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectSummaryResponse;
import org.example.copilote.dto.Response.ReviewResponse;
import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.Review;
import org.example.copilote.entity.ReviewStatus;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.AnalysisRepository;
import org.example.copilote.repository.ProjectRepository;
import org.example.copilote.repository.ReviewRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.ReviewService;
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
public class ReviewServiceImpl implements ReviewService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "reviewId",
            "reviewer",
            "score",
            "status",
            "createdAt",
            "updatedAt"
    );

    private final ReviewRepository reviewRepository;
    private final AnalysisRepository analysisRepository;
    private final ProjectRepository projectRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ReviewResponse> getAllReviews(ReviewSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (request == null) {
            request = new ReviewSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(sortDirection, sortBy));
        Page<Review> reviewPage = reviewRepository.findAll(buildSpecification(request, currentUser), pageable);

        return buildPagedResponse(reviewPage, sortBy, sortDirection);
    }

    @Override
    public ReviewResponse createReview(CreateReviewRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Analysis analysis = findAnalysisById(request.getAnalysisId());
        ensureCanManageReview(currentUser, analysis.getProject());

        Review review = Review.builder()
                .reviewer(safeTrim(request.getReviewer()))
                .comment(safeTrim(request.getComment()))
                .score(request.getScore())
                .status(request.getStatus() == null ? ReviewStatus.PENDING : request.getStatus())
                .analysis(analysis)
                .build();

        return mapToResponse(reviewRepository.save(review));
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewResponse getReviewById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Review review = findReviewById(id);

        if (!canAccessProject(currentUser, getProject(review))) {
            throw new AccessDeniedException("You are not allowed to access this review");
        }

        return mapToResponse(review);
    }

    @Override
    public ReviewResponse updateReview(Long id, UpdateReviewRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Review review = findReviewById(id);
        Analysis analysis = findAnalysisById(request.getAnalysisId());

        ensureCanUpdateReview(currentUser, review, analysis.getProject());

        review.setReviewer(safeTrim(request.getReviewer()));
        review.setComment(safeTrim(request.getComment()));
        review.setScore(request.getScore());
        review.setStatus(request.getStatus());
        review.setAnalysis(analysis);

        return mapToResponse(reviewRepository.save(review));
    }

    @Override
    public void deleteReview(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        Review review = findReviewById(id);

        ensureCanManageReview(currentUser, getProject(review));
        reviewRepository.delete(review);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByProject(Long projectId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Project project = findProjectById(projectId);

        if (!canAccessProject(currentUser, project)) {
            throw new AccessDeniedException("You are not allowed to access reviews for this project");
        }

        return reviewRepository.findByAnalysisProjectProjectId(projectId)
                .stream()
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByAnalysis(Long analysisId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Analysis analysis = findAnalysisById(analysisId);

        if (!canAccessProject(currentUser, analysis.getProject())) {
            throw new AccessDeniedException("You are not allowed to access reviews for this analysis");
        }

        return reviewRepository.findByAnalysisAnalysisId(analysisId)
                .stream()
                .sorted(Comparator.comparing(Review::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapToResponse)
                .toList();
    }

    private Specification<Review> buildSpecification(ReviewSearchRequest request, User currentUser) {
        Specification<Review> specification = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            specification = specification.and((root, query, criteriaBuilder) -> {
                var analysisJoin = root.join("analysis", JoinType.LEFT);
                var projectJoin = analysisJoin.join("project", JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("reviewer")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("comment")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(projectJoin.get("title")), normalizedSearch)
                );
            });
        }

        if (request != null && request.getStatus() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), request.getStatus()));
        }

        if (request != null && request.getAnalysisId() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("analysis").get("analysisId"), request.getAnalysisId()));
        }

        if (request != null && request.getProjectId() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("analysis").get("project").get("projectId"), request.getProjectId()));
        }

        if (!currentUserProvider.isAdmin(currentUser) && !currentUserProvider.hasRole(currentUser, Role.AUDITOR)) {
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

    private PagedResponse<ReviewResponse> buildPagedResponse(Page<Review> reviewPage, String sortBy, Sort.Direction sortDirection) {
        return PagedResponse.<ReviewResponse>builder()
                .content(reviewPage.getContent().stream().map(this::mapToResponse).toList())
                .page(reviewPage.getNumber())
                .size(reviewPage.getSize())
                .totalElements(reviewPage.getTotalElements())
                .totalPages(reviewPage.getTotalPages())
                .first(reviewPage.isFirst())
                .last(reviewPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    private void ensureCanManageReview(User currentUser, Project project) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        if (currentUserProvider.hasRole(currentUser, Role.QA) && canAccessProject(currentUser, project)) {
            return;
        }

        throw new AccessDeniedException("You are not allowed to perform this action");
    }

    private void ensureCanUpdateReview(User currentUser, Review review, Project targetProject) {
        if (currentUserProvider.isAdmin(currentUser)) {
            return;
        }

        if (currentUserProvider.hasRole(currentUser, Role.QA)
                && canAccessProject(currentUser, getProject(review))
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

    private Review findReviewById(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + id));
    }

    private Analysis findAnalysisById(Long id) {
        return analysisRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis record not found with id: " + id));
    }

    private Project findProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private Project getProject(Review review) {
        return review.getAnalysis() == null ? null : review.getAnalysis().getProject();
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }

        String normalizedSortBy = sortBy.trim();

        if ("id".equals(normalizedSortBy)) {
            return "reviewId";
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

    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getReviewId())
                .reviewId(review.getReviewId())
                .reviewer(review.getReviewer())
                .comment(review.getComment())
                .score(review.getScore())
                .status(review.getStatus())
                .analysis(mapAnalysisSummary(review.getAnalysis()))
                .project(mapProjectSummary(getProject(review)))
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
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
