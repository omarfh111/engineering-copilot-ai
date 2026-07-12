package org.example.copilote.dto.Request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;
import org.example.copilote.entity.ProjectStatus;

@Getter
@Setter
public class ProjectSearchRequest {

    private String search;

    private ProjectStatus status;

    private Long teamId;

    @Min(0)
    private int page = 0;

    @Min(1)
    @Max(100)
    private int size = 10;

    private String sortBy = "createdAt";

    @Pattern(regexp = "asc|desc", flags = Pattern.Flag.CASE_INSENSITIVE)
    private String sortDirection = "desc";
}