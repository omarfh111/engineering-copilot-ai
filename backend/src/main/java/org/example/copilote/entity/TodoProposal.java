package org.example.copilote.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** A reviewable IA suggestion. It is intentionally separate from a real Todo. */
@Entity
@Table(name = "todo_proposals", uniqueConstraints = @UniqueConstraint(columnNames = {"analysis_id", "finding_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodoProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long proposalId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "analysis_id", nullable = false)
    private Analysis analysis;

    @ManyToOne(optional = false)
    @JoinColumn(name = "finding_id", nullable = false)
    private AnalysisFinding finding;

    @Column(nullable = false, length = 220)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TodoProposalStatus status;

    @ManyToOne
    @JoinColumn(name = "generated_by")
    private User generatedBy;

    private LocalDateTime confirmedAt;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (status == null) {
            status = TodoProposalStatus.PENDING_CONFIRMATION;
        }
        if (priority == null) {
            priority = Priority.MEDIUM;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
