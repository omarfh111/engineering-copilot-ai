package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AssistantAskRequest;
import org.example.copilote.dto.Response.AssistantAnswerResponse;
import org.example.copilote.service.AssistantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public AI-assistant endpoints.
 *
 * <p>The base path {@code /api/assistant/**} is already restricted to
 * {@code ADMIN} and {@code DEVELOPER} in {@code SecurityConfig}, so this
 * controller inherits that authorization with no security change.</p>
 *
 * <p>This is the single seam where the SAE backend calls the IA service:
 * React → Spring Boot ({@code /api/assistant/ask}) → FastAPI
 * ({@code /api/v1/rag/ask-simple}). The frontend never calls FastAPI directly.</p>
 */
@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AssistantController {

    private final AssistantService assistantService;

    @PostMapping("/ask")
    public ResponseEntity<AssistantAnswerResponse> ask(
            @Valid @RequestBody AssistantAskRequest request
    ) {
        return ResponseEntity.ok(assistantService.ask(request));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean healthy = assistantService.isAiHealthy();
        return ResponseEntity.ok(Map.of(
                "status", healthy ? "ok" : "unavailable",
                "aiService", healthy
        ));
    }
}
