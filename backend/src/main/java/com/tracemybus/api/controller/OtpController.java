package com.tracemybus.api.controller;

import com.tracemybus.api.dto.request.OtpSendRequest;
import com.tracemybus.api.dto.request.OtpVerifyRequest;
import com.tracemybus.api.service.OtpService;
import com.tracemybus.api.util.PhoneUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/otp")
@RequiredArgsConstructor
public class OtpController {

    private final OtpService otpService;

    @Value("${app.otp.expiry-minutes:5}")
    private int expiryMinutes;

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendOtp(@Valid @RequestBody OtpSendRequest req) {
        try {
            String purpose = req.getPurpose() != null ? req.getPurpose() : "register";
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("ok", true);
            body.put("expiresInMinutes", expiryMinutes);

            if (req.getEmail() != null && !req.getEmail().isBlank()) {
                String email = otpService.normalizeEmail(req.getEmail());
                otpService.sendOtpToEmail(email, purpose);
                body.put("msg", "OTP sent successfully to email.");
                body.put("email", email);
                return ResponseEntity.ok(body);
            }

            String phone = PhoneUtils.requireTenDigits(req.getPhone());
            otpService.sendOtp(phone, purpose);
            body.put("msg", "OTP generated successfully.");
            body.put("phone", phone);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("ok", false, "msg", e.getMessage() != null ? e.getMessage() : "OTP send failed."));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody OtpVerifyRequest req) {
        try {
            String purpose = req.getPurpose() != null ? req.getPurpose() : "register";

            if (req.getEmail() != null && !req.getEmail().isBlank()) {
                String email = otpService.normalizeEmail(req.getEmail());
                otpService.verifyOtpByEmail(email, req.getOtp(), purpose);
                return ResponseEntity.ok(Map.of("ok", true, "msg", "Email verified successfully.", "email", email));
            }

            String phone = PhoneUtils.requireTenDigits(req.getPhone());
            otpService.verifyOtp(phone, req.getOtp(), purpose);
            return ResponseEntity.ok(Map.of("ok", true, "msg", "Phone number verified successfully.", "phone", phone));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage() != null ? e.getMessage() : "OTP verification failed."));
        }
    }
}
