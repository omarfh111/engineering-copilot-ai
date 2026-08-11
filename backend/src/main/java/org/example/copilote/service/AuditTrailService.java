package org.example.copilote.service;

import org.example.copilote.dto.Request.AuditEventSearchRequest;
import org.example.copilote.dto.Response.AuditEventResponse;
import org.example.copilote.dto.Response.PagedResponse;

public interface AuditTrailService {

    void record(String actorEmail, String action, String requestPath, String ipAddress, int httpStatus);

    PagedResponse<AuditEventResponse> search(AuditEventSearchRequest request);
}
