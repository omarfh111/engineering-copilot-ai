package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Data;
import org.example.copilote.entity.Role;

@Data
@Builder
public class TeamMemberResponse {

    private Long id;

    private String firstName;

    private String lastName;

    private String username;

    private String email;

    private Role role;

    private boolean enabled;

    private boolean accountLocked;
}
