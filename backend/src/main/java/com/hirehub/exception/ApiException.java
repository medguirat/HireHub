package com.hirehub.exception;

import org.springframework.http.HttpStatus;

/**
 * An error the frontend reacts to specifically, identified by a stable
 * {@code code} next to the user-facing message.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public static ApiException cvRequired() {
        return new ApiException(HttpStatus.CONFLICT, "CV_REQUIRED",
                "Upload your CV to see how well you match this offer.");
    }

    public static ApiException matchingUnavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MATCHING_UNAVAILABLE",
                "The matching service is temporarily unavailable. Please try again in a moment.");
    }

    public static ApiException cvUnreadable(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CV_UNREADABLE", message);
    }

    public static ApiException cvUnsupported(String message) {
        return new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "CV_UNSUPPORTED_FORMAT", message);
    }
}
