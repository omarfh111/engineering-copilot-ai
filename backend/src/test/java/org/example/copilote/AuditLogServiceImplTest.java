package org.example.copilote;

import org.example.copilote.entity.AuditLog;
import org.example.copilote.entity.AuditLogStatus;
import org.example.copilote.repository.AuditLogRepository;
import org.example.copilote.service.impl.AuditLogServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuditLogServiceImplTest {

    private final AuditLogRepository auditLogRepository = mock(AuditLogRepository.class);
    private final AuditLogServiceImpl auditLogService = new AuditLogServiceImpl(auditLogRepository);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordLoginFailedUsesExplicitRequestEmail() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = auditLogService.record(
                "developer@example.com",
                "LOGIN_FAILED",
                "127.0.0.1",
                AuditLogStatus.FAILURE
        );

        assertThat(response.getActorEmail()).isEqualTo("developer@example.com");
        assertThat(response.getActor()).isEqualTo("developer@example.com");
        assertThat(response.getStatus()).isEqualTo(AuditLogStatus.FAILURE);
    }

    @Test
    void recordUsesAuthenticatedPrincipalWhenActorIsMissing() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "admin@copilote.dev",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                )
        );

        var response = auditLogService.record((String) null, "TEAM_CREATED", "127.0.0.1", AuditLogStatus.SUCCESS);

        assertThat(response.getActorEmail()).isEqualTo("admin@copilote.dev");
    }
}
