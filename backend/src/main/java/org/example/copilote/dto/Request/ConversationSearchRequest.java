package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConversationSearchRequest extends PageQueryRequest {

    private String search;

    private Long projectId;

    private Long userId;
}
