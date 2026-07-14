package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AnalysisSearchRequest;
import org.example.copilote.dto.Request.CreateAnalysisRequest;
import org.example.copilote.dto.Request.UpdateAnalysisRequest;
import org.example.copilote.dto.Response.AnalysisResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.service.AnalysisService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analyses")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalysisController {

    private final AnalysisService analysisService;

    @GetMapping
    public ResponseEntity<PagedResponse<AnalysisResponse>> getAllAnalyses(
            @Valid @ModelAttribute AnalysisSearchRequest request
    ) {
        return ResponseEntity.ok(analysisService.getAllAnalyses(request));
    }

    @PostMapping
    public ResponseEntity<AnalysisResponse> createAnalysis(
            @Valid @RequestBody CreateAnalysisRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(analysisService.createAnalysis(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnalysisResponse> getAnalysisById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                analysisService.getAnalysisById(id)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<AnalysisResponse> updateAnalysis(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAnalysisRequest request
    ) {
        return ResponseEntity.ok(
                analysisService.updateAnalysis(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAnalysis(
            @PathVariable Long id
    ) {
        analysisService.deleteAnalysis(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<AnalysisResponse>> getAnalysesByProject(
            @PathVariable Long projectId
    ) {
        return ResponseEntity.ok(
                analysisService.getAnalysesByProject(projectId)
        );
    }

    @GetMapping("/recent")
    public ResponseEntity<List<AnalysisResponse>> getRecentAnalyses() {
        return ResponseEntity.ok(
                analysisService.getRecentAnalyses()
        );
    }
}