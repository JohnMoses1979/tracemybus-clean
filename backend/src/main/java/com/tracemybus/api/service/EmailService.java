package com.tracemybus.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    @Value("${app.mail.from-name:TraceMyBus}")
    private String fromName;

    public void sendOtpEmail(String toEmail, String otp, int expiryMinutes, String purpose) {
        if (toEmail == null || toEmail.isBlank()) {
            throw new IllegalArgumentException("Email address is required to send OTP.");
        }

        String cleanEmail = toEmail.trim().toLowerCase();
        String subject = "TraceMyBus Email OTP";
        String body = "Dear TraceMyBus user,\n\n"
                + "Your OTP is: " + otp + "\n"
                + "This OTP is valid for " + expiryMinutes + " minutes.\n\n"
                + "Do not share this OTP with anyone.\n\n"
                + "Regards,\n"
                + fromName;

        SimpleMailMessage message = new SimpleMailMessage();
        if (fromEmail != null && !fromEmail.isBlank()) {
            message.setFrom(fromEmail);
        }
        message.setTo(cleanEmail);
        message.setSubject(subject);
        message.setText(body);

        mailSender.send(message);
        log.info("✅ OTP email sent to {} for purpose {}", maskEmail(cleanEmail), purpose);
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}
