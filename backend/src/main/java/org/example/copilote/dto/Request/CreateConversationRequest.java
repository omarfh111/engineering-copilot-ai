package org.example.copilote.dto.Request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateConversationRequest {

    @NotBlank(message = "Question is required")
    @Size(max = 10000, message = "Question must be less than or equal to 10000 characters")
    private String question;

    @Size(max = 20000, message = "Response must be less than or equal to 20000 characters")
    private String response;

    @DecimalMin(value = "0.0", message = "Confidence score must be between 0 and 1")
    @DecimalMax(value = "1.0", message = "Confidence score must be between 0 and 1")
    private Double confidenceScore;

    @Min(value = 0, message = "Response time must be greater than or equal to 0")
    private Long responseTime;

    @NotNull(message = "Project is required")
    private Long projectId;
}
