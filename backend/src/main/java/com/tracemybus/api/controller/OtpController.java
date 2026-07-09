package com.tracemybus.api.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.tracemybus.api.service.OtpService;
import com.twilio.Twilio;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/otp")
@CrossOrigin(origins = "*")
public class OtpController {

    // OtpService handles email OTP via DB (OtpVerification table).
    // This ensures consumeVerifiedEmailOtp() in AuthService can find the record.
    private final OtpService otpService;

    public OtpController(OtpService otpService) {
        this.otpService = otpService;
    }

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
        String purpose = firstNonBlank(value(body, "purpose"), "register");

        try {
            if (!email.isBlank()) {
                // Use OtpService so the OTP record is persisted in DB.
                otpService.sendOtpToEmail(email, purpose);
                return ResponseEntity.ok(Map.of(
                    "ok", true,
                    "message", "OTP sent successfully to email"
                ));
            }

            if (!phone.isBlank()) {
                return sendSmsOtp(phone);
            }

            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Email or phone number is required"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", e.getMessage()
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
        String purpose = firstNonBlank(value(body, "purpose"), "register");

        String otp = firstNonBlank(
            value(body, "otp"),
            value(body, "code")
        );

        try {
            if (!email.isBlank()) {
                // Use OtpService so verifiedAt is stamped in the DB record.
                // AuthService.consumeVerifiedEmailOtp() looks for verifiedAt IS NOT NULL.
                otpService.verifyOtpByEmail(email, otp, purpose);
                return ResponseEntity.ok(Map.of(
                    "ok", true,
                    "message", "OTP verified successfully"
                ));
            }

            if (!phone.isBlank()) {
                return verifySmsOtp(phone, otp);
            }

            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Email/phone and OTP are required"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "ok", false,
                "message", "OTP verification failed: " + e.getMessage()
            ));
        }
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
}
