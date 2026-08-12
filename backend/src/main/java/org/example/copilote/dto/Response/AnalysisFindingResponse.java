package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;
import org.example.copilote.entity.Severity;

@Getter @Builder
public class AnalysisFindingResponse {
    private final Long id;
    private final String findingKey;
    private final String agent;
    private final String title;
    private final Severity severity;
    private final Double confidence;
    private final String evidence;
    private final String recommendation;
    private final String filePath;
    private final Integer lineStart;
    private final String sourcesJson;
}
