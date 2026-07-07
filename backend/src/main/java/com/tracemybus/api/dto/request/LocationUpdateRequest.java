package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LocationUpdateRequest {
    @NotNull(message = "Latitude is required")
    private Double latitude;
    @NotNull(message = "Longitude is required")
    private Double longitude;
    private Double speedKmh;
    private Double speed;
    private Double heading;
    private Double accuracy;
    private String locationAddress = "";
    private String locationCity = "";
    private String locationRegion = "";
    private String locationPostalCode = "";
    private String locationCountry = "";
    private String locationLabel = "";
}
