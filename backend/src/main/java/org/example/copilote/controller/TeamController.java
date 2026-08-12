package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateTeamRequest;
import org.example.copilote.dto.Request.TeamSearchRequest;
import org.example.copilote.dto.Request.UpdateTeamRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.TeamResponse;
import org.example.copilote.service.TeamService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public ResponseEntity<PagedResponse<TeamResponse>> getAllTeams(@Valid @ModelAttribute TeamSearchRequest request) {
        return ResponseEntity.ok(teamService.getAllTeams(request));
    }

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(@Valid @RequestBody CreateTeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.createTeam(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeamResponse> getTeamById(@PathVariable Long id) {
        return ResponseEntity.ok(teamService.getTeamById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTeamRequest request
    ) {
        return ResponseEntity.ok(teamService.updateTeam(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(@PathVariable Long id) {
        teamService.deleteTeam(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{teamId}/leader/{userId}")
    public ResponseEntity<TeamResponse> assignTeamLeader(@PathVariable Long teamId, @PathVariable Long userId) {
        return ResponseEntity.ok(teamService.assignTeamLeader(teamId, userId));
    }

    @DeleteMapping("/{teamId}/leader")
    public ResponseEntity<TeamResponse> removeTeamLeader(@PathVariable Long teamId) {
        return ResponseEntity.ok(teamService.removeTeamLeader(teamId));
    }

    @PostMapping("/{teamId}/users/{userId}")
    public ResponseEntity<TeamResponse> addUserToTeam(@PathVariable Long teamId, @PathVariable Long userId) {
        return ResponseEntity.ok(teamService.addUserToTeam(teamId, userId));
    }

    @DeleteMapping("/{teamId}/users/{userId}")
    public ResponseEntity<TeamResponse> removeUserFromTeam(@PathVariable Long teamId, @PathVariable Long userId) {
        return ResponseEntity.ok(teamService.removeUserFromTeam(teamId, userId));
    }
}
