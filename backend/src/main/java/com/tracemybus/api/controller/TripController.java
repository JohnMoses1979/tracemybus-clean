package com.tracemybus.api.controller;

import com.tracemybus.api.dto.request.*;
import com.tracemybus.api.entity.SosAlert;
import com.tracemybus.api.entity.Trip;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.security.UserPrincipal;
import com.tracemybus.api.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    private User currentUser() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUser();
    }

    @GetMapping("/{routeId}")
    public ResponseEntity<Map<String, Object>> getTrip(@PathVariable String routeId) {
        try {
            TripService.RouteTrip rt = tripService.getOrCreateTrip(routeId);
            if (rt.route() == null || rt.trip() == null) return ResponseEntity.status(404).body(Map.of("ok", false, "msg", "Trip/route not found."));
            return ResponseEntity.ok(Map.of("ok", true, "trip", rt.trip(), "route", rt.route()));
        } catch (Exception e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/start")
    public ResponseEntity<Map<String, Object>> startTrip(@PathVariable String routeId, @RequestBody(required = false) StartTripRequest req) {
        try {
            String direction = (req != null && req.getDirection() != null) ? req.getDirection() : "pickup";
            Trip trip = tripService.startTrip(routeId, direction);
            return ResponseEntity.ok(Map.of("ok", true, "trip", trip, "msg", ("return".equals(direction) ? "Return" : "Pickup") + " trip started successfully."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/end")
    public ResponseEntity<Map<String, Object>> endTrip(@PathVariable String routeId) {
        try {
            Trip trip = tripService.endTrip(routeId);
            return ResponseEntity.ok(Map.of("ok", true, "trip", trip, "msg", "Trip ended successfully."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/next-stop")
    public ResponseEntity<Map<String, Object>> nextStop(@PathVariable String routeId) {
        try {
            Trip trip = tripService.nextStop(routeId);
            return ResponseEntity.ok(Map.of("ok", true, "trip", trip, "msg", "Moved to next stop."));
        } catch (IllegalStateException e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/passenger-status")
    public ResponseEntity<Map<String, Object>> passengerStatus(@PathVariable String routeId, @Valid @RequestBody PassengerStatusRequest req) {
        try {
            Trip trip = tripService.updatePassengerStatus(routeId, req.getPassengerId(), req.getStatus(), currentUser());
            return ResponseEntity.ok(Map.of("ok", true, "trip", trip, "msg", "Passenger status updated."));
        } catch (IllegalStateException e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/delay")
    public ResponseEntity<Map<String, Object>> delay(@PathVariable String routeId) {
        try {
            Trip trip = tripService.reportDelay(routeId);
            return ResponseEntity.ok(Map.of("ok", true, "trip", trip, "msg", "Delay sent successfully."));
        } catch (IllegalStateException e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/gps")
    public ResponseEntity<Map<String, Object>> toggleGps(@PathVariable String routeId) {
        try {
            Trip trip = tripService.toggleGps(routeId);
            return ResponseEntity.ok(Map.of("ok", true, "trip", trip, "msg", "GPS updated successfully."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/location")
    public ResponseEntity<Map<String, Object>> updateLocation(@PathVariable String routeId, @Valid @RequestBody LocationUpdateRequest req) {
        try {
            Double speedKmh = req.getSpeedKmh() != null ? req.getSpeedKmh() : req.getSpeed();
            Trip trip = tripService.updateLocation(routeId, currentUser(), req.getLatitude(), req.getLongitude(),
                    speedKmh, req.getHeading(), req.getAccuracy(),
                    req.getLocationAddress(), req.getLocationCity(), req.getLocationRegion(),
                    req.getLocationPostalCode(), req.getLocationCountry(), req.getLocationLabel());
            return ResponseEntity.ok(Map.of("ok", true, "trip", trip, "msg", "Live GPS location updated successfully."));
        } catch (SecurityException e) { return ResponseEntity.status(403).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (IllegalStateException e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{routeId}/driver-sos")
    public ResponseEntity<Map<String, Object>> driverSos(@PathVariable String routeId) {
        try {
            SosAlert sos = tripService.driverSos(routeId, currentUser());
            return ResponseEntity.ok(Map.of("ok", true, "sos", sos, "msg", "Driver SOS sent successfully."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }
}
