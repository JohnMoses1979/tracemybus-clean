package com.tracemybus.api.dto.request;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String email;
    private String stop;
    private String childName;
    private String childClass;
    private String childRollNo;
    private String department;
    private String empId;
    private String shiftTime;
    private String license;
    private String experience;
    private Boolean notificationEnabled;
}