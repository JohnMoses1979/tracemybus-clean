package com.tracemybus.api.controller;

import com.tracemybus.api.dto.response.UserResponse;
import com.tracemybus.api.entity.Approval;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.service.ApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalService approvalService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getApprovals(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(Map.of("ok", true, "approvals", approvalService.getApprovals(status)));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable String id) {
        try {
            Map<String, Object> result = approvalService.approve(id);
            if (result.containsKey("user") && result.get("user") instanceof User u) {
                result.put("user", UserResponse.from(u));
            }
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (IllegalStateException e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable String id) {
        try {
            Approval approval = approvalService.reject(id);
            return ResponseEntity.ok(Map.of("ok", true, "request", approval, "msg", "Request rejected successfully."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }
}
