package org.example.copilote;

import org.example.copilote.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

@SpringBootTest
class AuditLogRepositorySmokeTest {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void canReadAuditLogs() {
        auditLogRepository.findAll(PageRequest.of(0, 1));
    }
}
