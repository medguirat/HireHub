package com.hirehub.exception;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.hirehub.ratelimit.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Every exception a controller throws becomes an {@link ApiError}. Errors raised before a
 * controller runs (authentication, access rules) are written in the same format by the
 * security handlers, and anything else that reaches /error by {@link ApiErrorController}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> handleBadRequest(BadRequestException ex) {
        return respond(HttpStatus.BAD_REQUEST, ApiError.of(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleResourceNotFound(ResourceNotFoundException ex) {
        return respond(HttpStatus.NOT_FOUND, ApiError.of(ErrorCodes.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiError> handleForbidden(ForbiddenException ex) {
        return respond(HttpStatus.FORBIDDEN, ApiError.of(ErrorCodes.FORBIDDEN, ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex) {
        return respond(HttpStatus.FORBIDDEN, ApiError.of(ErrorCodes.FORBIDDEN, "You don't have access to this."));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex) {
        return respond(ex.getStatus(), ApiError.of(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ApiError> handleTooManyRequests(TooManyRequestsException ex) {
        ResponseEntity<ApiError> response = respond(ex.getStatus(), ApiError.of(ex.getCode(), ex.getMessage()));
        return ResponseEntity.status(response.getStatusCode())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(response.getBody());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentials(BadCredentialsException ex) {
        return respond(HttpStatus.UNAUTHORIZED, ApiError.of(ErrorCodes.INVALID_CREDENTIALS, "Invalid email or password."));
    }

    /** Bean validation on a request body: one message per field, plus a readable summary. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().stream()
                .sorted((a, b) -> a.getField().compareTo(b.getField()))
                .forEach(error -> fieldErrors.putIfAbsent(error.getField(), messageOf(error)));
        ex.getBindingResult().getGlobalErrors()
                .forEach(error -> fieldErrors.putIfAbsent(error.getObjectName(), error.getDefaultMessage()));
        return respond(HttpStatus.BAD_REQUEST,
                ApiError.withFieldErrors(ErrorCodes.VALIDATION_FAILED, summary(fieldErrors), fieldErrors));
    }

    /** Validation of request parameters or path variables (e.g. @Min on a @RequestParam). */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiError> handleParameterValidation(HandlerMethodValidationException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getParameterValidationResults().forEach(result -> result.getResolvableErrors().forEach(error ->
                fieldErrors.putIfAbsent(result.getMethodParameter().getParameterName(), error.getDefaultMessage())));
        return respond(HttpStatus.BAD_REQUEST,
                ApiError.withFieldErrors(ErrorCodes.VALIDATION_FAILED, summary(fieldErrors), fieldErrors));
    }

    /** Malformed JSON or a value of the wrong type (e.g. an unknown enum value): the client's fault, not ours. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof InvalidFormatException invalid) {
            String field = invalid.getPath().stream()
                    .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
                    .collect(Collectors.joining(".")).replace(".[", "[");
            Class<?> target = invalid.getTargetType();
            String message = target != null && target.isEnum()
                    ? "Invalid value for " + field + ". Allowed values: "
                      + Arrays.stream(target.getEnumConstants()).map(Object::toString).collect(Collectors.joining(", ")) + "."
                    : "Invalid value for " + field + ".";
            return respond(HttpStatus.BAD_REQUEST,
                    ApiError.withFieldErrors(ErrorCodes.VALIDATION_FAILED, message, Map.of(field, message)));
        }
        return respond(HttpStatus.BAD_REQUEST, ApiError.of(ErrorCodes.BAD_REQUEST, "The request body is not valid JSON."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return respond(HttpStatus.BAD_REQUEST, ApiError.of(ErrorCodes.BAD_REQUEST, "Invalid value for " + ex.getName() + "."));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingParameter(MissingServletRequestParameterException ex) {
        return respond(HttpStatus.BAD_REQUEST,
                ApiError.of(ErrorCodes.BAD_REQUEST, "The " + ex.getParameterName() + " parameter is required."));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiError> handleMissingPart(MissingServletRequestPartException ex) {
        return respond(HttpStatus.BAD_REQUEST, ApiError.of(ErrorCodes.FILE_MISSING, "Please choose a file before submitting."));
    }

    // Thrown by Spring's multipart resolver before the controller runs, whenever a file (or the
    // whole request) is bigger than spring.servlet.multipart.max-file-size / max-request-size.
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return respond(HttpStatus.PAYLOAD_TOO_LARGE, ApiError.of(ErrorCodes.FILE_TOO_LARGE,
                "Your file must be under 10 MB. Please compress it or choose a smaller file."));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> handleMediaType(HttpMediaTypeNotSupportedException ex) {
        return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ApiError.of(ErrorCodes.UNSUPPORTED_MEDIA_TYPE,
                "This request format isn't supported (" + ex.getContentType() + ")."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        return respond(HttpStatus.CONFLICT, ApiError.of(ErrorCodes.CONFLICT,
                "This conflicts with existing data (for example, a duplicate value)."), ex.getMostSpecificCause().getMessage());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED, ApiError.of(ErrorCodes.METHOD_NOT_ALLOWED,
                "This action isn't available here (" + ex.getMethod() + " not supported)."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex) {
        return respond(HttpStatus.NOT_FOUND, ApiError.of(ErrorCodes.NOT_FOUND, "Not found."));
    }

    // Catch-all. MUST log the full exception with the correlation id: this used to swallow the
    // real cause silently, which made every unexpected 500 undiagnosable from the server side.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        ApiError error = ApiError.of(ErrorCodes.INTERNAL_ERROR, "An unexpected error occurred. Please try again later.");
        log.error("[{}] Unhandled exception on {}", error.correlationId(), currentRequest(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private ResponseEntity<ApiError> respond(HttpStatus status, ApiError error) {
        return respond(status, error, null);
    }

    /** Logs one line per error (with the correlation id the client receives), then answers. */
    private ResponseEntity<ApiError> respond(HttpStatus status, ApiError error, String detail) {
        String line = "[{}] {} {} on {}: {}{}";
        Object[] args = {error.correlationId(), status.value(), error.code(), currentRequest(), error.message(),
                detail == null ? "" : " (" + detail + ")"};
        if (status.is5xxServerError()) {
            log.warn(line, args);
        } else {
            log.info(line, args);
        }
        return ResponseEntity.status(status).body(error);
    }

    private static String messageOf(FieldError error) {
        return error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid value for " + error.getField() + ".";
    }

    /** "Title is required. Deadline must be in the future." */
    static String summary(Map<String, String> fieldErrors) {
        if (fieldErrors.isEmpty()) {
            return "Some fields are not valid.";
        }
        return fieldErrors.values().stream()
                .distinct()
                .map(m -> m.endsWith(".") || m.endsWith("!") || m.endsWith("?") ? m : m + ".")
                .collect(Collectors.joining(" "));
    }

    private static String currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            return request.getMethod() + " " + request.getRequestURI();
        }
        return "(no request)";
    }
}
