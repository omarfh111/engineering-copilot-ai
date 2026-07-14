package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Data;
import org.example.copilote.entity.Role;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class UserResponse {

    private Long id;

    private String firstName;

    private String lastName;

    private String username;

    private String email;

    private Role role;

    private List<TeamSummaryResponse> teams;

    private boolean enabled;

    private boolean accountLocked;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

}
