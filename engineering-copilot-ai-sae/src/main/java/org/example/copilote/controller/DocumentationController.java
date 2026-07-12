package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateDocumentationRequest;
import org.example.copilote.dto.Request.DocumentationSearchRequest;
import org.example.copilote.dto.Request.UpdateDocumentationRequest;
import org.example.copilote.dto.Response.DocumentationResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.service.DocumentationService;
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
@RequestMapping("/api/documentation")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DocumentationController {

    private final DocumentationService documentationService;

    @GetMapping
    public ResponseEntity<PagedResponse<DocumentationResponse>> getDocumentation(
            @Valid @ModelAttribute DocumentationSearchRequest request
    ) {
        return ResponseEntity.ok(documentationService.getAllDocumentation(request));
    }

    @PostMapping
    public ResponseEntity<DocumentationResponse> createDocumentation(
            @Valid @RequestBody CreateDocumentationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentationService.createDocumentation(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentationResponse> getDocumentationById(@PathVariable Long id) {
        return ResponseEntity.ok(documentationService.getDocumentationById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DocumentationResponse> updateDocumentation(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDocumentationRequest request
    ) {
        return ResponseEntity.ok(documentationService.updateDocumentation(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocumentation(@PathVariable Long id) {
        documentationService.deleteDocumentation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<DocumentationResponse>> getDocumentationByProjectId(@PathVariable Long projectId) {
        return ResponseEntity.ok(documentationService.getDocumentationByProjectId(projectId));
    }
}
