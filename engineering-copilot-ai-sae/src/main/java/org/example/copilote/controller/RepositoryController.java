package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateRepositoryRequest;
import org.example.copilote.dto.Request.RepositorySearchRequest;
import org.example.copilote.dto.Request.UpdateRepositoryRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.RepositoryResponse;
import org.example.copilote.service.RepositoryService;
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
@RequestMapping("/api/repositories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RepositoryController {

    private final RepositoryService repositoryService;

    @GetMapping
    public ResponseEntity<PagedResponse<RepositoryResponse>> getRepositories(
            @Valid @ModelAttribute RepositorySearchRequest request
    ) {
        return ResponseEntity.ok(repositoryService.getAllRepositories(request));
    }

    @PostMapping
    public ResponseEntity<RepositoryResponse> createRepository(@Valid @RequestBody CreateRepositoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(repositoryService.createRepository(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RepositoryResponse> getRepositoryById(@PathVariable Long id) {
        return ResponseEntity.ok(repositoryService.getRepositoryById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RepositoryResponse> updateRepository(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRepositoryRequest request
    ) {
        return ResponseEntity.ok(repositoryService.updateRepository(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRepository(@PathVariable Long id) {
        repositoryService.deleteRepository(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<RepositoryResponse>> getRepositoriesByProjectId(@PathVariable Long projectId) {
        return ResponseEntity.ok(repositoryService.getRepositoriesByProjectId(projectId));
    }
}
