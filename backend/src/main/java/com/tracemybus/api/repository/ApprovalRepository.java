package com.tracemybus.api.repository;

import com.tracemybus.api.entity.Approval;
import com.tracemybus.api.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalRepository extends JpaRepository<Approval, String> {
    List<Approval> findByStatusOrderByCreatedAtDesc(ApprovalStatus status);
    List<Approval> findAllByOrderByCreatedAtDesc();
    Optional<Approval> findByPhoneAndStatus(String phone, ApprovalStatus status);
    Optional<Approval> findFirstByPhoneAndStatusInOrderByCreatedAtDesc(String phone, List<ApprovalStatus> statuses);
    boolean existsByPhoneAndStatus(String phone, ApprovalStatus status);
    boolean existsByEmailIgnoreCaseAndStatus(String email, ApprovalStatus status);
}
