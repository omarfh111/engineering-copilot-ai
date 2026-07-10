package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.DocumentType;

@Getter
@Setter
public class UpdateDocumentRequest {

    @NotBlank(message = "Document title is required")
    @Size(max = 150, message = "Document title must be less than or equal to 150 characters")
    private String title;

    @Size(max = 3000, message = "Description must be less than or equal to 3000 characters")
    private String description;

    @NotNull(message = "Document type is required")
    private DocumentType type;

    @Size(max = 500, message = "Path must be less than or equal to 500 characters")
    private String path;

    @Size(max = 200, message = "Source must be less than or equal to 200 characters")
    private String source;

    @NotNull(message = "Project id is required")
    private Long projectId;
}
