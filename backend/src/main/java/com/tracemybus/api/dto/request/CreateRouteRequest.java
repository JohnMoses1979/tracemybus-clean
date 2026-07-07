package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreateRouteRequest {
    private String orgId;
    @NotBlank(message = "Route name is required")
    private String name;
    private String busNo = "";
    private String vehicleNo = "";
    private String driverId;
    private String driverName = "";
    private String startTime = "";
    private String returnTime = "";
    private List<String> stops = new ArrayList<>();
    private Boolean active = true;
}
