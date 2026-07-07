package com.tracemybus.api.service;

import com.tracemybus.api.entity.OtpVerification;
import com.tracemybus.api.repository.OtpVerificationRepository;
import com.tracemybus.api.util.IdGenerator;
import com.tracemybus.api.util.PhoneUtils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpVerificationRepository otpRepo;
    private final EmailService emailService;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    @Value("${app.otp.required:true}")
    private boolean otpRequired;

    @Value("${app.otp.expiry-minutes:5}")
    private int expiryMinutes;

    @Value("${app.otp.length:6}")
    private int otpLength;

    @PostConstruct
    public void init() {
        log.info("✅ OTP Service initialized (email OTP enabled)");
    }

    private String generateOtp() {
        int length = Math.max(4, Math.min(8, otpLength));
        int bound = (int) Math.pow(10, length);
        int min = (int) Math.pow(10, length - 1);
        return String.valueOf(RANDOM.nextInt(bound - min) + min);
    }

    public String normalizeEmail(String email) {
        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        if (!EMAIL_PATTERN.matcher(cleanEmail).matches()) {
            throw new IllegalArgumentException("Please enter a valid email address.");
        }
        return cleanEmail;
    }

    @Transactional
    public void sendOtpToEmail(String email, String purpose) {
        String cleanEmail = normalizeEmail(email);
        String safePurpose = purpose != null && !purpose.isBlank() ? purpose : "register";
        String code = generateOtp();

        otpRepo.consumeAllByEmailAndPurpose(cleanEmail, safePurpose, LocalDateTime.now());

        OtpVerification record = OtpVerification.builder()
                .id(IdGenerator.makeId("otp"))
                .phone("")
                .email(cleanEmail)
                .purpose(safePurpose)
                .otpHash(code)
                .expiresAt(LocalDateTime.now().plusMinutes(expiryMinutes))
                .attempts(0)
                .build();
        otpRepo.save(record);

        emailService.sendOtpEmail(cleanEmail, code, expiryMinutes, safePurpose);
    }

    @Transactional
    public boolean verifyOtpByEmail(String email, String otp, String purpose) {
        String cleanEmail = normalizeEmail(email);
        String safePurpose = purpose != null && !purpose.isBlank() ? purpose : "register";
        String code = otp != null ? otp.trim() : "";

        Optional<OtpVerification> optRecord = otpRepo
                .findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(cleanEmail, safePurpose);

        return verifyRecord(optRecord, code);
    }

    @Transactional
    public boolean consumeVerifiedEmailOtp(String email, String purpose) {
        if (!otpRequired) return true;
        String cleanEmail = normalizeEmail(email);
        String safePurpose = purpose != null && !purpose.isBlank() ? purpose : "register";

        Optional<OtpVerification> optRecord = otpRepo
                .findFirstByEmailAndPurposeAndVerifiedAtIsNotNullAndConsumedAtIsNullAndExpiresAtAfterOrderByVerifiedAtDesc(
                        cleanEmail, safePurpose, LocalDateTime.now());

        if (optRecord.isEmpty()) return false;

        OtpVerification record = optRecord.get();
        record.setConsumedAt(LocalDateTime.now());
        otpRepo.save(record);
        return true;
    }

    // Kept for old phone-based OTP usages. Registration now uses email OTP.
    @Transactional
    public void sendOtp(String phone, String purpose) {
        String cleanPhone = PhoneUtils.requireTenDigits(phone);

        String safePurpose = purpose != null && !purpose.isBlank() ? purpose : "register";
        String code = generateOtp();
        otpRepo.consumeAllByPhoneAndPurpose(cleanPhone, safePurpose, LocalDateTime.now());

        OtpVerification record = OtpVerification.builder()
                .id(IdGenerator.makeId("otp"))
                .phone(cleanPhone)
                .email("")
                .purpose(safePurpose)
                .otpHash(code)
                .expiresAt(LocalDateTime.now().plusMinutes(expiryMinutes))
                .attempts(0)
                .build();
        otpRepo.save(record);

        log.info("OTP ready for {}. Phone SMS sending is disabled; use email OTP for registration.", PhoneUtils.mask(cleanPhone));
    }

    @Transactional
    public boolean verifyOtp(String phone, String otp, String purpose) {
        String cleanPhone = PhoneUtils.requireTenDigits(phone);
        String safePurpose = purpose != null && !purpose.isBlank() ? purpose : "register";
        String code = otp != null ? otp.trim() : "";

        Optional<OtpVerification> optRecord = otpRepo
                .findFirstByPhoneAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(cleanPhone, safePurpose);

        return verifyRecord(optRecord, code);
    }

    @Transactional
    public boolean consumeVerifiedOtp(String phone, String purpose) {
        if (!otpRequired) return true;
        String cleanPhone = PhoneUtils.requireTenDigits(phone);
        String safePurpose = purpose != null && !purpose.isBlank() ? purpose : "register";

        Optional<OtpVerification> optRecord = otpRepo
                .findFirstByPhoneAndPurposeAndVerifiedAtIsNotNullAndConsumedAtIsNullAndExpiresAtAfterOrderByVerifiedAtDesc(
                        cleanPhone, safePurpose, LocalDateTime.now());

        if (optRecord.isEmpty()) return false;

        OtpVerification record = optRecord.get();
        record.setConsumedAt(LocalDateTime.now());
        otpRepo.save(record);
        return true;
    }

    private boolean verifyRecord(Optional<OtpVerification> optRecord, String code) {
        if (optRecord.isEmpty()) {
            throw new IllegalArgumentException("OTP not found. Please request a new OTP.");
        }

        OtpVerification record = optRecord.get();

        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP expired. Please request a new OTP.");
        }
        if (record.getAttempts() != null && record.getAttempts() >= 5) {
            throw new IllegalArgumentException("Too many wrong attempts. Please request a new OTP.");
        }

        if (!record.getOtpHash().equals(code)) {
            record.setAttempts((record.getAttempts() != null ? record.getAttempts() : 0) + 1);
            otpRepo.save(record);
            throw new IllegalArgumentException("Invalid OTP. Please try again.");
        }

        record.setVerifiedAt(LocalDateTime.now());
        otpRepo.save(record);
        return true;
    }
}
