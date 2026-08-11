package org.example.copilote.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Immutable, server-side trace of an authenticated state-changing request. */
@Entity
@Table(name = "audit_events")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "actor_email", length = 255)
    private String actorEmail;

    @Column(nullable = false, length = 16)
    private String action;

    @Column(name = "request_path", nullable = false, length = 512)
    private String requestPath;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "http_status", nullable = false)
    private Integer httpStatus;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
