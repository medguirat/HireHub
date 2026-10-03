package com.hirehub.dto;

/** Signup answer: the new account, already signed in (same token as a login). */
public record RegisterResponseDto(String token, UserResponseDto user) {
}
