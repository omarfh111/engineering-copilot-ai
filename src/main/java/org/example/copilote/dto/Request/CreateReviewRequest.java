package org.example.copilote.dto.Request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.ReviewStatus;

@Getter
@Setter
public class CreateReviewRequest {

    @NotBlank(message = "Reviewer is required")
    @Size(max = 150, message = "Reviewer must be less than or equal to 150 characters")
    private String reviewer;

    @Size(max = 5000, message = "Comment must be less than or equal to 5000 characters")
    private String comment;

    @NotNull(message = "Score is required")
    @DecimalMin(value = "0.0", message = "Score must be between 0 and 100")
    @DecimalMax(value = "100.0", message = "Score must be between 0 and 100")
    private Double score;

    private ReviewStatus status;

    @NotNull(message = "Analysis is required")
    private Long analysisId;
}
