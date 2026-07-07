package com.tracemybus.api.controller;

import com.tracemybus.api.entity.Organization;
import com.tracemybus.api.entity.Route;
import com.tracemybus.api.repository.OrganizationRepository;
import com.tracemybus.api.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final OrganizationRepository orgRepository;
    private final RouteRepository routeRepository;

    @GetMapping("/orgs")
    public ResponseEntity<Map<String, Object>> getOrgs() {
        return ResponseEntity.ok(Map.of("ok", true, "orgs", orgRepository.findByActiveOrderByCreatedAtDesc(true)));
    }

    @GetMapping("/routes")
    public ResponseEntity<Map<String, Object>> getRoutes(@RequestParam(required = false) String orgId) {
        List<Route> routes = (orgId != null && !orgId.isBlank())
                ? routeRepository.findByOrgIdAndActiveOrderByCreatedAtDesc(orgId, true)
                : routeRepository.findByActiveOrderByCreatedAtDesc(true);

        Set<String> activeOrgIds = orgRepository.findByActiveOrderByCreatedAtDesc(true)
                .stream().map(Organization::getId).collect(Collectors.toSet());

        return ResponseEntity.ok(Map.of("ok", true, "routes",
                routes.stream().filter(r -> activeOrgIds.contains(r.getOrgId())).toList()));
    }
}
