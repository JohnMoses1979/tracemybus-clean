package com.tracemybus.api.entity;

import com.tracemybus.api.enums.ApprovalStatus;
import com.tracemybus.api.enums.ApprovalType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "approvals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Approval {

    @Id
    @Column(length = 64)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApprovalType type;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ApprovalStatus status = ApprovalStatus.pending;

    @Column(length = 150, nullable = false)
    private String name;

    @Column(length = 30, nullable = false)
    private String phone;

    @Column(length = 200)
    @Builder.Default
    private String email = "";

    @Column(length = 255, nullable = false)
    private String passwordHash;

    @Column(length = 20)
    private String role;

    @Column(length = 64)
    private String orgId;

    @Column(length = 200)
    @Builder.Default
    private String orgName = "";

    @Column(length = 80)
    @Builder.Default
    private String orgType = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String orgAddress = "";

    @Column(length = 30)
    @Builder.Default
    private String orgPhone = "";

    @Column(length = 64)
    private String routeId;

    @Column(length = 200)
    @Builder.Default
    private String stop = "";

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String children = "[]";

    @Column(length = 150)
    @Builder.Default
    private String childName = "";

    @Column(length = 80)
    @Builder.Default
    private String childClass = "";

    @Column(length = 80)
    @Builder.Default
    private String childRollNo = "";

    @Column(length = 120)
    @Builder.Default
    private String department = "";

    @Column(length = 80)
    @Builder.Default
    private String empId = "";

    @Column(length = 80)
    @Builder.Default
    private String shiftTime = "";

    @Column(length = 120)
    @Builder.Default
    private String license = "";

    @Column(length = 80)
    @Builder.Default
    private String experience = "";

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String details = "{}";

    @Column(length = 100)
    @Builder.Default
    private String submitted = "";

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
