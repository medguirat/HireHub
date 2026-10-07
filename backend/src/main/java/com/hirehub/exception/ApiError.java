package com.hirehub.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.hirehub.config.RequestIdFilter;
import org.slf4j.MDC;

import java.util.Map;
import java.util.UUID;

/**
 * The body of every error the API returns, whatever produced it (controllers, validation,
 * Spring Security, unknown routes):
 * <pre>{ "code": "VALIDATION_FAILED", "message": "...", "correlationId": "...", "fieldErrors": {...} }</pre>
 * {@code message} is a complete sentence the UI can show as is; {@code code} is stable and meant for
 * programs; {@code correlationId} is the request's id (X-Request-Id header, "requestId" in
 * every log line of the request);
 * {@code fieldErrors} (field -> message) is present only for validation errors.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(String code, String message, String correlationId, Map<String, String> fieldErrors) {

    public static ApiError of(String code, String message) {
        return new ApiError(code, message, newCorrelationId(), null);
    }

    public static ApiError withFieldErrors(String code, String message, Map<String, String> fieldErrors) {
        return new ApiError(code, message, newCorrelationId(), fieldErrors);
    }

    private static String newCorrelationId() {
        String requestId = MDC.get(RequestIdFilter.MDC_KEY);
        return requestId != null ? requestId : UUID.randomUUID().toString();
    }
}
