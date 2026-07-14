package org.example.copilote.dto.Request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.ProjectStatus;

@Getter
@Setter
public class UpdateProjectRequest {

    @NotBlank(message = "Project title is required")
    @Size(max = 150, message = "Project title must be less than or equal to 150 characters")
    private String title;

    @Size(max = 3000, message = "Description must be less than or equal to 3000 characters")
    private String description;

    @NotNull(message = "Project status is required")
    private ProjectStatus status;

    @NotNull(message = "Team id is required")
    private Long teamId;

    @Getter
    @Setter
    public static class ProjectSearchRequest {

        private String search;

        private ProjectStatus status;

        private Long teamId;

        @Min(0)
        private int page = 0;

        @Min(1)
        @Max(100)
        private int size = 10;

        private String sortBy = "createdAt";

        @Pattern(regexp = "asc|desc", flags = Pattern.Flag.CASE_INSENSITIVE)
        private String sortDirection = "desc";
    }
}