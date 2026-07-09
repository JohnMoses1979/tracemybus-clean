package com.tracemybus.api.controller;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;

@RestController
@RequestMapping("/api/otp")
@CrossOrigin(origins = "*")
public class OtpController {

    private final JavaMailSender mailSender;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, OtpRecord> emailOtpStore = new ConcurrentHashMap<>();

    public OtpController(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Value("${app.otp.expiry-minutes:5}")
    private int expiryMinutes;

    @Value("${TWILIO_ACCOUNT_SID:}")
    private String accountSid;

    @Value("${TWILIO_AUTH_TOKEN:}")
    private String authToken;

    @Value("${TWILIO_VERIFY_SERVICE_SID:}")
    private String verifyServiceSid;

    @Value("${TWILIO_OTP_CHANNEL:sms}")
    private String otpChannel;

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, Object> body) {
        String email = value(body, "email");
        String phone = firstNonBlank(
            value(body, "phone"),
            value(body, "mobile"),
            value(body, "phoneNumber"),
            value(body, "to")
        );

        try {
            if (!email.isBlank()) {
                return sendEmailOtp(email);
            }

            if (!phone.isBlank()) {
                return sendSmsOtp(phone);
            }

            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Email or phone number is required"
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "ok", false,
                "message", "OTP failed: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, Object> body) {
        String email = value(body, "email");
        String phone = firstNonBlank(
            value(body, "phone"),
            value(body, "mobile"),
            value(body, "phoneNumber"),
            value(body, "to")
        );

        String otp = firstNonBlank(
            value(body, "otp"),
            value(body, "code")
        );

        try {
            if (!email.isBlank()) {
                return verifyEmailOtp(email, otp);
            }

            if (!phone.isBlank()) {
                return verifySmsOtp(phone, otp);
            }

            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Email/phone and OTP are required"
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "ok", false,
                "message", "OTP verification failed: " + e.getMessage()
            ));
        }
    }

    private ResponseEntity<Map<String, Object>> sendEmailOtp(String email) {
        validateMailConfig();

        String otp = String.format("%06d", random.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plusSeconds(expiryMinutes * 60L);

        emailOtpStore.put(email.toLowerCase(), new OtpRecord(otp, expiresAt));

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject("TraceMyBus Email OTP");
        message.setText(
            "Your TraceMyBus OTP is: " + otp + "\n\n" +
            "This OTP is valid for " + expiryMinutes + " minutes.\n\n" +
            "Do not share this OTP with anyone."
        );

        mailSender.send(message);

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "message", "OTP sent successfully to email"
        ));
    }

    private ResponseEntity<Map<String, Object>> verifyEmailOtp(String email, String otp) {
        if (otp == null || otp.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "OTP is required"
            ));
        }

        OtpRecord record = emailOtpStore.get(email.toLowerCase());

        if (record == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "OTP not found or expired. Please send OTP again."
            ));
        }

        if (record.expiresAt().isBefore(Instant.now())) {
            emailOtpStore.remove(email.toLowerCase());
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "OTP expired. Please send OTP again."
            ));
        }

        if (!record.otp().equals(otp)) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Invalid OTP"
            ));
        }

        emailOtpStore.remove(email.toLowerCase());

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "message", "OTP verified successfully"
        ));
    }

    private ResponseEntity<Map<String, Object>> sendSmsOtp(String phone) {
        validateTwilioConfig();

        String normalizedPhone = normalizeIndianPhone(phone);
        Twilio.init(accountSid, authToken);

        Verification verification = Verification.creator(
            verifyServiceSid,
            normalizedPhone,
            otpChannel
        ).create();

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "message", "OTP sent successfully to phone",
            "status", verification.getStatus()
        ));
    }

    private ResponseEntity<Map<String, Object>> verifySmsOtp(String phone, String otp) {
        if (otp == null || otp.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "OTP is required"
            ));
        }

        validateTwilioConfig();

        String normalizedPhone = normalizeIndianPhone(phone);
        Twilio.init(accountSid, authToken);

        VerificationCheck check = VerificationCheck.creator(verifyServiceSid)
            .setTo(normalizedPhone)
            .setCode(otp)
            .create();

        boolean approved = "approved".equalsIgnoreCase(check.getStatus());

        if (!approved) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Invalid OTP",
                "status", check.getStatus()
            ));
        }

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "message", "OTP verified successfully",
            "status", check.getStatus()
        ));
    }

    private void validateMailConfig() {
        if (mailFrom == null || mailFrom.isBlank()) {
            throw new IllegalStateException("SPRING_MAIL_USERNAME missing");
        }
    }

    private void validateTwilioConfig() {
        if (accountSid == null || accountSid.isBlank()) {
            throw new IllegalStateException("TWILIO_ACCOUNT_SID missing");
        }
        if (authToken == null || authToken.isBlank()) {
            throw new IllegalStateException("TWILIO_AUTH_TOKEN missing");
        }
        if (verifyServiceSid == null || verifyServiceSid.isBlank()) {
            throw new IllegalStateException("TWILIO_VERIFY_SERVICE_SID missing");
        }
    }

    private static String normalizeIndianPhone(String phone) {
        String p = phone.trim().replace(" ", "").replace("-", "");

        if (p.startsWith("+")) return p;
        if (p.startsWith("91") && p.length() == 12) return "+" + p;
        if (p.length() == 10) return "+91" + p;

        return p;
    }

    private static String value(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v == null ? "" : String.valueOf(v).trim();
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private record OtpRecord(String otp, Instant expiresAt) {}
}
