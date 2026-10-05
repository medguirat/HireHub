package com.hirehub.ratelimit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** The limits applied to sensitive endpoints (values in application.properties). */
@Component
public class RateLimits {

    private final RateLimit passwordResetPerIp;
    private final RateLimit passwordResetPerEmail;
    private final RateLimit loginPerIp;
    private final RateLimit loginFailuresPerEmail;

    public RateLimits(@Value("${app.rate-limit.password-reset.per-ip:10}") int passwordResetPerIp,
                      @Value("${app.rate-limit.password-reset.per-email:5}") int passwordResetPerEmail,
                      @Value("${app.rate-limit.login.per-ip:30}") int loginPerIp,
                      @Value("${app.rate-limit.login.failures-per-email:5}") int loginFailuresPerEmail) {
        this.passwordResetPerIp = new RateLimit("password-reset-ip", passwordResetPerIp, Duration.ofMinutes(15));
        this.passwordResetPerEmail = new RateLimit("password-reset-email", passwordResetPerEmail, Duration.ofHours(1));
        this.loginPerIp = new RateLimit("login-ip", loginPerIp, Duration.ofMinutes(5));
        this.loginFailuresPerEmail = new RateLimit("login-failures-email", loginFailuresPerEmail, Duration.ofMinutes(15));
    }

    /** Login attempts from one IP address, per 5 minutes (successful or not). Over it: 429. */
    public RateLimit loginPerIp() {
        return loginPerIp;
    }

    /**
     * Failed logins for one email, per 15 minutes. Over it, every login for that email gets 429,
     * even with the right password, until the allowance refills; a successful login resets it. It
     * applies to any email typed, so it reveals nothing about which ones have an account.
     */
    public RateLimit loginFailuresPerEmail() {
        return loginFailuresPerEmail;
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
