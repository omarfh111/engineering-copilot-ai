package org.example.copilote.dto.Request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record AuditEventSearchRequest(
        String query,
        String status,
        String action,
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size
) {
    public int resolvedPage() {
        return page == null ? 0 : page;
    }

    public int resolvedSize() {
        return size == null ? 25 : size;
    }
}
