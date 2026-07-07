package com.tracemybus.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean ok;
    private String msg;
    private T data;

    // Additional fields used by various endpoints
    private String token;
    private Object user;
    private Object trip;
    private Object route;
    private Object org;
    private Object request;
    private Object sos;
    private Object notifications;
    private Object users;
    private Object routes;
    private Object orgs;
    private Object approvals;
    private Object sosAlerts;
    private Integer count;
    private Boolean pending;
    private Boolean rejected;
    private String phone;
    private Integer expiresInMinutes;
    private Boolean notificationEnabled;
    private Object deliveredTo;

    public static <T> ApiResponse<T> success(String msg) {
        ApiResponse<T> r = new ApiResponse<>();
        r.ok = true;
        r.msg = msg;
        return r;
    }

    public static <T> ApiResponse<T> error(String msg) {
        ApiResponse<T> r = new ApiResponse<>();
        r.ok = false;
        r.msg = msg;
        return r;
    }
}
