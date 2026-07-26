package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.ConversationSearchRequest;
import org.example.copilote.dto.Request.CreateConversationRequest;
import org.example.copilote.dto.Request.UpdateConversationRequest;
import org.example.copilote.dto.Response.ConversationResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.service.ConversationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @GetMapping
    public ResponseEntity<PagedResponse<ConversationResponse>> getConversations(
            @Valid @ModelAttribute ConversationSearchRequest request
    ) {
        return ResponseEntity.ok(conversationService.getAllConversations(request));
    }

    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(
            @Valid @RequestBody CreateConversationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(conversationService.createConversation(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationResponse> getConversationById(@PathVariable Long id) {
        return ResponseEntity.ok(conversationService.getConversationById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConversationResponse> updateConversation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateConversationRequest request
    ) {
        return ResponseEntity.ok(conversationService.updateConversation(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id) {
        conversationService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ConversationResponse>> getConversationsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(conversationService.getConversationsByProject(projectId));
    }
}
