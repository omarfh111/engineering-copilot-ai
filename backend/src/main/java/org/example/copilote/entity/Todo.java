package org.example.copilote.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "todos", uniqueConstraints = @UniqueConstraint(columnNames = "origin_finding_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long todoId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TodoStatus status;

    @Column
    private String filePath;

    @Column
    private Integer lineNumber;

    @ManyToOne
    @JoinColumn(name = "analysis_id")
    private Analysis analysis;

    /** Makes confirmation idempotent and preserves the finding that caused this TODO. */
    @ManyToOne
    @JoinColumn(name = "origin_finding_id")
    private AnalysisFinding originFinding;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (status == null) {
            status = TodoStatus.OPEN;
        }

        if (priority == null) {
            priority = Priority.MEDIUM;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
