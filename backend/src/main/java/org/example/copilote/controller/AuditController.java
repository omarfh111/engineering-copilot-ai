package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AuditEventSearchRequest;
import org.example.copilote.dto.Response.AuditEventResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.service.AuditTrailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Administrator-only read API for immutable operational audit events. */
@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditTrailService auditTrailService;

    @GetMapping
    public ResponseEntity<PagedResponse<AuditEventResponse>> search(
            @Valid @ModelAttribute AuditEventSearchRequest request
    ) {
        return ResponseEntity.ok(auditTrailService.search(request));
    }
}
