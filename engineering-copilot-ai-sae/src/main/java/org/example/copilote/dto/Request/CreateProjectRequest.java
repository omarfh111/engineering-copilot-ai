package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.ProjectStatus;

@Getter
@Setter
public class CreateProjectRequest {

    @NotBlank(message = "Project title is required")
    @Size(max = 150, message = "Project title must be less than or equal to 150 characters")
    private String title;

    @Size(max = 3000, message = "Description must be less than or equal to 3000 characters")
    private String description;

    private ProjectStatus status = ProjectStatus.CREATED;

    @NotNull(message = "Team id is required")
    private Long teamId;
}