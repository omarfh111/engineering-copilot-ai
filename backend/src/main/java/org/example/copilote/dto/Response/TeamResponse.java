package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TeamResponse {

    private Long id;

    private String teamName;

    private String description;

    private int memberCount;

    private int projectCount;

    private List<TeamMemberResponse> members;

    private TeamMemberResponse leader;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
