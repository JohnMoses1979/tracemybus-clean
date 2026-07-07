package com.tracemybus.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @Column(length = 64)
    private String id;

    @Column(length = 64, nullable = false)
    private String userId;

    @Column(length = 20)
    @Builder.Default
    private String icon = "\uD83D\uDD14"; // 🔔

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String body = "";

    @Column(length = 50)
    @Builder.Default
    private String time = "";

    @Column(length = 50)
    @Builder.Default
    private String date = "";

    @Column(name = "`read`")
    @Builder.Default
    private Boolean read = false;

    @Column(length = 80)
    @Builder.Default
    private String type = "";

    @Column(length = 150)
    @Builder.Default
    private String sender = "";

    @Column(length = 80)
    @Builder.Default
    private String senderRole = "";

    @Column(length = 150)
    @Builder.Default
    private String audience = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String audienceDetails = "";

    @Column(length = 100)
    @Builder.Default
    private String deliveredAt = "";

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String extra = "{}";

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
