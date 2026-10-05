package com.hirehub.matching;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * The ai-service in /actuator/health ("aiService"), from the periodic check. Not part of the
 * readiness group: without the ai-service the app still works, only CV matching answers 503.
 */
@Component("aiService")
public class AiServiceHealthIndicator implements HealthIndicator {

    private final AiServiceHealthMonitor monitor;

    public AiServiceHealthIndicator(AiServiceHealthMonitor monitor) {
        this.monitor = monitor;
    }

    @Override
    public Health health() {
        Health.Builder builder = switch (monitor.status()) {
            case "UP" -> Health.up();
            case "DOWN" -> Health.down();
            default -> Health.unknown();
        };
        if (monitor.algorithmVersion() != null) {
            builder.withDetail("algorithmVersion", monitor.algorithmVersion());
        }
        return builder.build();
    }
}
