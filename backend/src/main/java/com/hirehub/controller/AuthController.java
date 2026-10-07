package com.hirehub.controller;

import com.hirehub.dto.LoginRequestDto;
import com.hirehub.dto.LoginResponseDto;
import com.hirehub.dto.PasswordResetDtos;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.exception.BadRequestException;
import com.hirehub.ratelimit.RateLimiter;
import com.hirehub.ratelimit.RateLimits;
import com.hirehub.ratelimit.TooManyRequestsException;
import com.hirehub.security.SessionCookie;
import com.hirehub.service.AuthService;
import com.hirehub.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

/**
 * Sign up, log in, log out, "forgot password".
 * <p>
 * The browser app's session is an HttpOnly cookie ({@link SessionCookie}) set by login and signup;
 * its JavaScript never sees the token. API clients that aren't browsers (Swagger, scripts) get a
 * token from {@code POST /api/auth/token} and send it as "Authorization: Bearer".
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final RateLimiter rateLimiter;
    private final RateLimits rateLimits;
    private final SessionCookie sessionCookie;

    public AuthController(AuthService authService, PasswordResetService passwordResetService,
                          RateLimiter rateLimiter, RateLimits rateLimits, SessionCookie sessionCookie) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.rateLimiter = rateLimiter;
        this.rateLimits = rateLimits;
        this.sessionCookie = sessionCookie;
    }

    /** Browser login: sets the session cookie and answers with the user. */
    @PostMapping("/login")
    public ResponseEntity<UserResponseDto> login(@RequestBody LoginRequestDto request, HttpServletRequest http) {
        String token = authenticate(request, http);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, sessionCookie.create(token).toString())
                .body(authService.userByEmail(request.getEmail()));
    }

    /** API clients (Swagger, scripts): the same check as login, answered with a token for "Authorization: Bearer". */
    @PostMapping("/token")
    public LoginResponseDto token(@RequestBody LoginRequestDto request, HttpServletRequest http) {
        return new LoginResponseDto(authenticate(request, http));
    }

    /** Ends the browser session: the cookie is deleted. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, sessionCookie.clear().toString()).build();
    }

    /**
     * Sets the CSRF cookie (XSRF-TOKEN), so the app can send its value back in the X-XSRF-TOKEN
     * header. Asked once by the app before its first change (POST, PUT...) if the cookie is missing.
     */
    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        csrfToken.getToken(); // loads the token, which writes the cookie
        return ResponseEntity.noContent().build();
    }

    /**
     * Checks the credentials and returns a login token. Rate-limited per IP address, and per email
     * after repeated failures (see {@link RateLimits}).
     */
    private String authenticate(LoginRequestDto request, HttpServletRequest http) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new BadRequestException("Enter your email and password.");
        }
        rateLimiter.check(rateLimits.loginPerIp(), http.getRemoteAddr());
        String email = request.getEmail();
        long wait = rateLimiter.secondsUntilAllowed(rateLimits.loginFailuresPerEmail(), email);
        if (wait > 0) {
            throw new TooManyRequestsException(wait);
        }
        try {
            String token = authService.login(request).getToken();
            rateLimiter.forget(rateLimits.loginFailuresPerEmail(), email);
            return token;
        } catch (AuthenticationException e) {
            rateLimiter.tryConsume(rateLimits.loginFailuresPerEmail(), email);
            throw e;
        }
    }

    /** Creates the account and signs it in (session cookie), so no second login is needed. */
    @PostMapping("/register")
    public ResponseEntity<UserResponseDto> register(@Valid @RequestBody UserRequestDto request) {
        UserResponseDto user = authService.register(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, sessionCookie.create(authService.issueToken(user.getEmail())).toString())
                .body(user);
    }

    /**
     * Sends a reset link if the email has an account. The answer is the same either way.
     * Too many requests from one IP address: 429. Too many for one email: same answer, no email.
     */
    @PostMapping("/password-reset")
    public PasswordResetDtos.Answer requestPasswordReset(@Valid @RequestBody PasswordResetDtos.Request request,
                                                         HttpServletRequest http) {
        rateLimiter.check(rateLimits.passwordResetPerIp(), http.getRemoteAddr());
        if (rateLimiter.tryConsume(rateLimits.passwordResetPerEmail(), request.email()) > 0) {
            return new PasswordResetDtos.Answer(passwordResetService.requestAnswer());
        }
        return new PasswordResetDtos.Answer(passwordResetService.requestReset(request.email()));
    }

    /** 200 if the link can still be used, 400 RESET_LINK_INVALID otherwise. */
    @PostMapping("/password-reset/check")
    public PasswordResetDtos.Answer checkPasswordResetLink(@Valid @RequestBody PasswordResetDtos.Check request) {
        passwordResetService.checkLink(request.token());
        return new PasswordResetDtos.Answer("This link is valid.");
    }

    @PostMapping("/password-reset/confirm")
    public PasswordResetDtos.Answer resetPassword(@Valid @RequestBody PasswordResetDtos.Confirm request) {
        passwordResetService.resetPassword(request.token(), request.password());
        return new PasswordResetDtos.Answer("Your password has been changed. You can now log in with it.");
    }
}
