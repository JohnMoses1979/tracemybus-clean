package com.tracemybus.api.controller;

import com.tracemybus.api.dto.request.PassengerSosRequest;
import com.tracemybus.api.dto.request.SosResponseRequest;
import com.tracemybus.api.entity.SosAlert;
import com.tracemybus.api.entity.User;
import com.tracemybus.api.security.UserPrincipal;
import com.tracemybus.api.service.SosService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/sos")
@RequiredArgsConstructor
public class SosController {

    private final SosService sosService;

    private User currentUser() {
        return ((UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUser();
    }

    @PostMapping("/passenger")
    public ResponseEntity<Map<String, Object>> passengerSos(@Valid @RequestBody PassengerSosRequest req) {
        try { return ResponseEntity.ok(sosService.passengerSos(req.getRouteId(), currentUser()));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSosAlerts() {
        return ResponseEntity.ok(Map.of("ok", true, "sosAlerts", sosService.getSosAlerts(currentUser())));
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<Map<String, Object>> respond(@PathVariable String id, @RequestBody(required = false) SosResponseRequest req) {
        try {
            SosAlert sos = sosService.respondSos(id, req != null ? req.getResponse() : null, currentUser());
            return ResponseEntity.ok(Map.of("ok", true, "sos", sos, "msg", "SOS response sent successfully."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (SecurityException e) { return ResponseEntity.status(403).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (IllegalStateException e) { return ResponseEntity.badRequest().body(Map.of("ok", false, "msg", e.getMessage())); }
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolve(@PathVariable String id, @RequestBody(required = false) SosResponseRequest req) {
        try {
            SosAlert sos = sosService.resolveSos(id, req != null ? req.getResponse() : null, currentUser());
            return ResponseEntity.ok(Map.of("ok", true, "sos", sos, "msg", "SOS resolved successfully."));
        } catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("ok", false, "msg", e.getMessage()));
        } catch (SecurityException e) { return ResponseEntity.status(403).body(Map.of("ok", false, "msg", e.getMessage())); }
    }
}
