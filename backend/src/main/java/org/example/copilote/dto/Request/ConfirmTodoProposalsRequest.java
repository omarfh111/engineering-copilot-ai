package org.example.copilote.dto.Request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter @Setter
public class ConfirmTodoProposalsRequest {
    @NotEmpty(message = "At least one generated TODO proposal is required")
    @Size(max = 50)
    private List<@NotNull Long> proposalIds;
}
