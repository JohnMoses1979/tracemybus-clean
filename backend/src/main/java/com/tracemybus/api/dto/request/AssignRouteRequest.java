package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignRouteRequest {
    @NotBlank(message = "User ID is required")
    private String userId;
    @NotBlank(message = "Route ID is required")
    private String routeId;
    private String stop;
}
