package com.tracemybus.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class RegisterUserRequest {
    @NotBlank(message = "Name is required")
    private String name;
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^\\d{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;
    @NotBlank(message = "Email is required")
    @Email(message = "Please enter a valid email address")
    private String email;
    private String password = "1234";
    @NotBlank(message = "Role is required")
    private String role;
    @NotBlank(message = "Organisation is required")
    private String orgId;
    private String orgName = "";
    private String org = "";
    private String routeId;
    private String stop = "";
    private List<Map<String, Object>> children = new ArrayList<>();
    private String childName = "";
    private String childClass = "";
    private String childRollNo = "";
    private String department = "";
    private String empId = "";
    private String shiftTime = "";
    private String license = "";
    private String experience = "";
}
