package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.DocumentationStatus;
import org.example.copilote.entity.DocumentationType;

@Getter
@Setter
public class DocumentationSearchRequest extends PageQueryRequest {

    private String search;

    private DocumentationType type;

    private DocumentationStatus status;

    private Long projectId;
}
