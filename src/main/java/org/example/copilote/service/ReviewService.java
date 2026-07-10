package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateReviewRequest;
import org.example.copilote.dto.Request.ReviewSearchRequest;
import org.example.copilote.dto.Request.UpdateReviewRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ReviewResponse;

import java.util.List;

public interface ReviewService {

    PagedResponse<ReviewResponse> getAllReviews(ReviewSearchRequest request);

    ReviewResponse createReview(CreateReviewRequest request);

    ReviewResponse getReviewById(Long id);

    ReviewResponse updateReview(Long id, UpdateReviewRequest request);

    void deleteReview(Long id);

    List<ReviewResponse> getReviewsByProject(Long projectId);

    List<ReviewResponse> getReviewsByAnalysis(Long analysisId);
}
