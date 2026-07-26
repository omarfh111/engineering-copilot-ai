package org.example.copilote.repository;

import org.example.copilote.entity.Review;
import org.example.copilote.entity.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long>, JpaSpecificationExecutor<Review> {

    List<Review> findByStatus(ReviewStatus status);

    List<Review> findByReviewer(String reviewer);

    List<Review> findByScoreGreaterThan(Double score);

    Page<Review> findByStatus(ReviewStatus status, Pageable pageable);

    List<Review> findByAnalysisAnalysisId(Long analysisId);

    List<Review> findByAnalysisProjectProjectId(Long projectId);

    Optional<Review> findByAnalysisAnalysisIdAndFindingKey(Long analysisId, String findingKey);

    boolean existsByAnalysisAnalysisIdAndFindingKeyAndStatus(Long analysisId, String findingKey, ReviewStatus status);
}
