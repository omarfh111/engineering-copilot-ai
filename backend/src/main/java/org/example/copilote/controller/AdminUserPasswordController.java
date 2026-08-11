package org.example.copilote.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.ResetUserPasswordRequest;
import org.example.copilote.entity.AuditLogStatus;
import org.example.copilote.entity.User;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.AuditLogService;
import org.example.copilote.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserPasswordController {

    private final UserService userService;
    private final AuditLogService auditLogService;
    private final CurrentUserProvider currentUserProvider;

    @PutMapping("/{id}/password")
    public ResponseEntity<Void> resetUserPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetUserPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        User currentUser = currentUserProvider.getCurrentUser();
        String ipAddress = AuditLogController.resolveClientIp(servletRequest);

        try {
            userService.resetUserPassword(id, request.getNewPassword());
            recordAuditSafely(currentUser, "Admin reset user password", ipAddress, AuditLogStatus.SUCCESS);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException exception) {
            recordAuditSafely(currentUser, "Admin reset user password", ipAddress, AuditLogStatus.FAILURE);
            throw exception;
        }
    }

    private void recordAuditSafely(User currentUser, String action, String ipAddress, AuditLogStatus status) {
        try {
            auditLogService.record(currentUser, action, ipAddress, status);
        } catch (RuntimeException ignored) {
            // Audit persistence must not break admin security actions.
        }
    }
}
