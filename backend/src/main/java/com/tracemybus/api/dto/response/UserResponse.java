package com.tracemybus.api.dto.response;

import com.tracemybus.api.entity.User;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    private String id;
    private String role;
    private String name;
    private String phone;
    private String email;
    private String org;
    private String orgId;
    private String routeId;
    private String stop;
    private String children;
    private String childName;
    private String childClass;
    private String childRollNo;
    private String department;
    private String empId;
    private String shiftTime;
    private String license;
    private String experience;
    private String initials;
    private Boolean approved;
    private Boolean active;
    private Boolean notificationEnabled;
    private String expoPushToken;
    private String pushPlatform;
    private LocalDateTime pushTokenUpdatedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserResponse from(User user) {
        if (user == null) return null;
        return UserResponse.builder()
                .id(user.getId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .name(user.getName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .org(user.getOrg())
                .orgId(user.getOrgId())
                .routeId(user.getRouteId())
                .stop(user.getStop())
                .children(user.getChildren())
                .childName(user.getChildName())
                .childClass(user.getChildClass())
                .childRollNo(user.getChildRollNo())
                .department(user.getDepartment())
                .empId(user.getEmpId())
                .shiftTime(user.getShiftTime())
                .license(user.getLicense())
                .experience(user.getExperience())
                .initials(user.getInitials())
                .approved(user.getApproved())
                .active(user.getActive())
                .notificationEnabled(user.getNotificationEnabled())
                .expoPushToken(user.getExpoPushToken())
                .pushPlatform(user.getPushPlatform())
                .pushTokenUpdatedAt(user.getPushTokenUpdatedAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
