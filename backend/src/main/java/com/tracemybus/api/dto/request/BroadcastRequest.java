package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BroadcastRequest {
    @NotBlank(message = "Message is required")
    private String message;
}
