package com.tracemybus.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracemybus.api.dto.request.CreateRouteRequest;
import com.tracemybus.api.entity.Route;
import com.tracemybus.api.entity.Trip;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.enums.TripStatus;
import com.tracemybus.api.repository.RouteRepository;
import com.tracemybus.api.repository.TripRepository;
import com.tracemybus.api.repository.UserRepository;
import com.tracemybus.api.security.UserPrincipal;
import com.tracemybus.api.util.IdGenerator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteRepository routeRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private User currentUser() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUser();
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getRoutes() {
        return ResponseEntity.ok(Map.of("ok", true, "routes", routeRepository.findAllByOrderByCreatedAtDesc()));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createRoute(@Valid @RequestBody CreateRouteRequest req) {
        String stopsJson;
        try { stopsJson = objectMapper.writeValueAsString(req.getStops()); } catch (Exception e) { stopsJson = "[]"; }

        Route route = Route.builder()
                .id(IdGenerator.makeId("route"))
                .orgId(req.getOrgId() != null ? req.getOrgId() : currentUser().getOrgId())
                .name(req.getName())
                .busNo(req.getBusNo() != null ? req.getBusNo() : "")
                .vehicleNo(req.getVehicleNo() != null ? req.getVehicleNo() : (req.getBusNo() != null ? req.getBusNo() : ""))
                .driverId(req.getDriverId())
                .driverName(req.getDriverName() != null ? req.getDriverName() : "")
                .startTime(req.getStartTime() != null ? req.getStartTime() : "")
                .returnTime(req.getReturnTime() != null ? req.getReturnTime() : "")
                .stops(stopsJson)
                .active(req.getActive() != null ? req.getActive() : true)
                .build();
        route = routeRepository.save(route);

        Trip trip = Trip.builder()
                .id(IdGenerator.makeId("trip")).routeId(route.getId()).orgId(route.getOrgId())
                .status(TripStatus.not_started).pickupStatus("{}").returnStatus("{}").logs("[]")
                .build();
        tripRepository.save(trip);

        return ResponseEntity.status(201).body(Map.of("ok", true, "route", route, "msg", "Route created successfully."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateRoute(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Route route = routeRepository.findById(id).orElse(null);
        if (route == null) return ResponseEntity.status(404).body(Map.of("ok", false, "msg", "Route not found."));

        if (body.containsKey("name")) route.setName(String.valueOf(body.get("name")));
        if (body.containsKey("busNo")) route.setBusNo(String.valueOf(body.get("busNo")));
        if (body.containsKey("vehicleNo")) route.setVehicleNo(String.valueOf(body.get("vehicleNo")));
        if (body.containsKey("driverId")) route.setDriverId(body.get("driverId") != null ? String.valueOf(body.get("driverId")) : null);
        if (body.containsKey("driverName")) route.setDriverName(String.valueOf(body.get("driverName")));
        if (body.containsKey("startTime")) route.setStartTime(String.valueOf(body.get("startTime")));
        if (body.containsKey("returnTime")) route.setReturnTime(String.valueOf(body.get("returnTime")));
        if (body.containsKey("stops")) {
            try { route.setStops(objectMapper.writeValueAsString(body.get("stops"))); } catch (Exception e) { /* ignore */ }
        }
        if (body.containsKey("active")) route.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));

        route = routeRepository.save(route);
        return ResponseEntity.ok(Map.of("ok", true, "route", route, "msg", "Route updated successfully."));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteRoute(@PathVariable String id) {
        Route route = routeRepository.findById(id).orElse(null);
        if (route == null) return ResponseEntity.status(404).body(Map.of("ok", false, "msg", "Route not found."));

        userRepository.findByRouteIdAndApprovedAndActive(id, true, true).forEach(user -> {
            user.setRouteId(null); user.setStop(""); userRepository.save(user);
        });

        tripRepository.deleteByRouteId(id);
        routeRepository.delete(route);
        return ResponseEntity.ok(Map.of("ok", true, "msg", "Route deleted successfully."));
    }
}
