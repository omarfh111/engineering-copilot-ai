package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.AuditLogStatus;

@Getter
@Setter
public class CreateAuditLogRequest {

    @NotBlank(message = "Action is required")
    private String action;

    @NotNull(message = "Status is required")
    private AuditLogStatus status;
}
