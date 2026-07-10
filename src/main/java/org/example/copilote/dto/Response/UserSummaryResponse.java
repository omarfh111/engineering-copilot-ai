package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import org.example.copilote.entity.Role;

@Getter
@Builder
public class UserSummaryResponse {

    private final Long id;

    private final String firstName;

    private final String lastName;

    private final String username;

    private final String email;

    private final Role role;
}
