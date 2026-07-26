package org.example.copilote.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Analysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long analysisId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisStatus status;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    @Enumerated(EnumType.STRING)
    @Column
    private Severity severity;

    @Column
    private Double score;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    /** Repository analysed during a Sprint 3 run; null for legacy manual analyses. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repo_id")
    private Repository repository;

    /** Stable identifier shared by Spring logs and the FastAPI agent execution. */
    @Column(name = "correlation_id", length = 128)
    private String correlationId;

    /** JSON returned by the IA agents. Spring owns its persistence and access control. */
    @Column(name = "agent_results_json", columnDefinition = "TEXT")
    private String agentResultsJson;

    @Builder.Default
    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Todo> todos = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Review> reviews = new ArrayList<>();

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (status == null) {
            status = AnalysisStatus.PENDING;
        }

        if (severity == null) {
            severity = Severity.MEDIUM;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
