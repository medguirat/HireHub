package com.hirehub.controller;

import com.hirehub.exception.BadRequestException;

import com.hirehub.dto.LoginRequestDto;
import com.hirehub.dto.LoginResponseDto;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponseDto login(@RequestBody LoginRequestDto request) {
        if (request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new BadRequestException("Enter your email and password.");
        }
        return authService.login(request);
    }

    @PostMapping("/register")
    public UserResponseDto register(@Valid @RequestBody UserRequestDto request) {
        return authService.register(request);
    }
}