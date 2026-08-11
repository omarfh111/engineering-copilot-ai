package org.example.copilote.dto.Response;

import java.time.LocalDateTime;

public record AuditEventResponse(
        Long id,
        String actor,
        String action,
        String requestPath,
        String ipAddress,
        String status,
        Integer httpStatus,
        LocalDateTime timestamp
) {
}
