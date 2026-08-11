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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
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
import java.util.Map;
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
        String resolvedAction = StringUtils.hasText(action) ? action.trim() : "Unknown action";
        AuditLog log = AuditLog.builder()
                .actor(resolveActorEmail(actor))
                .action(resolvedAction)
                .ipAddress(StringUtils.hasText(ipAddress) ? ipAddress.trim() : "unknown")
                .status(toDatabaseStatus(resolveStatus(resolvedAction, status)))
                .build();

        return mapToResponse(auditLogRepository.save(log));
    }

    @Override
    public AuditLogResponse record(User actor, String action, String ipAddress, AuditLogStatus status) {
        return record(actor == null ? null : actor.getEmail(), action, ipAddress, status);
    }

    private String resolveActorEmail(String explicitActor) {
        if (StringUtils.hasText(explicitActor) && !"Unknown actor".equalsIgnoreCase(explicitActor.trim())) {
            return explicitActor.trim();
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return "Unknown actor";
        }

        Object principal = authentication.getPrincipal();

        String principalEmail = extractPrincipalEmail(principal);
        if (StringUtils.hasText(principalEmail)) {
            return principalEmail.trim();
        }

        if (isUsablePrincipalName(authentication.getName())) {
            return authentication.getName().trim();
        }

        return "Unknown actor";
    }

    private String extractPrincipalEmail(Object principal) {
        if (principal instanceof UserDetails userDetails && StringUtils.hasText(userDetails.getUsername())) {
            return userDetails.getUsername().trim();
        }

        if (principal instanceof String principalName && isUsablePrincipalName(principalName)) {
            return principalName.trim();
        }

        if (principal instanceof Map<?, ?> claims) {
            return firstTextClaim(claims, "email", "sub", "preferred_username", "username");
        }

        String jwtEmail = invokeStringMethod(principal, "getClaimAsString", "email");
        if (StringUtils.hasText(jwtEmail)) {
            return jwtEmail.trim();
        }

        String jwtSubject = invokeStringMethod(principal, "getSubject");
        if (StringUtils.hasText(jwtSubject)) {
            return jwtSubject.trim();
        }

        String email = invokeStringMethod(principal, "getEmail");
        if (StringUtils.hasText(email)) {
            return email.trim();
        }

        String username = invokeStringMethod(principal, "getUsername");
        if (StringUtils.hasText(username)) {
            return username.trim();
        }

        return "";
    }

    private boolean isUsablePrincipalName(String value) {
        return StringUtils.hasText(value) && !"anonymousUser".equalsIgnoreCase(value.trim());
    }

    private String firstTextClaim(Map<?, ?> claims, String... keys) {
        for (String key : keys) {
            Object value = claims.get(key);
            if (value instanceof String text && StringUtils.hasText(text)) {
                return text.trim();
            }
        }

        return "";
    }

    private String invokeStringMethod(Object target, String methodName, String... arguments) {
        if (target == null) {
            return "";
        }

        try {
            Class<?>[] argumentTypes = new Class<?>[arguments.length];
            Object[] argumentValues = new Object[arguments.length];

            for (int index = 0; index < arguments.length; index++) {
                argumentTypes[index] = String.class;
                argumentValues[index] = arguments[index];
            }

            Object value = target.getClass().getMethod(methodName, argumentTypes).invoke(target, argumentValues);
            return value instanceof String text ? text : "";
        } catch (ReflectiveOperationException exception) {
            return "";
        }
    }

    private AuditLogStatus resolveStatus(String action, AuditLogStatus status) {
        if (status != null) {
            return status;
        }

        String normalizedAction = action == null ? "" : action.trim().toUpperCase();

        if (normalizedAction.contains("LOGIN_FAILED")
                || normalizedAction.contains("LOGIN FAILURE")
                || normalizedAction.contains("LOGIN FAILED")
                || normalizedAction.contains("FAILED")) {
            return AuditLogStatus.FAILURE;
        }

        return AuditLogStatus.SUCCESS;
    }

    private String toDatabaseStatus(AuditLogStatus status) {
        return status == AuditLogStatus.FAILURE ? "FAILED" : "SUCCESS";
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
        String actorEmail = StringUtils.hasText(log.getActor()) ? log.getActor() : "Unknown actor";
        return AuditLogResponse.builder()
                .id(log.getId())
                .timestamp(resolveTimestamp(log))
                .actor(actorEmail)
                .actorEmail(actorEmail)
                .action(StringUtils.hasText(log.getAction()) ? log.getAction() : "Unknown action")
                .ipAddress(StringUtils.hasText(log.getIpAddress()) ? log.getIpAddress() : "unknown")
                .status(normalizeStatus(log.getStatus()))
                .build();
    }

    private LocalDateTime resolveTimestamp(AuditLog log) {
        if (log.getTimestamp() != null) {
            return log.getTimestamp();
        }
        if (log.getCreatedAt() != null) {
            return log.getCreatedAt();
        }
        if (log.getUpdatedAt() != null) {
            return log.getUpdatedAt();
        }
        return LocalDateTime.now();
    }

    private AuditLogStatus normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return AuditLogStatus.SUCCESS;
        }

        String normalizedStatus = status.trim().toUpperCase();

        if ("FAILED".equals(normalizedStatus)
                || "FAILURE".equals(normalizedStatus)
                || "ERROR".equals(normalizedStatus)) {
            return AuditLogStatus.FAILURE;
        }

        if ("SUCCESS".equals(normalizedStatus) || "SUCCEEDED".equals(normalizedStatus)) {
            return AuditLogStatus.SUCCESS;
        }

        try {
            return AuditLogStatus.valueOf(normalizedStatus);
        } catch (IllegalArgumentException exception) {
            return AuditLogStatus.FAILURE;
        }
    }
}
