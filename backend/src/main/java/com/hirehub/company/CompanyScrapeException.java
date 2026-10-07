package com.hirehub.company;

/** The company website can't be imported; the message is meant for the recruiter. */
public class CompanyScrapeException extends RuntimeException {

    private final String code;

    public CompanyScrapeException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
