package com.tracemybus.api.controller;

import com.tracemybus.api.dto.request.*;
import com.tracemybus.api.dto.response.UserResponse;
import com.tracemybus.api.entity.Approval;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.security.UserPrincipal;
import com.tracemybus.api.service.AuthService;
import com.tracemybus.api.util.PhoneUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.otp.expiry-minutes:5}")
    private int expiryMinutes;

    private User currentUser() {
        UserPrincipal p = (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return p.getUser();
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest req) {
        try {
            Map<String, Object> result = authService.login(req.getPhone(), req.getPassword());
            result.put("user", UserResponse.from((User) result.get("user")));
            return ResponseEntity.ok(result);
        } catch (AuthService.PendingApprovalException e) {
            return ResponseEntity.status(403).body(e.getData());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        return ResponseEntity.ok(Map.of("ok", true, "user", UserResponse.from(currentUser())));
    }

    @PostMapping("/register/admin")
    public ResponseEntity<Map<String, Object>> registerAdmin(@Valid @RequestBody RegisterAdminRequest req) {
        try {
            Approval approval = authService.registerAdmin(req);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("ok", true); body.put("request", approval); body.put("msg", "Admin request submitted successfully.");
            return ResponseEntity.status(201).body(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(e.getMessage().contains("already exists") ? 409 : 400).body(Map.of("ok", false, "msg", e.getMessage()));
        }
    }

    @PostMapping("/register/user")
    public ResponseEntity<Map<String, Object>> registerUser(@Valid @RequestBody RegisterUserRequest req) {
        try {
            Approval approval = authService.registerUser(req);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("ok", true); body.put("request", approval); body.put("msg", "Registration request submitted successfully.");
            return ResponseEntity.status(201).body(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(e.getMessage().contains("already exists") ? 409 : 400).body(Map.of("ok", false, "msg", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<Map<String, Object>> forgotPasswordSendOtp(@Valid @RequestBody ForgotPasswordSendOtpRequest req) {
        try {
            authService.forgotPasswordSendOtp(req.getPhone());
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("ok", true); body.put("msg", "Password reset OTP sent successfully to your registered email.");
            body.put("phone", PhoneUtils.requireTenDigits(req.getPhone())); body.put("expiresInMinutes", expiryMinutes);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (Exception e) { return ResponseEntity.status(500).body(Map.of("ok", false, "msg", e.getMessage() != null ? e.getMessage() : "OTP send failed.")); }
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<Map<String, Object>> forgotPasswordVerifyOtp(@Valid @RequestBody ForgotPasswordVerifyRequest req) {
        try {
            authService.forgotPasswordVerifyOtp(req.getPhone(), req.getOtp());
            return ResponseEntity.ok(Map.of("ok", true, "msg", "Email OTP verified. You can now set a new password.", "phone", PhoneUtils.requireTenDigits(req.getPhone())));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage() != null ? e.getMessage() : "Verification failed.")); }
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Map<String, Object>> forgotPasswordReset(@Valid @RequestBody ForgotPasswordResetRequest req) {
        try {
            authService.forgotPasswordReset(req.getPhone(), req.getNewPassword());
            return ResponseEntity.ok(Map.of("ok", true, "msg", "Password reset successfully. Please login with your new password."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage() != null ? e.getMessage() : "Reset failed.")); }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        try {
            authService.resetPassword(currentUser(), req.getCurrentPassword(), req.getNewPassword());
            return ResponseEntity.ok(Map.of("ok", true, "msg", "Password updated successfully."));
        } catch (SecurityException e) { return ResponseEntity.status(401).body(Map.of("ok", false, "msg", e.getMessage())); }
    }
}
