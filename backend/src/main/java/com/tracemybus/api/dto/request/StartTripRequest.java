package com.tracemybus.api.dto.request;

import lombok.Data;

@Data
public class StartTripRequest {
    private String direction = "pickup";
}
