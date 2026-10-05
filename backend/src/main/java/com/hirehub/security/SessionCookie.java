package com.hirehub.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * The browser's session: the login token (JWT) in a cookie the page's JavaScript can't read
 * (HttpOnly), sent only to the API (Path=/api) and never with requests started by other sites
 * (SameSite=Strict). Secure (HTTPS only) in production.
 * <p>
 * Requests that carry it must also carry the CSRF token (SecurityConfig). API clients that aren't
 * browsers (Swagger, scripts) send the token in an Authorization: Bearer header instead.
 */
@Component
public class SessionCookie {

    public static final String NAME = "hirehub_session";
    private static final String PATH = "/api";

    private final boolean secure;
    private final Duration maxAge;

    public SessionCookie(@Value("${app.session.cookie-secure:false}") boolean secure,
                         @Value("${jwt.expiration-ms:3600000}") long expirationMs) {
        this.secure = secure;
        this.maxAge = Duration.ofMillis(expirationMs);
    }

    public ResponseCookie create(String token) {
        return base(token).maxAge(maxAge).build();
    }

    /** Tells the browser to delete the cookie (logout, or a session that is no longer valid). */
    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    public static Optional<String> read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (NAME.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return Optional.of(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Strict").path(PATH);
    }
}
