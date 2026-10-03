package com.hirehub.ratelimit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** The limits applied to sensitive endpoints (values in application.properties). */
@Component
public class RateLimits {

    private final RateLimit passwordResetPerIp;
    private final RateLimit passwordResetPerEmail;

    public RateLimits(@Value("${app.rate-limit.password-reset.per-ip:10}") int passwordResetPerIp,
                      @Value("${app.rate-limit.password-reset.per-email:5}") int passwordResetPerEmail) {
        this.passwordResetPerIp = new RateLimit("password-reset-ip", passwordResetPerIp, Duration.ofMinutes(15));
        this.passwordResetPerEmail = new RateLimit("password-reset-email", passwordResetPerEmail, Duration.ofHours(1));
    }

    /** "Forgot password" requests from one IP address, per 15 minutes. Over it: 429. */
    public RateLimit passwordResetPerIp() {
        return passwordResetPerIp;
    }

    /**
     * "Forgot password" requests for one email, per hour. Over it, the answer stays the same but no
     * email is sent, so the limit reveals nothing about who has an account.
     */
    public RateLimit passwordResetPerEmail() {
        return passwordResetPerEmail;
    }
}
