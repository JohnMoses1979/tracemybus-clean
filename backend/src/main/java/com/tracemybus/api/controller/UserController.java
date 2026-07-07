package com.tracemybus.api.controller;

import com.tracemybus.api.dto.request.*;
import com.tracemybus.api.dto.response.UserResponse;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.security.UserPrincipal;
import com.tracemybus.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    private User currentUser() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUser();
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getUsers() {
        var users = userService.getUsers(currentUser()).stream().map(UserResponse::from).toList();
        return ResponseEntity.ok(Map.of("ok", true, "users", users));
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMe(@RequestBody Map<String, Object> body) {
        User updated = userService.updateProfile(currentUser(), body);
        return ResponseEntity.ok(Map.of("ok", true, "user", UserResponse.from(updated), "msg", "Profile updated successfully."));
    }

    @PostMapping("/push-token")
    public ResponseEntity<Map<String, Object>> pushToken(@Valid @RequestBody PushTokenRequest req) {
        User updated = userService.updatePushToken(currentUser(), req.getExpoPushToken(), req.getPlatform());
        String msg = (req.getExpoPushToken() == null || req.getExpoPushToken().isBlank()) ? "Push token cleared." : "Push token saved successfully.";
        return ResponseEntity.ok(Map.of("ok", true, "user", UserResponse.from(updated), "msg", msg));
    }

    @PostMapping("/assign-route")
    public ResponseEntity<Map<String, Object>> assignRoute(@Valid @RequestBody AssignRouteRequest req) {
        try {
            User updated = userService.assignRoute(req.getUserId(), req.getRouteId(), req.getStop());
            return ResponseEntity.ok(Map.of("ok", true, "user", UserResponse.from(updated), "msg", "User assigned to route successfully."));
        } catch (Exception e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/remove-route")
    public ResponseEntity<Map<String, Object>> removeRoute(@Valid @RequestBody RemoveRouteRequest req) {
        try {
            User updated = userService.removeRoute(req.getUserId());
            return ResponseEntity.ok(Map.of("ok", true, "user", UserResponse.from(updated), "msg", "User removed from route successfully."));
        } catch (Exception e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }
}
