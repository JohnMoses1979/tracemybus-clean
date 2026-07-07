package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PassengerStatusRequest {
    @NotBlank(message = "Passenger ID is required")
    private String passengerId;
    @NotBlank(message = "Status is required")
    private String status;
}
