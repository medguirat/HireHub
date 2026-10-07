package com.hirehub.security;

/** The JWT signing secret is missing or unusable; the application refuses to start. */
public class InvalidJwtSecretException extends RuntimeException {

    public InvalidJwtSecretException(String message) {
        super(message);
    }
}
