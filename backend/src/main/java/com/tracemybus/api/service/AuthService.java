package com.tracemybus.api.service;

import com.tracemybus.api.dto.request.*;
import com.tracemybus.api.entity.Approval;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.enums.ApprovalStatus;
import com.tracemybus.api.enums.ApprovalType;
import com.tracemybus.api.enums.UserRole;
import com.tracemybus.api.repository.ApprovalRepository;
import com.tracemybus.api.repository.UserRepository;
import com.tracemybus.api.security.JwtTokenProvider;
import com.tracemybus.api.util.DateTimeUtils;
import com.tracemybus.api.util.IdGenerator;
import com.tracemybus.api.util.PhoneUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ApprovalRepository approvalRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final OtpService otpService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public Map<String, Object> login(String phone, String password) {
        String cleanPhone = PhoneUtils.requireTenDigits(phone);

        Optional<User> optUser = userRepository.findByPhoneAndApprovedAndActive(cleanPhone, true, true);
        if (optUser.isPresent()) {
            User user = optUser.get();
            if (!passwordEncoder.matches(password, user.getPasswordHash())) {
                throw new SecurityException("Wrong password. Please try again.");
            }
            String token = jwtTokenProvider.generateToken(user.getId(), user.getRole().name(), user.getOrgId());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("ok", true);
            result.put("token", token);
            result.put("user", user);
            return result;
        }

        Optional<Approval> optRequest = approvalRepository
                .findFirstByPhoneAndStatusInOrderByCreatedAtDesc(cleanPhone, List.of(ApprovalStatus.pending, ApprovalStatus.rejected));

        if (optRequest.isPresent()) {
            Approval req = optRequest.get();
            if (req.getStatus() == ApprovalStatus.pending) {
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("ok", false);
                data.put("pending", true);
                data.put("phone", cleanPhone);
                data.put("msg", "Your account is pending approval. Please wait.");
                throw new PendingApprovalException(data);
            }
            if (req.getStatus() == ApprovalStatus.rejected) {
                throw new SecurityException("Your request was rejected. Please contact your admin.");
            }
        }

        throw new NoSuchElementException("User not registered. Please register first.");
    }

    @Transactional
    public Approval registerAdmin(RegisterAdminRequest req) {
        String cleanPhone = PhoneUtils.requireTenDigits(req.getPhone());
        String cleanEmail = otpService.normalizeEmail(req.getEmail());

        if (userRepository.existsByPhone(cleanPhone) || approvalRepository.existsByPhoneAndStatus(cleanPhone, ApprovalStatus.pending)) {
            throw new IllegalStateException("A user/request with this phone already exists.");
        }
        if (userRepository.existsByEmailIgnoreCase(cleanEmail) || approvalRepository.existsByEmailIgnoreCaseAndStatus(cleanEmail, ApprovalStatus.pending)) {
            throw new IllegalStateException("A user/request with this email already exists.");
        }

        if (!otpService.consumeVerifiedEmailOtp(cleanEmail, "register")) {
            throw new IllegalStateException("Please verify your email OTP before submitting registration.");
        }

        Approval approval = Approval.builder()
                .id(IdGenerator.makeId("AREQ"))
                .type(ApprovalType.admin_request)
                .status(ApprovalStatus.pending)
                .name(req.getName())
                .phone(cleanPhone)
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(req.getPassword() != null ? req.getPassword() : "1234"))
                .role("admin")
                .orgName(req.getOrgName() != null ? req.getOrgName() : "")
                .orgType(req.getOrgType() != null ? req.getOrgType() : "school")
                .orgAddress(req.getOrgAddress() != null ? req.getOrgAddress() : "")
                .orgPhone(req.getOrgPhone() != null && !req.getOrgPhone().isBlank() ? PhoneUtils.requireTenDigits(req.getOrgPhone()) : "")
                .submitted(DateTimeUtils.dateNow() + " " + DateTimeUtils.timeNow())
                .build();

        approval = approvalRepository.save(approval);

        List<String> superIds = userRepository.findByRoleAndApprovedAndActive(UserRole.superadmin, true, true)
                .stream().map(User::getId).toList();
        notificationService.notifyMany(superIds, "\uD83D\uDCDD", "New Admin Request",
                req.getName() + " wants to register " + req.getOrgName() + ".");

        return approval;
    }

    @Transactional
    public Approval registerUser(RegisterUserRequest req) {
        String cleanPhone = PhoneUtils.requireTenDigits(req.getPhone());
        String cleanEmail = otpService.normalizeEmail(req.getEmail());

        if (userRepository.existsByPhone(cleanPhone) || approvalRepository.existsByPhoneAndStatus(cleanPhone, ApprovalStatus.pending)) {
            throw new IllegalStateException("A user/request with this phone already exists.");
        }
        if (userRepository.existsByEmailIgnoreCase(cleanEmail) || approvalRepository.existsByEmailIgnoreCaseAndStatus(cleanEmail, ApprovalStatus.pending)) {
            throw new IllegalStateException("A user/request with this email already exists.");
        }

        if (!otpService.consumeVerifiedEmailOtp(cleanEmail, "register")) {
            throw new IllegalStateException("Please verify your email OTP before submitting registration.");
        }

        String childrenJson;
        try {
            childrenJson = objectMapper.writeValueAsString(req.getChildren() != null ? req.getChildren() : List.of());
        } catch (Exception e) {
            childrenJson = "[]";
        }

        Approval approval = Approval.builder()
                .id(IdGenerator.makeId("REQ"))
                .type(ApprovalType.user_request)
                .status(ApprovalStatus.pending)
                .name(req.getName())
                .phone(cleanPhone)
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(req.getPassword() != null ? req.getPassword() : "1234"))
                .role(req.getRole())
                .orgId(req.getOrgId())
                .orgName(req.getOrgName() != null ? req.getOrgName() : (req.getOrg() != null ? req.getOrg() : ""))
                .routeId(req.getRouteId())
                .stop(req.getStop() != null ? req.getStop() : "")
                .children(childrenJson)
                .childName(req.getChildName() != null ? req.getChildName() : "")
                .childClass(req.getChildClass() != null ? req.getChildClass() : "")
                .childRollNo(req.getChildRollNo() != null ? req.getChildRollNo() : "")
                .department(req.getDepartment() != null ? req.getDepartment() : "")
                .empId(req.getEmpId() != null ? req.getEmpId() : "")
                .shiftTime(req.getShiftTime() != null ? req.getShiftTime() : "")
                .license(req.getLicense() != null ? req.getLicense() : "")
                .experience(req.getExperience() != null ? req.getExperience() : "")
                .submitted(DateTimeUtils.dateNow() + " " + DateTimeUtils.timeNow())
                .build();

        approval = approvalRepository.save(approval);

        List<String> adminIds = userRepository.findByRoleAndOrgIdAndApprovedAndActive(UserRole.admin, req.getOrgId(), true, true)
                .stream().map(User::getId).toList();
        notificationService.notifyMany(adminIds, "\uD83D\uDCDD", "New User Request",
                req.getName() + " wants to join as " + req.getRole() + ".");

        return approval;
    }

    @Transactional
    public void forgotPasswordSendOtp(String phone) {
        String cleanPhone = PhoneUtils.requireTenDigits(phone);
        // requireTenDigits already validates exact 10 digits.
        User user = userRepository.findByPhoneAndActive(cleanPhone, true)
                .orElseThrow(() -> new NoSuchElementException("No account found with this phone number."));
        String cleanEmail = otpService.normalizeEmail(user.getEmail());
        otpService.sendOtpToEmail(cleanEmail, "forgot_password");
    }

    @Transactional
    public void forgotPasswordVerifyOtp(String phone, String otp) {
        String cleanPhone = PhoneUtils.requireTenDigits(phone);
        User user = userRepository.findByPhoneAndActive(cleanPhone, true)
                .orElseThrow(() -> new NoSuchElementException("No account found with this phone number."));
        String cleanEmail = otpService.normalizeEmail(user.getEmail());
        otpService.verifyOtpByEmail(cleanEmail, otp, "forgot_password");
    }

    @Transactional
    public void forgotPasswordReset(String phone, String newPassword) {
        String cleanPhone = PhoneUtils.requireTenDigits(phone);
        // requireTenDigits already validates exact 10 digits.
        if (newPassword == null || newPassword.length() < 4) throw new IllegalArgumentException("New password must be at least 4 characters.");

        User user = userRepository.findByPhoneAndActive(cleanPhone, true)
                .orElseThrow(() -> new NoSuchElementException("No account found with this phone number."));
        String cleanEmail = otpService.normalizeEmail(user.getEmail());

        if (!otpService.consumeVerifiedEmailOtp(cleanEmail, "forgot_password")) {
            throw new IllegalStateException("Please verify email OTP before resetting password.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void resetPassword(User currentUser, String currentPassword, String newPassword) {
        if (!passwordEncoder.matches(currentPassword, currentUser.getPasswordHash())) {
            throw new SecurityException("Current password is wrong.");
        }
        currentUser.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(currentUser);
    }

    public static class PendingApprovalException extends RuntimeException {
        private final Map<String, Object> data;
        public PendingApprovalException(Map<String, Object> data) {
            super("Pending approval");
            this.data = data;
        }
        public Map<String, Object> getData() { return data; }
    }
}
