package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.copilote.dto.Request.SendEmailNotificationRequest;
import org.example.copilote.dto.Response.EmailNotificationResponse;
import org.example.copilote.service.EmailNotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationServiceImpl implements EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Override
    public EmailNotificationResponse send(SendEmailNotificationRequest request) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            String mailFrom = resolveSenderAddress();

            if (StringUtils.hasText(mailFrom)) {
                helper.setFrom(new InternetAddress(mailFrom, "Engineering Copilot Admin"));
            }
            helper.setTo(request.getTo().trim());
            helper.setSubject(request.getSubject().trim());
            helper.setText(request.getBody().trim(), true);
            mailSender.send(message);
            log.info("Email notification sent. recipient={} subject={}", request.getTo(), request.getSubject());

            return buildResponse(request);
        } catch (Exception exception) {
            log.warn("Email notification failed. recipient={} subject={} reason={}",
                    request.getTo(), request.getSubject(), exception.getMessage());
            return buildResponse(request);
        }
    }

    private String resolveSenderAddress() {
        if (StringUtils.hasText(fromAddress)) {
            return fromAddress.trim();
        }

        if (StringUtils.hasText(mailUsername)) {
            return mailUsername.trim();
        }

        return "";
    }

    private EmailNotificationResponse buildResponse(SendEmailNotificationRequest request) {
        return EmailNotificationResponse.builder()
                .to(request.getTo().trim())
                .subject(request.getSubject().trim())
                .sentAt(LocalDateTime.now())
                .build();
    }
}
