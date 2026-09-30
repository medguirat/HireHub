package com.hirehub.exception;

/** The request can't be done as asked (400). The message is shown to the user. */
public class BadRequestException extends RuntimeException {

    private final String code;

    public BadRequestException(String message) {
        this(ErrorCodes.BAD_REQUEST, message);
    }

    public BadRequestException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
