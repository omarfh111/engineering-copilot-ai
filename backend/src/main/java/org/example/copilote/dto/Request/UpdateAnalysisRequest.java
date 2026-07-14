package org.example.copilote.dto.Request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.entity.AnalysisType;
import org.example.copilote.entity.Severity;

@Getter
@Setter
public class UpdateAnalysisRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be less than or equal to 200 characters")
    private String title;

    @Size(max = 5000, message = "Summary must be less than or equal to 5000 characters")
    private String summary;

    @Size(max = 10000, message = "Recommendation must be less than or equal to 10000 characters")
    private String recommendation;

    @NotNull(message = "Analysis type is required")
    private AnalysisType analysisType;

    @NotNull(message = "Severity is required")
    private Severity severity;

    @NotNull(message = "Status is required")
    private AnalysisStatus status;

    @NotNull(message = "Score is required")
    @Min(value = 0, message = "Score must be between 0 and 100")
    @Max(value = 100, message = "Score must be between 0 and 100")
    private Integer score;

    @NotNull(message = "Project is required")
    private Long projectId;
}
