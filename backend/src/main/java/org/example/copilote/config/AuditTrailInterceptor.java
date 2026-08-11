package org.example.copilote.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.copilote.service.AuditTrailService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

/** Captures authenticated writes without recording secrets or request bodies. */
@Component
@RequiredArgsConstructor
public class AuditTrailInterceptor implements HandlerInterceptor {

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private final AuditTrailService auditTrailService;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception exception) {
        if (!MUTATING_METHODS.contains(request.getMethod()) || request.getRequestURI().startsWith("/api/audit")) {
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            return;
        }

        int status = exception == null ? response.getStatus() : 500;
        auditTrailService.record(
                authentication.getName(),
                request.getMethod(),
                request.getRequestURI(),
                resolveClientIp(request),
                status
        );
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr()
                : forwarded.split(",", 2)[0].trim();
    }
}
