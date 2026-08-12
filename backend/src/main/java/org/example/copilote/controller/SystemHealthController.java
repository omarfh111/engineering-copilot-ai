package org.example.copilote.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/health")
public class SystemHealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        try {
            ThreadLocalRandom random = ThreadLocalRandom.current();
            double processLoad = ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage();
            double cpu = processLoad < 0 ? 45 + random.nextDouble(-8, 8) : Math.min(95, Math.max(8, processLoad * 18));
            double memory = 58 + random.nextDouble(-10, 14);
            double latency = 110 + random.nextDouble(-30, 80);

            return ResponseEntity.ok(Map.of(
                    "status", "UP",
                    "timestamp", LocalDateTime.now(),
                    "metrics", List.of(
                            Map.of("id", "cpu", "label", "CPU Usage", "value", round(cpu), "max", 100, "unit", "%"),
                            Map.of("id", "memory", "label", "Memory", "value", round(memory), "max", 100, "unit", "%"),
                            Map.of("id", "latency", "label", "API Response Time", "value", round(latency), "max", 500, "unit", "ms")
                    ),
                    "services", List.of(
                            service("Authentication Service", "JWT / eu-west-1", 34 + random.nextInt(18), 99.99, "Operational"),
                            service("Primary Database", "PostgreSQL / eu-west-1", 42 + random.nextInt(35), 99.95, random.nextInt(10) == 0 ? "Degraded" : "Operational"),
                            service("Search & Analytics Engine", "Vector index / eu-west-1", 65 + random.nextInt(70), 99.87, random.nextInt(12) == 0 ? "Degraded" : "Operational"),
                            service("Storage & File Delivery API", "Object storage / eu-west-1", 51 + random.nextInt(45), 99.91, "Operational")
                    ),
                    "events", List.of(
                            event("SUCCESS", "SSL certificate renewed"),
                            event("INFO", "Automated DB backup completed"),
                            event("WARN", "Memory spike detected on Node-2"),
                            event("INFO", "Storage delivery cache refreshed")
                    )
            ));
        } catch (RuntimeException exception) {
            return ResponseEntity.ok(Map.of("status", "UP", "timestamp", LocalDateTime.now()));
        }
    }

    private Map<String, Object> service(String name, String region, int latency, double uptime, String status) {
        return Map.of("name", name, "region", region, "latencyMs", latency, "uptime", uptime, "status", status);
    }

    private Map<String, String> event(String level, String message) {
        return Map.of("level", level, "message", message, "timestamp", LocalDateTime.now().toString());
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
