package com.hirehub.service;

import com.hirehub.dto.LoginRequestDto;
import com.hirehub.dto.LoginResponseDto;
import com.hirehub.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService){
        this.authenticationManager=authenticationManager;
        this.jwtService = jwtService;
    }

    public LoginResponseDto login (LoginRequestDto request ){
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        return LoginResponseDto.builder()
                .token(jwtService.generateToken(request.getEmail()))
                .build();
    }
}
