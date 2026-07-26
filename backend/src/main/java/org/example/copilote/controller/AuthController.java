package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.LoginRequest;
import org.example.copilote.dto.Request.RegisterRequest;
import org.example.copilote.dto.Response.AuthResponse;
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

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
