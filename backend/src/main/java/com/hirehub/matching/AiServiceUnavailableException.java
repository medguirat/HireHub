package com.hirehub.matching;

/** The ai-service couldn't be reached, timed out, is still loading, or failed. */
public class AiServiceUnavailableException extends RuntimeException {

    public AiServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
