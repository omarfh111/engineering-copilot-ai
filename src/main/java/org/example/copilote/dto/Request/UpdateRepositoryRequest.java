package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.RepositoryProvider;

@Getter
@Setter
public class UpdateRepositoryRequest {

    @NotBlank(message = "Repository name is required")
    @Size(max = 150, message = "Repository name must be less than or equal to 150 characters")
    private String name;

    @NotBlank(message = "Repository url is required")
    @Size(max = 500, message = "Repository url must be less than or equal to 500 characters")
    private String url;

    @Size(max = 100, message = "Technology must be less than or equal to 100 characters")
    private String technology;

    @NotNull(message = "Repository provider is required")
    private RepositoryProvider provider;

    @Size(max = 100, message = "Branch must be less than or equal to 100 characters")
    private String branch = "main";

    @NotNull(message = "Project id is required")
    private Long projectId;
}
