package com.tracemybus.api.controller;

import com.tracemybus.api.entity.Organization;
import com.tracemybus.api.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/orgs")
@RequiredArgsConstructor
public class OrgController {

    private final OrganizationRepository orgRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getOrgs() {
        return ResponseEntity.ok(Map.of("ok", true, "orgs", orgRepository.findAllByOrderByCreatedAtDesc()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateOrg(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Organization org = orgRepository.findById(id).orElse(null);
        if (org == null) return ResponseEntity.status(404).body(Map.of("ok", false, "msg", "Organisation not found."));

        if (body.containsKey("name")) org.setName(String.valueOf(body.get("name")));
        if (body.containsKey("address")) org.setAddress(String.valueOf(body.get("address")));
        if (body.containsKey("phone")) org.setPhone(String.valueOf(body.get("phone")));
        if (body.containsKey("color")) org.setColor(String.valueOf(body.get("color")));
        if (body.containsKey("active")) org.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));
        if (body.containsKey("notificationEnabled")) org.setNotificationEnabled(Boolean.parseBoolean(String.valueOf(body.get("notificationEnabled"))));

        org = orgRepository.save(org);
        return ResponseEntity.ok(Map.of("ok", true, "org", org, "msg", "Organisation updated successfully."));
    }
}
