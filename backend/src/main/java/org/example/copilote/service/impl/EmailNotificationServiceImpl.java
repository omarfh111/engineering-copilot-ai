package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.SendEmailNotificationRequest;
import org.example.copilote.dto.Response.EmailNotificationResponse;
import org.example.copilote.service.EmailNotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailNotificationServiceImpl implements EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Override
    public EmailNotificationResponse send(SendEmailNotificationRequest request) {
        if (!StringUtils.hasText(mailUsername)) {
            return buildResponse(request);
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(StringUtils.hasText(fromAddress) ? fromAddress : mailUsername);
            message.setTo(request.getTo().trim());
            message.setSubject(request.getSubject().trim());
            message.setText(request.getBody().trim());
            mailSender.send(message);

            return buildResponse(request);
        } catch (MailException exception) {
            return buildResponse(request);
        }
    }

    private EmailNotificationResponse buildResponse(SendEmailNotificationRequest request) {
        return EmailNotificationResponse.builder()
                .to(request.getTo().trim())
                .subject(request.getSubject().trim())
                .sentAt(LocalDateTime.now())
                .build();
    }
}
