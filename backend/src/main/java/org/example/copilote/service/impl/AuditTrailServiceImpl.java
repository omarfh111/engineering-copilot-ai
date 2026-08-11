package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.AuditEventSearchRequest;
import org.example.copilote.dto.Response.AuditEventResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.entity.AuditEvent;
import org.example.copilote.repository.AuditEventRepository;
import org.example.copilote.service.AuditTrailService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuditTrailServiceImpl implements AuditTrailService {

    private final AuditEventRepository auditEventRepository;

    @Override
    @Transactional
    public void record(String actorEmail, String action, String requestPath, String ipAddress, int httpStatus) {
        auditEventRepository.save(AuditEvent.builder()
                .actorEmail(actorEmail)
                .action(action)
                .requestPath(requestPath)
                .ipAddress(ipAddress)
                .status(httpStatus >= 400 ? "FAILURE" : "SUCCESS")
                .httpStatus(httpStatus)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<AuditEventResponse> search(AuditEventSearchRequest request) {
        Page<AuditEvent> events = auditEventRepository.findAll(
                specification(request),
                PageRequest.of(request.resolvedPage(), request.resolvedSize(), Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        return PagedResponse.<AuditEventResponse>builder()
                .content(events.getContent().stream().map(this::toResponse).toList())
                .page(events.getNumber())
                .size(events.getSize())
                .totalElements(events.getTotalElements())
                .totalPages(events.getTotalPages())
                .first(events.isFirst())
                .last(events.isLast())
                .sortBy("createdAt")
                .sortDirection("DESC")
                .build();
    }

    private Specification<AuditEvent> specification(AuditEventSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (request.query() != null && !request.query().isBlank()) {
                String value = "%" + request.query().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("actorEmail")), value),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("requestPath")), value),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("ipAddress")), value)
                ));
            }
            if (request.status() != null && !request.status().isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("status"), request.status().trim().toUpperCase(Locale.ROOT)));
            }
            if (request.action() != null && !request.action().isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("action"), request.action().trim().toUpperCase(Locale.ROOT)));
            }
            return criteriaBuilder.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private AuditEventResponse toResponse(AuditEvent event) {
        return new AuditEventResponse(
                event.getEventId(),
                event.getActorEmail() == null ? "Unknown user" : event.getActorEmail(),
                event.getAction(),
                event.getRequestPath(),
                event.getIpAddress() == null ? "Unknown" : event.getIpAddress(),
                event.getStatus(),
                event.getHttpStatus(),
                event.getCreatedAt()
        );
    }
}
