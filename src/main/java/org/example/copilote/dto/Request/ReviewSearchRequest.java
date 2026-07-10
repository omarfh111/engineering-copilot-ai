package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.ReviewStatus;

@Getter
@Setter
public class ReviewSearchRequest extends PageQueryRequest {

    private String search;

    private ReviewStatus status;

    private Long analysisId;

    private Long projectId;
}
