package com.hirehub.ratelimit;

import com.hirehub.exception.ApiException;
import com.hirehub.exception.ErrorCodes;
import org.springframework.http.HttpStatus;

/** 429, with the number of seconds to wait (sent as the Retry-After header). */
public class TooManyRequestsException extends ApiException {

    private final long retryAfterSeconds;

    public TooManyRequestsException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, ErrorCodes.TOO_MANY_REQUESTS, message(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    private static String message(long seconds) {
        long minutes = (seconds + 59) / 60;
        String wait = seconds < 60 ? "a minute" : minutes + " minutes";
        return "Too many attempts. Please wait " + wait + " and try again.";
    }
}
