package org.example.copilote.dto.Request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TeamSearchRequest {

    private String search;

    @Min(value = 0, message = "Page must be greater than or equal to 0")
    private int page = 0;

    @Min(value = 1, message = "Size must be at least 1")
    @Max(value = 100, message = "Size must be less than or equal to 100")
    private int size = 10;

    private String sortBy = "createdAt";

    @Pattern(
            regexp = "asc|desc",
            flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "Sort direction must be either asc or desc"
    )
    private String sortDirection = "desc";
}
