package com.tracemybus.api.entity;

import com.tracemybus.api.enums.TripStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "trips")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @Column(length = 64)
    private String id;

    @Column(length = 64, nullable = false, unique = true)
    private String routeId;

    @Column(length = 64)
    private String orgId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TripStatus status = TripStatus.not_started;

    @Column(length = 20)
    @Builder.Default
    private String direction = "pickup";

    @Builder.Default
    private Boolean gpsOn = false;

    @Builder.Default
    private Integer currentStopIndex = 0;

    @Builder.Default
    private Integer eta = 0;

    @Builder.Default
    private Integer speed = 0;

    @Builder.Default
    private Integer delayMinutes = 0;

    @Column(length = 80)
    private String startedAt;

    @Column(length = 80)
    private String endedAt;

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String pickupStatus = "{}";

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String returnStatus = "{}";

    @Column(columnDefinition = "JSON")
    @Builder.Default
    private String logs = "[]";

    private Double latitude;
    private Double longitude;
    private Double heading;
    private Double accuracy;
    private LocalDateTime locationUpdatedAt;

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String locationAddress = "";

    @Column(length = 150)
    @Builder.Default
    private String locationCity = "";

    @Column(length = 150)
    @Builder.Default
    private String locationRegion = "";

    @Column(length = 40)
    @Builder.Default
    private String locationPostalCode = "";

    @Column(length = 120)
    @Builder.Default
    private String locationCountry = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String locationLabel = "";

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
