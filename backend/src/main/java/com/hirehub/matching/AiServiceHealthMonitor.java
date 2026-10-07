package com.hirehub.matching;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Periodically checks the ai-service so its status (and the scoring algorithm
 * version, used to invalidate cached match scores) is known without waiting
 * for a candidate to hit an error.
 */
@Component
public class AiServiceHealthMonitor {

    private static final Logger log = LoggerFactory.getLogger(AiServiceHealthMonitor.class);

    private final AiServiceClient client;
    private final boolean enabled;

    private volatile Boolean up;
    private volatile String algorithmVersion;
    private volatile Instant lastCheckedAt;

    public AiServiceHealthMonitor(AiServiceClient client,
                                  @Value("${ai-service.health-check.enabled:true}") boolean enabled) {
        this.client = client;
        this.enabled = enabled;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void checkOnStartup() {
        check();
    }

    @Scheduled(fixedDelayString = "${ai-service.health-check.interval-ms:15000}",
               initialDelayString = "${ai-service.health-check.interval-ms:15000}")
    public void check() {
        if (!enabled) {
            return;
        }
        AiServiceClient.Health health = client.health();
        Boolean previous = up;
        up = health.ready();
        lastCheckedAt = Instant.now();
        if (health.ready()) {
            algorithmVersion = health.algorithmVersion();
            if (!Boolean.TRUE.equals(previous)) {
                log.info("ai-service is up (scoring algorithm {})", algorithmVersion);
            }
        } else if (!Boolean.FALSE.equals(previous)) {
            log.warn("ai-service is unreachable or still loading; CV matching will return 503 until it is back");
        }
    }

    /** "UP", "DOWN", or "UNKNOWN" before the first check. */
    public String status() {
        return up == null ? "UNKNOWN" : (up ? "UP" : "DOWN");
    }

    /** Last algorithm version reported by a healthy ai-service, or null if never seen. */
    public String algorithmVersion() {
        return algorithmVersion;
    }

    public Instant lastCheckedAt() {
        return lastCheckedAt;
    }
}
