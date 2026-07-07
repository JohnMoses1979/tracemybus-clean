package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RemoveRouteRequest {
    @NotBlank(message = "User ID is required")
    private String userId;
}
