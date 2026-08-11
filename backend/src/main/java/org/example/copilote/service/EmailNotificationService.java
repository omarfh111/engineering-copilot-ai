package org.example.copilote.service;

import org.example.copilote.dto.Request.SendEmailNotificationRequest;
import org.example.copilote.dto.Response.EmailNotificationResponse;

public interface EmailNotificationService {
    EmailNotificationResponse send(SendEmailNotificationRequest request);
}
