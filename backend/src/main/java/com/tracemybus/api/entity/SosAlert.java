package com.tracemybus.api.entity;

import com.tracemybus.api.enums.SosStatus;
import com.tracemybus.api.enums.SosType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "sos_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SosAlert {

    @Id
    @Column(length = 64)
    private String id;

    @Column(length = 64)
    private String userId;

    @Column(length = 64)
    private String routeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SosType type;

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String message = "";

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SosStatus status = SosStatus.open;

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String response = "";

    @Column(length = 64)
    private String responderId;

    @Column(length = 150)
    @Builder.Default
    private String responderName = "";

    @Column(length = 80)
    @Builder.Default
    private String responderRole = "";

    private LocalDateTime respondedAt;
    private LocalDateTime resolvedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
