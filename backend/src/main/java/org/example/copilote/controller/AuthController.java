package org.example.copilote.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.LoginRequest;
import org.example.copilote.dto.Request.RegisterRequest;
import org.example.copilote.dto.Response.AuthResponse;
import org.example.copilote.entity.AuditLogStatus;
import org.example.copilote.service.AuditLogService;
import org.example.copilote.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class
AuthController {

    private final AuthService authService;
    private final AuditLogService auditLogService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String actor = StringUtils.hasText(request.getEmail()) ? request.getEmail().trim() : null;
        String ipAddress = AuditLogController.resolveClientIp(servletRequest);

        try {
            AuthResponse response = authService.login(request);
            recordLoginAttempt(actor, "LOGIN_SUCCESS", ipAddress, AuditLogStatus.SUCCESS);
            return ResponseEntity.ok(response);
        } catch (RuntimeException exception) {
            recordLoginAttempt(actor, "LOGIN_FAILED", ipAddress, AuditLogStatus.FAILURE);
            throw exception;
        }
    }

    private void recordLoginAttempt(String actor, String action, String ipAddress, AuditLogStatus status) {
        try {
            auditLogService.record(actor, action, ipAddress, status);
        } catch (RuntimeException ignored) {
            // Audit persistence must never block authentication.
        }
    }
}
