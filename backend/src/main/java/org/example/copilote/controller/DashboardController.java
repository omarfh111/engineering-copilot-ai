package org.example.copilote.controller;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Response.DashboardOverviewResponse;
import org.example.copilote.service.WorkspaceReadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final WorkspaceReadService workspaceReadService;

    @GetMapping
    public ResponseEntity<DashboardOverviewResponse> getDashboard() {
        return ResponseEntity.ok(workspaceReadService.getDashboardOverview());
    }

    @GetMapping("/overview")
    public ResponseEntity<DashboardOverviewResponse> getDashboardOverview() {
        return ResponseEntity.ok(workspaceReadService.getDashboardOverview());
    }
}
