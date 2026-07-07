package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Current password is required")
    private String currentPassword;
    @NotBlank(message = "New password is required")
    @Size(min = 4, message = "New password must be at least 4 characters")
    private String newPassword;
}
