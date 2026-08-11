package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AuditLogSearchRequest;
import org.example.copilote.dto.Response.AuditLogResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.entity.AuditLog;
import org.example.copilote.entity.AuditLogStatus;
import org.example.copilote.entity.User;
import org.example.copilote.repository.AuditLogRepository;
import org.example.copilote.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "timestamp", "actor", "action", "ipAddress", "status");

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<AuditLogResponse> getAuditLogs(AuditLogSearchRequest request) {
        if (request == null) {
            request = new AuditLogSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = Sort.Direction.fromString(request.getSortDirection());
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), Sort.by(sortDirection, sortBy));
        Page<AuditLog> page = auditLogRepository.findAll(buildSpecification(request), pageable);
        List<AuditLogResponse> content = page.getContent().stream().map(this::mapToResponse).toList();

        return PagedResponse.<AuditLogResponse>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLogResponse record(String actor, String action, String ipAddress, AuditLogStatus status) {
        AuditLog log = AuditLog.builder()
                .actor(StringUtils.hasText(actor) ? actor.trim() : "Unknown actor")
                .action(StringUtils.hasText(action) ? action.trim() : "Unknown action")
                .ipAddress(StringUtils.hasText(ipAddress) ? ipAddress.trim() : "unknown")
                .status((status == null ? AuditLogStatus.SUCCESS : status).name())
                .build();

        return mapToResponse(auditLogRepository.save(log));
    }

    @Override
    public AuditLogResponse record(User actor, String action, String ipAddress, AuditLogStatus status) {
        String actorLabel = actor == null
                ? "Unknown actor"
                : "%s %s <%s>".formatted(actor.getFirstName(), actor.getLastName(), actor.getEmail());
        return record(actorLabel, action, ipAddress, status);
    }

    private Specification<AuditLog> buildSpecification(AuditLogSearchRequest request) {
        Specification<AuditLog> specification = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (StringUtils.hasText(request.getSearch())) {
            String term = "%" + request.getSearch().trim().toLowerCase() + "%";
            specification = specification.and((root, query, criteriaBuilder) -> criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("actor")), term),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("action")), term),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("ipAddress")), term)
            ));
        }

        if (request.getStatus() != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(criteriaBuilder.upper(root.get("status")), request.getStatus().name()));
        }

        if (StringUtils.hasText(request.getAction())) {
            String action = "%" + request.getAction().trim().toLowerCase() + "%";
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("action")), action));
        }

        return specification;
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "timestamp";
        }

        String normalized = sortBy.trim();
        if (!ALLOWED_SORT_FIELDS.contains(normalized)) {
            throw new IllegalArgumentException("Invalid sortBy value: " + normalized);
        }

        return normalized;
    }

    private AuditLogResponse mapToResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .timestamp(log.getTimestamp() == null ? LocalDateTime.now() : log.getTimestamp())
                .actor(StringUtils.hasText(log.getActor()) ? log.getActor() : "Unknown actor")
                .action(StringUtils.hasText(log.getAction()) ? log.getAction() : "Unknown action")
                .ipAddress(StringUtils.hasText(log.getIpAddress()) ? log.getIpAddress() : "unknown")
                .status(normalizeStatus(log.getStatus()))
                .build();
    }

    private AuditLogStatus normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return AuditLogStatus.SUCCESS;
        }

        try {
            return AuditLogStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            return AuditLogStatus.SUCCESS;
        }
    }
}
