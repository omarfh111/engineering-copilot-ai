package org.example.copilote.service;

import org.example.copilote.dto.Request.AuditLogSearchRequest;
import org.example.copilote.dto.Response.AuditLogResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.entity.AuditLogStatus;
import org.example.copilote.entity.User;

public interface AuditLogService {
    PagedResponse<AuditLogResponse> getAuditLogs(AuditLogSearchRequest request);
    AuditLogResponse record(String actor, String action, String ipAddress, AuditLogStatus status);
    AuditLogResponse record(User actor, String action, String ipAddress, AuditLogStatus status);
}
