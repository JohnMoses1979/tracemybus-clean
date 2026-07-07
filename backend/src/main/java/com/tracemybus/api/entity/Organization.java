package com.tracemybus.api.entity;

import com.tracemybus.api.enums.OrgType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "organizations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organization {

    @Id
    @Column(length = 64)
    private String id;

    @Column(length = 200, nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private OrgType type = OrgType.school;

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String address = "";

    @Column(length = 30)
    @Builder.Default
    private String phone = "";

    @Column(length = 64)
    private String adminId;

    @Column(length = 30)
    @Builder.Default
    private String color = "#2E7D32";

    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    private Boolean notificationEnabled = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
