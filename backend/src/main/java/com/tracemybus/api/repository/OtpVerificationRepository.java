package com.tracemybus.api.repository;

import com.tracemybus.api.entity.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, String> {
    Optional<OtpVerification> findFirstByPhoneAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(String phone, String purpose);
    Optional<OtpVerification> findFirstByPhoneAndPurposeAndVerifiedAtIsNotNullAndConsumedAtIsNullAndExpiresAtAfterOrderByVerifiedAtDesc(String phone, String purpose, LocalDateTime now);

    Optional<OtpVerification> findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(String email, String purpose);
    Optional<OtpVerification> findFirstByEmailAndPurposeAndVerifiedAtIsNotNullAndConsumedAtIsNullAndExpiresAtAfterOrderByVerifiedAtDesc(String email, String purpose, LocalDateTime now);

    @Modifying
    @Query("update OtpVerification o set o.consumedAt = :now where o.phone = :phone and o.purpose = :purpose and o.consumedAt is null")
    void consumeAllByPhoneAndPurpose(String phone, String purpose, LocalDateTime now);

    @Modifying
    @Query("update OtpVerification o set o.consumedAt = :now where o.email = :email and o.purpose = :purpose and o.consumedAt is null")
    void consumeAllByEmailAndPurpose(String email, String purpose, LocalDateTime now);
}
