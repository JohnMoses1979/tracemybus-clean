package com.tracemybus.api.dto.request;

import lombok.Data;

@Data
public class OtpSendRequest {
    private String phone;
    private String email;
    private String purpose = "register";
}
