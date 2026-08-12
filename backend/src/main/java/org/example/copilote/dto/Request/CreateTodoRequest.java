package org.example.copilote.dto.Request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.Priority;
import org.example.copilote.entity.TodoStatus;

@Getter
@Setter
public class CreateTodoRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be less than or equal to 200 characters")
    private String title;

    @Size(max = 5000, message = "Description must be less than or equal to 5000 characters")
    private String description;

    @NotNull(message = "Priority is required")
    private Priority priority;

    private TodoStatus status;

    @Size(max = 500, message = "File path must be less than or equal to 500 characters")
    private String filePath;

    @Min(value = 1, message = "Line number must be greater than 0")
    private Integer lineNumber;

    @NotNull(message = "Analysis is required")
    private Long analysisId;
}
