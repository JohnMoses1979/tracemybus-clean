package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PassengerSosRequest {
    @NotBlank(message = "Route ID is required")
    private String routeId;
}
