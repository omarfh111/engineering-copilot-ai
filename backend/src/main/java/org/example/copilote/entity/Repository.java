package org.example.copilote.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "repositories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Repository {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "repo_id")
    private Long repoId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @Column(name = "technology", length = 100)
    private String technology;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private RepositoryProvider provider;

    @Builder.Default
    @Column(name = "branch", length = 100)
    private String branch = "main";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();

        if (branch == null || branch.trim().isEmpty()) {
            branch = "main";
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();

        if (branch == null || branch.trim().isEmpty()) {
            branch = "main";
        }
    }
}
