package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateTeamRequest;
import org.example.copilote.dto.Request.TeamSearchRequest;
import org.example.copilote.dto.Request.UpdateTeamRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.TeamResponse;

public interface TeamService {

    PagedResponse<TeamResponse> getAllTeams(TeamSearchRequest request);

    TeamResponse createTeam(CreateTeamRequest request);

    TeamResponse getTeamById(Long id);

    TeamResponse updateTeam(Long id, UpdateTeamRequest request);

    void deleteTeam(Long id);

    TeamResponse addUserToTeam(Long teamId, Long userId);

    TeamResponse removeUserFromTeam(Long teamId, Long userId);

    TeamResponse assignTeamLeader(Long teamId, Long userId);

    TeamResponse removeTeamLeader(Long teamId);
}
