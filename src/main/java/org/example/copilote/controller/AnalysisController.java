package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AnalysisSearchRequest;
import org.example.copilote.dto.Response.AnalysisSummaryResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.service.WorkspaceReadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/analyses", "/api/analysis"})
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalysisController {

    private final WorkspaceReadService workspaceReadService;

    @GetMapping
    public ResponseEntity<PagedResponse<AnalysisSummaryResponse>> getAnalyses(@Valid @ModelAttribute AnalysisSearchRequest request) {
        return ResponseEntity.ok(workspaceReadService.getAnalyses(request));
    }
}
