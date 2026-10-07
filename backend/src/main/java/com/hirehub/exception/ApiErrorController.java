package com.hirehub.exception;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Replaces Spring Boot's default /error page, which answers in its own format. Errors that
 * never reach a controller (e.g. a request the servlet container itself rejects) end up here.
 */
@RestController
public class ApiErrorController implements ErrorController {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorController.class);

    @RequestMapping("/error")
    public ResponseEntity<ApiError> error(HttpServletRequest request) {
        Object code = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        HttpStatus status = code instanceof Integer value && HttpStatus.resolve(value) != null
                ? HttpStatus.valueOf(value) : HttpStatus.INTERNAL_SERVER_ERROR;
        ApiError error = switch (status) {
            case NOT_FOUND -> ApiError.of(ErrorCodes.NOT_FOUND, "Not found.");
            case UNAUTHORIZED -> ApiError.of(ErrorCodes.AUTH_REQUIRED,
                    "Your session has expired or you are not signed in. Please log in again.");
            case FORBIDDEN -> ApiError.of(ErrorCodes.FORBIDDEN, "You don't have access to this.");
            case METHOD_NOT_ALLOWED -> ApiError.of(ErrorCodes.METHOD_NOT_ALLOWED, "This action isn't available here.");
            default -> status.is4xxClientError()
                    ? ApiError.of(ErrorCodes.BAD_REQUEST, "The request couldn't be processed.")
                    : ApiError.of(ErrorCodes.INTERNAL_ERROR, "An unexpected error occurred. Please try again later.");
        };
        Object failure = request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
        // The correlation id is the request id, already on every log line (RequestIdFilter).
        log.warn("{} on {}: {}", status.value(),
                request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI), failure != null ? failure : error.message());
        return ResponseEntity.status(status).body(error);
    }
}
