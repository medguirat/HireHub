package com.hirehub.controller;

import com.hirehub.mail.MailSettings;
import com.hirehub.matching.AiServiceHealthMonitor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final AiServiceHealthMonitor aiServiceHealth;
    private final MailSettings mailSettings;

    public HealthController(AiServiceHealthMonitor aiServiceHealth, MailSettings mailSettings) {
        this.aiServiceHealth = aiServiceHealth;
        this.mailSettings = mailSettings;
    }

    /** The backend is up if this answers; the ai-service status and the email mode are reported alongside. */
    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> ai = new LinkedHashMap<>();
        ai.put("status", aiServiceHealth.status());
        ai.put("algorithmVersion", aiServiceHealth.algorithmVersion());
        ai.put("lastCheckedAt", aiServiceHealth.lastCheckedAt());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("aiService", ai);
        // "mailpit" or "smtp" only (never the server or account): the E2E tests check they read Mailpit.
        body.put("mail", mailSettings.mode().name().toLowerCase(Locale.ROOT));
        return body;
    }
}
