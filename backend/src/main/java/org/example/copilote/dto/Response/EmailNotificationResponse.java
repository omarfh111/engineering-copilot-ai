package org.example.copilote.dto.Response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class EmailNotificationResponse {
    private final String to;
    private final String subject;
    private final LocalDateTime sentAt;
}
