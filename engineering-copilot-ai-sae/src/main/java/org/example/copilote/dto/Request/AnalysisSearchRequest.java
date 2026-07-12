package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.entity.AnalysisType;

@Getter
@Setter
public class AnalysisSearchRequest extends PageQueryRequest {

    private String search;

    private Long projectId;

    private AnalysisStatus status;

    private AnalysisType type;
}