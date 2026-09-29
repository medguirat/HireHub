package com.hirehub.test;

import com.hirehub.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The catch-all handler used to swallow every unexpected exception with no
 * logging at all, making any real 500 undiagnosable. It must now always
 * return a stable, generic user message plus a correlation id that shows up
 * in the server log for that same request.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleGeneric_returnsGenericMessageAndACorrelationId() {
        ResponseEntity<Map<String, String>> response = handler.handleGeneric(new RuntimeException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().get("message")).isEqualTo("An unexpected error occurred. Please try again later.");
        assertThat(response.getBody().get("correlationId")).isNotBlank();
    }

    @Test
    void handleGeneric_generatesADifferentCorrelationIdEachTime() {
        String first = handler.handleGeneric(new RuntimeException("a")).getBody().get("correlationId");
        String second = handler.handleGeneric(new RuntimeException("b")).getBody().get("correlationId");

        assertThat(first).isNotEqualTo(second);
    }
}
