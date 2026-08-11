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
        String actor = request.getEmail() == null ? "Unknown actor" : request.getEmail().trim();
        String ipAddress = AuditLogController.resolveClientIp(servletRequest);

        try {
            AuthResponse response = authService.login(request);
            auditLogService.record(actor, "Login attempt", ipAddress, AuditLogStatus.SUCCESS);
            return ResponseEntity.ok(response);
        } catch (RuntimeException exception) {
            auditLogService.record(actor, "Login attempt", ipAddress, AuditLogStatus.FAILURE);
            throw exception;
        }
    }
}
