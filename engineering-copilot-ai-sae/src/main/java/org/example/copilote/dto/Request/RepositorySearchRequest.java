package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.RepositoryProvider;

@Getter
@Setter
public class RepositorySearchRequest extends PageQueryRequest {

    private String search;

    private RepositoryProvider provider;

    private Long projectId;
}
