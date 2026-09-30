package com.hirehub.exception;

/** Signed in, but not allowed: wrong role, or someone else's resource. Mapped to 403. */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
