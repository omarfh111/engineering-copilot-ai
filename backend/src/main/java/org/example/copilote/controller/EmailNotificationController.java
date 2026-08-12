package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.SendEmailNotificationRequest;
import org.example.copilote.dto.Response.EmailNotificationResponse;
import org.example.copilote.service.EmailNotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class EmailNotificationController {

    private final EmailNotificationService emailNotificationService;

    @PostMapping("/email")
    public ResponseEntity<EmailNotificationResponse> sendEmail(@Valid @RequestBody SendEmailNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(emailNotificationService.send(request));
    }
}
