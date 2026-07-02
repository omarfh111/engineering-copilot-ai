package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.TodoStatus;

@Getter
@Setter
public class TodoSearchRequest extends PageQueryRequest {

    private TodoStatus status;
}
