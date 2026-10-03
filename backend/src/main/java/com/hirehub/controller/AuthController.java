package com.hirehub.controller;

import com.hirehub.dto.LoginRequestDto;
import com.hirehub.dto.LoginResponseDto;
import com.hirehub.dto.PasswordResetDtos;
import com.hirehub.dto.RegisterResponseDto;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.exception.BadRequestException;
import com.hirehub.ratelimit.RateLimiter;
import com.hirehub.ratelimit.RateLimits;
import com.hirehub.service.AuthService;
import com.hirehub.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final RateLimiter rateLimiter;
    private final RateLimits rateLimits;

    public AuthController(AuthService authService, PasswordResetService passwordResetService,
                          RateLimiter rateLimiter, RateLimits rateLimits) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.rateLimiter = rateLimiter;
        this.rateLimits = rateLimits;
    }

    @PostMapping("/login")
    public LoginResponseDto login(@RequestBody LoginRequestDto request) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new BadRequestException("Enter your email and password.");
        }
        return authService.login(request);
    }

    /** Creates the account and signs it in: the answer carries a login token, so no second login is needed. */
    @PostMapping("/register")
    public RegisterResponseDto register(@Valid @RequestBody UserRequestDto request) {
        UserResponseDto user = authService.register(request);
        return new RegisterResponseDto(authService.issueToken(user.getEmail()), user);
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
