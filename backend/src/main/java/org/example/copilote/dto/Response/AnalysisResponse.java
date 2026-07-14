package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.entity.AnalysisType;
import org.example.copilote.entity.Severity;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AnalysisResponse {

    private Long id;

    private String title;

    private String summary;

    private String recommendation;

    private AnalysisType analysisType;

    private Severity severity;

    private AnalysisStatus status;

    private Integer score;

    private ProjectSummaryResponse project;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
