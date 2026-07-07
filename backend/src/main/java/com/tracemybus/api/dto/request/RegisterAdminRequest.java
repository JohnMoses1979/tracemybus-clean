package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RegisterAdminRequest {
    @NotBlank(message = "Name is required")
    private String name;
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;
    @NotBlank(message = "Email is required")
    @Email(message = "Please enter a valid email address")
    private String email;
    private String password = "1234";
    @NotBlank(message = "Organisation name is required")
    private String orgName;
    private String orgType = "school";
    private String orgAddress = "";
    private String orgPhone = "";
}
