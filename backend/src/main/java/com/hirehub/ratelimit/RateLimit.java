package com.hirehub.ratelimit;

import java.time.Duration;

/**
 * At most {@code capacity} requests per {@code period} for one key (an IP address, an email...).
 * Tokens come back gradually over the period, so a client that stops for a while can try again.
 */
public record RateLimit(String name, int capacity, Duration period) {

    public RateLimit {
        if (capacity < 1) {
            throw new IllegalArgumentException("Rate limit " + name + ": capacity must be at least 1.");
        }
    }
}
