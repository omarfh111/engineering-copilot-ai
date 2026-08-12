package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.DocumentationStatus;
import org.example.copilote.entity.DocumentationType;

@Getter
@Setter
public class UpdateDocumentationRequest {

    @NotBlank(message = "Documentation title is required")
    @Size(max = 150, message = "Documentation title must be less than or equal to 150 characters")
    private String title;

    private String description;

    @NotNull(message = "Documentation type is required")
    private DocumentationType type;

    private String content;

    @Size(max = 500, message = "Path must be less than or equal to 500 characters")
    private String path;

    @NotNull(message = "Documentation status is required")
    private DocumentationStatus status;

    private boolean generatedByAI;

    private boolean approved;

    @NotNull(message = "Project id is required")
    private Long projectId;
}
