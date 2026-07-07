package com.tracemybus.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "routes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Route {

    @Id
    @Column(length = 64)
    private String id;

    @Column(length = 64, nullable = false)
    private String orgId;

    @Column(length = 200, nullable = false)
    private String name;

    @Column(length = 80)
    @Builder.Default
    private String busNo = "";

    @Column(length = 80)
    @Builder.Default
    private String vehicleNo = "";

    @Column(length = 64)
    private String driverId;

    @Column(length = 150)
    @Builder.Default
    private String driverName = "";

    @Column(length = 80)
    @Builder.Default
    private String startTime = "";

    @Column(length = 80)
    @Builder.Default
    private String returnTime = "";

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String stops = "[]";

    @Builder.Default
    private Boolean active = true;

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String extra = "{}";

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
