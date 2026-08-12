package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AnalysisSearchRequest;
import org.example.copilote.dto.Request.CreateAnalysisRequest;
import org.example.copilote.dto.Request.UpdateAnalysisRequest;
import org.example.copilote.dto.Request.RunAnalysisRequest;
import org.example.copilote.dto.Request.ImpactAnalysisRequest;
import org.example.copilote.dto.Response.AnalysisResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.service.AnalysisService;
import org.example.copilote.service.AnalysisFindingService;
import org.example.copilote.service.ApprovedFindingTodoService;
import org.example.copilote.dto.Request.ConfirmTodoProposalsRequest;
import org.example.copilote.dto.Response.AnalysisFindingResponse;
import org.example.copilote.dto.Response.TodoProposalResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analyses")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;
    private final AnalysisFindingService analysisFindingService;
    private final ApprovedFindingTodoService approvedFindingTodoService;
    private final org.example.copilote.service.ApprovedFeedbackKnowledgeService approvedFeedbackKnowledgeService;

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

    /** Creates a tracked job and returns immediately; the agent work is asynchronous. */
    @PostMapping("/run")
    public ResponseEntity<AnalysisResponse> runAnalysis(
            @Valid @RequestBody RunAnalysisRequest request
    ) {
        return ResponseEntity.accepted().body(analysisService.runAnalysis(request));
    }

    @PostMapping("/impact")
    public ResponseEntity<AnalysisResponse> runImpactAnalysis(@Valid @RequestBody ImpactAnalysisRequest request) {
        return ResponseEntity.accepted().body(analysisService.runImpactAnalysis(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnalysisResponse> getAnalysisById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                analysisService.getAnalysisById(id)
        );
    }

    @GetMapping("/{id}/findings")
    public ResponseEntity<List<AnalysisFindingResponse>> getFindings(@PathVariable Long id) {
        return ResponseEntity.ok(analysisFindingService.getByAnalysis(id));
    }

    @GetMapping("/{id}/todo-proposals")
    public ResponseEntity<List<TodoProposalResponse>> getTodoProposals(@PathVariable Long id) {
        return ResponseEntity.ok(approvedFindingTodoService.proposals(id));
    }

    @PostMapping("/{id}/todo-proposals/confirm")
    public ResponseEntity<Integer> confirmTodoProposals(@PathVariable Long id, @Valid @RequestBody ConfirmTodoProposalsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(approvedFindingTodoService.confirm(id, request.getProposalIds()));
    }

    /** Explicitly publishes a reviewed finding; rejected or unreviewed data never reaches Qdrant. */
    @PostMapping("/{id}/findings/{findingKey}/knowledge")
    public ResponseEntity<Long> publishApprovedFeedback(@PathVariable Long id, @PathVariable String findingKey) {
        return ResponseEntity.status(HttpStatus.CREATED).body(approvedFeedbackKnowledgeService.publish(id, findingKey));
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
