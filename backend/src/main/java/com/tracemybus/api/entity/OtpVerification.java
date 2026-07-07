package com.tracemybus.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "otp_verifications", indexes = {
    @Index(columnList = "phone"),
    @Index(columnList = "email"),
    @Index(columnList = "purpose")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpVerification {

    @Id
    @Column(length = 64)
    private String id;

    // Kept for old phone-based OTP / forgot-password compatibility.
    @Column(length = 30, nullable = false)
    @Builder.Default
    private String phone = "";

    // Registration OTP is now verified against email.
    @Column(length = 200)
    @Builder.Default
    private String email = "";

    @Column(length = 40)
    @Builder.Default
    private String purpose = "register";

    @Column(length = 255, nullable = false)
    private String otpHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime verifiedAt;
    private LocalDateTime consumedAt;

    @Builder.Default
    private Integer attempts = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
