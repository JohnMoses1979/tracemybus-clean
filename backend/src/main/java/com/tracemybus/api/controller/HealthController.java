package com.tracemybus.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public Map<String, Object> root() {
        return Map.of("ok", true, "message", "TraceMyBus Spring Boot API is running");
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of("ok", true, "database", "mysql", "status", "healthy", "time", Instant.now().toString());
    }
}
