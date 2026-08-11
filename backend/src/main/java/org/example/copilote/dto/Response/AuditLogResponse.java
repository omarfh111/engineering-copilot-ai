package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import org.example.copilote.entity.AuditLogStatus;

import java.time.LocalDateTime;

@Getter
@Builder
public class AuditLogResponse {
    private final Long id;
    private final LocalDateTime timestamp;
    private final String actor;
    private final String actorEmail;
    private final String action;
    private final String ipAddress;
    private final AuditLogStatus status;
}
