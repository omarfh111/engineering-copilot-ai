package org.example.copilote;

import org.example.copilote.repository.AuditLogRepository;
import org.example.copilote.service.AuditLogService;
import org.example.copilote.entity.AuditLogStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class AuditLogRepositorySmokeTest {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Test
    void canReadAuditLogs() {
        auditLogRepository.findAll(PageRequest.of(0, 1));
    }

    @Test
    void canRecordAuditLogWithActorEmail() {
        var response = auditLogService.record(
                "audit-integration@example.com",
                "LOGIN_FAILED",
                "127.0.0.1",
                AuditLogStatus.FAILURE
        );

        assertThat(response.getActorEmail()).isEqualTo("audit-integration@example.com");
        assertThat(response.getStatus()).isEqualTo(AuditLogStatus.FAILURE);

        auditLogRepository.deleteById(response.getId());
    }

}
