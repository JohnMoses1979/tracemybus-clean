package com.tracemybus.api.controller;

import com.tracemybus.api.dto.request.BroadcastRequest;
import com.tracemybus.api.entity.Notification;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.enums.UserRole;
import com.tracemybus.api.repository.NotificationRepository;
import com.tracemybus.api.repository.UserRepository;
import com.tracemybus.api.security.UserPrincipal;
import com.tracemybus.api.service.NotificationService;
import com.tracemybus.api.util.DateTimeUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepo;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User currentUser() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUser();
    }

    @GetMapping("/api/notifications")
    public ResponseEntity<Map<String, Object>> getNotifications() {
        User user = currentUser();
        if (Boolean.FALSE.equals(user.getNotificationEnabled())) {
            return ResponseEntity.ok(Map.of("ok", true, "notifications", List.of(), "notificationEnabled", false));
        }
        return ResponseEntity.ok(Map.of("ok", true, "notifications",
                notificationRepo.findByUserIdOrderByCreatedAtDesc(user.getId()), "notificationEnabled", true));
    }

    @PostMapping("/api/notifications/read-all")
    @Transactional
    public ResponseEntity<Map<String, Object>> readAll() {
        notificationRepo.markAllReadByUserId(currentUser().getId());
        return ResponseEntity.ok(Map.of("ok", true, "msg", "All notifications marked as read."));
    }

    @PostMapping("/api/notifications/{id}/read")
    public ResponseEntity<Map<String, Object>> readOne(@PathVariable String id) {
        Notification n = notificationRepo.findById(id).orElse(null);
        if (n == null || !n.getUserId().equals(currentUser().getId()))
            return ResponseEntity.status(404).body(Map.of("ok", false, "msg", "Notification not found."));
        n.setRead(true);
        n = notificationRepo.save(n);
        return ResponseEntity.ok(Map.of("ok", true, "notification", n));
    }

    @PostMapping("/api/broadcast")
    public ResponseEntity<Map<String, Object>> broadcast(@Valid @RequestBody BroadcastRequest req) {
        User user = currentUser();
        String message = req.getMessage().trim();

        List<User> receivers;
        if (user.getRole() == UserRole.superadmin) {
            receivers = userRepository.findByRoleAndApprovedAndActive(UserRole.admin, true, true);
        } else if (user.getRole() == UserRole.admin) {
            if (user.getOrgId() == null || user.getOrgId().isBlank())
                return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", "Your admin account is not linked to any organisation."));
            receivers = userRepository.findByOrgIdAndActiveAndRoleIn(user.getOrgId(), true,
                    List.of(UserRole.driver, UserRole.school, UserRole.college, UserRole.employee));
        } else {
            return ResponseEntity.status(403).body(Map.of("ok", false, "msg", "Only Super Admin and Admin can send messages."));
        }

        if (receivers.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", "No approved users found under your organisation."));

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("type", "message"); extra.put("sender", user.getName());
        extra.put("senderRole", user.getRole().name()); extra.put("senderOrgId", user.getOrgId() != null ? user.getOrgId() : "");
        extra.put("audience", ""); extra.put("audienceDetails", "");
        extra.put("deliveredAt", DateTimeUtils.dateNow() + " " + DateTimeUtils.timeNow());

        notificationService.notifyMany(receivers.stream().map(User::getId).toList(), "\uD83D\uDCE9", "Message", message, extra);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", true); body.put("count", receivers.size());
        body.put("msg", "Message delivered to " + receivers.size() + " user" + (receivers.size() == 1 ? "" : "s") + ".");
        return ResponseEntity.ok(body);
    }
}
