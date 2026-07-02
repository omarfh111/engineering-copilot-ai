package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.PageQueryRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.RepositorySummaryResponse;
import org.example.copilote.service.WorkspaceReadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/repositories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RepositoryController {

    private final WorkspaceReadService workspaceReadService;

    @GetMapping
    public ResponseEntity<PagedResponse<RepositorySummaryResponse>> getRepositories(@Valid @ModelAttribute PageQueryRequest request) {
        return ResponseEntity.ok(workspaceReadService.getRepositories(request));
    }
}
