package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.DocumentType;

@Getter
@Setter
public class DocumentSearchRequest extends PageQueryRequest {

    private String search;

    private DocumentType type;

    private Long projectId;
}
