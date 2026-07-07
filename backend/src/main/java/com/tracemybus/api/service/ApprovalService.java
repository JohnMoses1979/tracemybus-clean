package com.tracemybus.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracemybus.api.entity.*;
import com.tracemybus.api.enums.*;
import com.tracemybus.api.repository.*;
import com.tracemybus.api.util.DateTimeUtils;
import com.tracemybus.api.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final ApprovalRepository approvalRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository orgRepository;
    private final TripRepository tripRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public List<Approval> getApprovals(String status) {
        if (status != null && !status.isBlank()) {
            return approvalRepository.findByStatusOrderByCreatedAtDesc(ApprovalStatus.valueOf(status));
        }
        return approvalRepository.findAllByOrderByCreatedAtDesc();
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public Map<String, Object> approve(String approvalId) {
        Approval approval = approvalRepository.findById(approvalId)
                .orElseThrow(() -> new NoSuchElementException("Approval request not found."));
        if (approval.getStatus() != ApprovalStatus.pending) throw new IllegalStateException("This request is already processed.");

        Map<String, Object> result = new LinkedHashMap<>();

        if (approval.getType() == ApprovalType.admin_request) {
            OrgType orgType;
            try { orgType = OrgType.valueOf(approval.getOrgType() != null ? approval.getOrgType().toLowerCase() : "school"); }
            catch (Exception e) { orgType = OrgType.school; }

            Organization org = Organization.builder().id(IdGenerator.makeId("org")).name(approval.getOrgName())
                    .type(orgType).address(approval.getOrgAddress() != null ? approval.getOrgAddress() : "")
                    .phone(approval.getOrgPhone() != null ? approval.getOrgPhone() : "").color("#2E7D32").active(true).build();
            org = orgRepository.save(org);

            User admin = User.builder().id(IdGenerator.makeId("admin")).role(UserRole.admin).name(approval.getName())
                    .phone(approval.getPhone()).email(approval.getEmail() != null ? approval.getEmail() : "")
                    .passwordHash(approval.getPasswordHash()).org(approval.getOrgName()).orgId(org.getId())
                    .initials(DateTimeUtils.initials(approval.getName())).approved(true).active(true).build();
            admin = userRepository.save(admin);

            org.setAdminId(admin.getId()); orgRepository.save(org);
            approval.setStatus(ApprovalStatus.approved); approvalRepository.save(approval);

            notificationService.createNotification(admin.getId(), "\u2705", "Organisation Approved!",
                    "Your organisation \"" + approval.getOrgName() + "\" has been approved.", Map.of());

            result.put("ok", true); result.put("request", approval); result.put("org", org);
            result.put("user", admin); result.put("msg", "Admin approved successfully.");
        } else {
            String role = approval.getRole() != null ? approval.getRole() : "school";

            List<Map<String, Object>> children;
            try { children = objectMapper.readValue(approval.getChildren() != null ? approval.getChildren() : "[]",
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class)); }
            catch (Exception e) { children = new ArrayList<>(); }

            if (("school".equals(role) || "college".equals(role)) && children.isEmpty()) {
                Map<String, Object> child = new LinkedHashMap<>();
                child.put("id", IdGenerator.makeId("child"));
                child.put("name", approval.getChildName() != null ? approval.getChildName() : "");
                child.put("className", approval.getChildClass() != null ? approval.getChildClass() : "");
                child.put("rollNo", approval.getChildRollNo() != null ? approval.getChildRollNo() : "");
                children = List.of(child);
            }

            String childName = !children.isEmpty() ? String.valueOf(children.get(0).getOrDefault("name", "")) : (approval.getChildName() != null ? approval.getChildName() : "");
            String childClass = !children.isEmpty() ? String.valueOf(children.get(0).getOrDefault("className", "")) : (approval.getChildClass() != null ? approval.getChildClass() : "");
            String childRollNo = !children.isEmpty() ? String.valueOf(children.get(0).getOrDefault("rollNo", "")) : (approval.getChildRollNo() != null ? approval.getChildRollNo() : "");
            String childrenStr;
            try { childrenStr = objectMapper.writeValueAsString(children); } catch (Exception e) { childrenStr = "[]"; }

            User user = User.builder().id(IdGenerator.makeId("user")).role(UserRole.valueOf(role)).name(approval.getName())
                    .phone(approval.getPhone()).email(approval.getEmail() != null ? approval.getEmail() : "")
                    .passwordHash(approval.getPasswordHash()).org(approval.getOrgName() != null ? approval.getOrgName() : "")
                    .orgId(approval.getOrgId()).routeId(approval.getRouteId()).stop(approval.getStop() != null ? approval.getStop() : "")
                    .children(childrenStr).childName(childName).childClass(childClass).childRollNo(childRollNo)
                    .department(approval.getDepartment() != null ? approval.getDepartment() : "")
                    .empId(approval.getEmpId() != null ? approval.getEmpId() : "")
                    .shiftTime(approval.getShiftTime() != null ? approval.getShiftTime() : "")
                    .license(approval.getLicense() != null ? approval.getLicense() : "")
                    .experience(approval.getExperience() != null ? approval.getExperience() : "")
                    .initials(DateTimeUtils.initials(approval.getName())).approved(true).active(true).build();
            user = userRepository.save(user);

            if (approval.getRouteId() != null && List.of("school", "college", "employee").contains(role)) {
                final User savedUser = user;
                tripRepository.findByRouteId(approval.getRouteId()).ifPresent(trip -> {
                    try {
                        Map<String, String> pickup = objectMapper.readValue(trip.getPickupStatus() != null ? trip.getPickupStatus() : "{}", Map.class);
                        Map<String, String> ret = objectMapper.readValue(trip.getReturnStatus() != null ? trip.getReturnStatus() : "{}", Map.class);
                        pickup = new HashMap<>(pickup); ret = new HashMap<>(ret);
                        pickup.put(savedUser.getId(), "waiting"); ret.put(savedUser.getId(), "waiting");
                        trip.setPickupStatus(objectMapper.writeValueAsString(pickup));
                        trip.setReturnStatus(objectMapper.writeValueAsString(ret));
                        tripRepository.save(trip);
                    } catch (Exception e) { /* ignore */ }
                });
            }

            approval.setStatus(ApprovalStatus.approved); approvalRepository.save(approval);
            notificationService.createNotification(user.getId(), "\u2705", "Account Approved!",
                    "Your account has been approved. You can now login.", Map.of());

            result.put("ok", true); result.put("request", approval); result.put("user", user); result.put("msg", "User approved successfully.");
        }
        return result;
    }

    @Transactional
    public Approval reject(String approvalId) {
        Approval approval = approvalRepository.findById(approvalId)
                .orElseThrow(() -> new NoSuchElementException("Approval request not found."));
        approval.setStatus(ApprovalStatus.rejected);
        return approvalRepository.save(approval);
    }
}
