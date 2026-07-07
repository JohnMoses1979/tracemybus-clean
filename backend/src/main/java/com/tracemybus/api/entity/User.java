package com.tracemybus.api.entity;

import com.tracemybus.api.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(length = 64)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(length = 150, nullable = false)
    private String name;

    @Column(length = 30, nullable = false, unique = true)
    private String phone;

    @Column(length = 200)
    @Builder.Default
    private String email = "";

    @Column(length = 255, nullable = false)
    private String passwordHash;

    @Column(length = 200)
    @Builder.Default
    private String org = "";

    @Column(length = 64)
    private String orgId;

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

    @Column(length = 10)
    @Builder.Default
    private String initials = "";

    @Builder.Default
    private Boolean approved = false;

    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    private Boolean notificationEnabled = true;

    @Column(length = 255)
    @Builder.Default
    private String expoPushToken = "";

    @Column(length = 40)
    @Builder.Default
    private String pushPlatform = "";

    private LocalDateTime pushTokenUpdatedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
