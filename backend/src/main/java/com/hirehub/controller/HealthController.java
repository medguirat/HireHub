package com.hirehub.controller;

import com.hirehub.matching.AiServiceHealthMonitor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final AiServiceHealthMonitor aiServiceHealth;

    public HealthController(AiServiceHealthMonitor aiServiceHealth) {
        this.aiServiceHealth = aiServiceHealth;
    }

    /** The backend is up if this answers; the ai-service status is reported alongside. */
    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> ai = new LinkedHashMap<>();
        ai.put("status", aiServiceHealth.status());
        ai.put("algorithmVersion", aiServiceHealth.algorithmVersion());
        ai.put("lastCheckedAt", aiServiceHealth.lastCheckedAt());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("aiService", ai);
        return body;
    }
}
