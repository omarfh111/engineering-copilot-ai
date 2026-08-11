package org.example.copilote.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AuditLogSearchRequest;
import org.example.copilote.dto.Request.CreateAuditLogRequest;
import org.example.copilote.dto.Response.AuditLogResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.entity.User;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/logs")
    public ResponseEntity<PagedResponse<AuditLogResponse>> getAuditLogs(@Valid @ModelAttribute AuditLogSearchRequest request) {
        try {
            return ResponseEntity.ok(auditLogService.getAuditLogs(request));
        } catch (RuntimeException exception) {
            int page = request == null ? 0 : request.getPage();
            int size = request == null ? 20 : request.getSize();
            String sortBy = request == null || request.getSortBy() == null ? "timestamp" : request.getSortBy();
            String sortDirection = request == null || request.getSortDirection() == null ? "desc" : request.getSortDirection();

            return ResponseEntity.ok(PagedResponse.<AuditLogResponse>builder()
                    .content(java.util.List.of())
                    .page(page)
                    .size(size)
                    .totalElements(0)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .sortBy(sortBy)
                    .sortDirection(sortDirection)
                    .build());
        }
    }

    @PostMapping("/events")
    public ResponseEntity<AuditLogResponse> recordClientEvent(
            @Valid @RequestBody CreateAuditLogRequest request,
            HttpServletRequest servletRequest
    ) {
        User currentUser = currentUserProvider.getCurrentUser();
        try {
            AuditLogResponse response = auditLogService.record(
                    currentUser,
                    request.getAction(),
                    resolveClientIp(servletRequest),
                    request.getStatus()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).build();
        }
    }

    public static String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
