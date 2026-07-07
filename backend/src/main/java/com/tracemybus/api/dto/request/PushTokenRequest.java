package com.tracemybus.api.dto.request;

import lombok.Data;

@Data
public class PushTokenRequest {
    private String expoPushToken = "";
    private String platform = "";
}
