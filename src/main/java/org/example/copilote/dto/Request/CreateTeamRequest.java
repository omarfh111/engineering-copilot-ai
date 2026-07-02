package org.example.copilote.dto.Request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateTeamRequest {

    @NotBlank(message = "Team name is required")
    @Size(max = 120, message = "Team name must be less than or equal to 120 characters")
    private String teamName;

    @Size(max = 2000, message = "Description must be less than or equal to 2000 characters")
    private String description;
}
