package com.hirehub.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request bodies of the "forgot password" flow. */
public final class PasswordResetDtos {

    private PasswordResetDtos() {
    }

    public record Request(
            @NotBlank(message = "Enter your email") @Email(message = "Email must be valid") String email) {
    }

    public record Check(@NotBlank(message = "The reset link is incomplete") String token) {
    }

    /** Same password rule as at signup. */
    public record Confirm(
            @NotBlank(message = "The reset link is incomplete") String token,
            @NotBlank(message = "Password is required")
            @Size(min = 8, message = "Password must be at least 8 characters") String password) {
    }

    public record Answer(String message) {
    }
}
