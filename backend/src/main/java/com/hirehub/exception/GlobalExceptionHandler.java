package com.hirehub.exception;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<String> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> handleApiException(ApiException ex) {
        Map<String, String> body = new HashMap<>();
        body.put("message", ex.getMessage());
        body.put("code", ex.getCode());
        if (ex.getStatus().is5xxServerError()) {
            String correlationId = UUID.randomUUID().toString();
            log.warn("[{}] {}: {}", correlationId, ex.getCode(), ex.getMessage());
            body.put("correlationId", correlationId);
        }
        return ResponseEntity.status(ex.getStatus()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.badRequest().body(errors);
    }

    // Thrown by Spring's multipart resolver itself, before the controller method
    // even runs, whenever an uploaded file (or the whole request) is bigger than
    // spring.servlet.multipart.max-file-size / max-request-size. Previously fell
    // through to handleGeneric() and showed a meaningless 500.
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        String correlationId = UUID.randomUUID().toString();
        log.warn("[{}] Upload rejected, file too large: {}", correlationId, ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(errorBody("Your file must be under 10 MB. Please compress it or choose a smaller file.", correlationId));
    }

    /** Malformed JSON or a value of the wrong type (e.g. an unknown enum value): the client's fault, not ours. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        String message = "The request body is not valid JSON.";
        if (ex.getCause() instanceof InvalidFormatException invalid) {
            String field = invalid.getPath().stream()
                    .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
                    .collect(Collectors.joining(".")).replace(".[", "[");
            Class<?> target = invalid.getTargetType();
            message = target != null && target.isEnum()
                    ? "Invalid value for " + field + ". Allowed values: "
                      + Arrays.stream(target.getEnumConstants()).map(Object::toString).collect(Collectors.joining(", ")) + "."
                    : "Invalid value for " + field + ".";
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<String> handleMissingPart(MissingServletRequestPartException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Please choose a file before submitting.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<String> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String correlationId = UUID.randomUUID().toString();
        log.warn("[{}] Data integrity violation: {}", correlationId, ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body("This operation violates a data constraint (e.g. duplicate value).");
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<String> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(Map.of("message", "This action isn't available here (" + ex.getMethod() + " not supported)."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Not found."));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<String> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have access to this resource.");
    }

    // Catch-all for anything not mapped above. MUST log the full exception with
    // a correlation ID: this used to silently swallow the real cause (e.g. the
    // multipart size issue above, before it had its own handler), making every
    // unexpected 500 undiagnosable from the server side.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        String correlationId = UUID.randomUUID().toString();
        log.error("[{}] Unhandled exception", correlationId, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorBody("An unexpected error occurred. Please try again later.", correlationId));
    }

    private Map<String, String> errorBody(String message, String correlationId) {
        Map<String, String> body = new HashMap<>();
        body.put("message", message);
        body.put("correlationId", correlationId);
        return body;
    }
}