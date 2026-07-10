package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateReviewRequest;
import org.example.copilote.dto.Request.ReviewSearchRequest;
import org.example.copilote.dto.Request.UpdateReviewRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ReviewResponse;
import org.example.copilote.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<PagedResponse<ReviewResponse>> getReviews(@Valid @ModelAttribute ReviewSearchRequest request) {
        return ResponseEntity.ok(reviewService.getAllReviews(request));
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> createReview(@Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.createReview(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReviewResponse> getReviewById(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.getReviewById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReviewRequest request
    ) {
        return ResponseEntity.ok(reviewService.updateReview(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(reviewService.getReviewsByProject(projectId));
    }

    @GetMapping("/analysis/{analysisId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByAnalysis(@PathVariable Long analysisId) {
        return ResponseEntity.ok(reviewService.getReviewsByAnalysis(analysisId));
    }
}
