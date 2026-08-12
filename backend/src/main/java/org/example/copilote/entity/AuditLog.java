package org.example.copilote.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private LocalDateTime timestamp;

    @Column
    private String actor;

    @Column
    private String action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column
    private String description;

    @Column
    private String ipAddress;

    @Column
    private String status;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (timestamp == null) {
            timestamp = now;
        }
        if (description == null || description.isBlank()) {
            description = action == null || action.isBlank() ? "Audit event" : action;
        }
        if (entityType == null || entityType.isBlank()) {
            entityType = "SYSTEM";
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
