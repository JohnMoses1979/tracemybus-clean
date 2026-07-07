package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ForgotPasswordResetRequest {
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;
    @NotBlank(message = "New password is required")
    @Size(min = 4, message = "New password must be at least 4 characters")
    private String newPassword;
}
