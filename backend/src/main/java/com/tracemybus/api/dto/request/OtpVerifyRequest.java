package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OtpVerifyRequest {
    private String phone;
    private String email;
    @NotBlank(message = "OTP is required")
    private String otp;
    private String purpose = "register";
}
