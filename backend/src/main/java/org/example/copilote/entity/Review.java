package org.example.copilote.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"analysis_id", "finding_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewId;

    @Column(nullable = false)
    private String reviewer;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column
    private Double score;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewStatus status;

    /** Optional stable key of the individual IA finding being reviewed. */
    @Column(name = "finding_key", length = 180)
    private String findingKey;

    /** Referential link used by human-in-the-loop actions; findingKey remains a readable external identifier. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finding_id")
    private AnalysisFinding finding;

    /** Immutable authenticated author of the decision. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_user_id")
    private User reviewerUser;

    @ManyToOne
    @JoinColumn(name = "analysis_id")
    private Analysis analysis;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (status == null) {
            status = ReviewStatus.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
