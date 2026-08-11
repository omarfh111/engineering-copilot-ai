package org.example.copilote.dto.Request;

import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.AuditLogStatus;

@Getter
@Setter
public class AuditLogSearchRequest extends PageQueryRequest {
    private String search;
    private AuditLogStatus status;
    private String action;
}
