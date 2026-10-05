package com.hirehub.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.hirehub.exception.ApiException;
import com.hirehub.matching.AiServiceClient;
import com.hirehub.matching.AiServiceUnavailableException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * The real HTTP client against a stub server: checks what is actually sent
 * over the wire and how each ai-service answer is mapped.
 */
class AiServiceClientTest {

    private HttpServer server;
    private AiServiceClient client;
    private final AtomicReference<String> lastBody = new AtomicReference<>();
    private final AtomicReference<String> lastContentType = new AtomicReference<>();
    private final AtomicReference<String> lastUpgradeHeader = new AtomicReference<>();
    private final AtomicReference<String> lastKey = new AtomicReference<>();
    private final AtomicReference<String> lastRequestId = new AtomicReference<>();
    private final AtomicReference<String> lastPath = new AtomicReference<>();
    private static final String KEY = "test-internal-key-0123456789abcdef";
    private volatile int status = 200;
    private volatile String response = "{}";

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            lastContentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            lastUpgradeHeader.set(exchange.getRequestHeaders().getFirst("Upgrade"));
            lastKey.set(exchange.getRequestHeaders().getFirst("X-Internal-Key"));
            lastRequestId.set(exchange.getRequestHeaders().getFirst("X-Request-Id"));
            lastPath.set(exchange.getRequestURI().getPath());
            lastBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        client = new AiServiceClient("http://127.0.0.1:" + server.getAddress().getPort(), KEY, 5);
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void everyCallCarriesTheSharedKeyAndTheRequestId() {
        response = "{\"overall_score\":70}";
        org.slf4j.MDC.put("requestId", "req-id-for-ai-0001");
        try {
            client.match("Java developer", "Java", "Spring");
        } finally {
            org.slf4j.MDC.remove("requestId");
        }
        assertThat(lastKey.get()).isEqualTo(KEY);
        assertThat(lastRequestId.get()).isEqualTo("req-id-for-ai-0001");
    }

    @Test
    void theBackendRefusesToStartWithoutAStrongKey() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new AiServiceClient("http://127.0.0.1:1", "short", 5))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("AI_SERVICE_KEY");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new AiServiceClient("http://127.0.0.1:1", "", 5))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aDraftIsForwardedAndItsOwnErrorsKeepTheirMessage() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper json = new com.fasterxml.jackson.databind.ObjectMapper();
        response = "{\"text\":\"Acme builds robots.\",\"ai_assisted\":false,\"used\":[\"companyName\"]}";
        assertThat(client.draft("company", json.readTree("{\"companyName\":\"Acme\"}")).path("text").asText())
                .isEqualTo("Acme builds robots.");
        assertThat(lastPath.get()).isEqualTo("/draft/company");
        assertThat(lastBody.get()).contains("\"companyName\":\"Acme\"");

        status = 422;
        response = "{\"code\":\"not_enough_data\",\"message\":\"Add a few details first.\",\"correlationId\":\"c\"}";
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> client.draft("bio", json.readTree("{}")))
                .isInstanceOf(com.hirehub.exception.ApiException.class)
                .hasMessage("Add a few details first.")
                .extracting("code").isEqualTo("NOT_ENOUGH_DATA");

        status = 401;
        response = "{\"code\":\"AUTH_REQUIRED\",\"message\":\"This service only answers the HireHub backend.\",\"correlationId\":\"c\"}";
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> client.draft("bio", json.readTree("{}")))
                .isInstanceOf(com.hirehub.matching.AiServiceUnavailableException.class);
    }

    @Test
    void extractSendsTheFileAsAMultipartFilePartWithItsName() {
        response = "{\"text\":\"Java developer\",\"format\":\"pdf\"}";

        AiServiceClient.ExtractedText result = client.extractText("%PDF-1.4 data".getBytes(), "CV-Amine.pdf");

        assertThat(result.text()).isEqualTo("Java developer");
        assertThat(lastContentType.get()).startsWith("multipart/form-data");
        assertThat(lastBody.get()).contains("name=\"file\"").contains("filename=\"CV-Amine.pdf\"").contains("%PDF-1.4 data");
        // uvicorn mishandles the body of h2c upgrade requests, so the client must stay on HTTP/1.1.
        assertThat(lastUpgradeHeader.get()).isNull();
    }

    @Test
    void anUnexpectedValidationErrorIsTreatedAsAServiceFaultNotAsTheUsersFile() {
        status = 422;
        response = "{\"code\":\"VALIDATION_FAILED\",\"message\":\"file: Field required.\",\"correlationId\":\"c1\",\"fieldErrors\":{\"file\":\"Field required\"}}";

        assertThrows(AiServiceUnavailableException.class, () -> client.extractText(new byte[]{1}, "cv.pdf"));
    }

    @Test
    void unreadableCvMapsTo422WithTheServiceMessage() {
        status = 422;
        response = "{\"code\":\"no_text\",\"message\":\"We couldn't find any text in this file.\",\"correlationId\":\"c1\"}";

        ApiException error = assertThrows(ApiException.class, () -> client.extractText(new byte[]{1}, "scan.pdf"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(error.getMessage()).isEqualTo("We couldn't find any text in this file.");
    }

    @Test
    void unsupportedFormatMapsTo415() {
        status = 415;
        response = "{\"code\":\"unsupported_format\",\"message\":\"Please upload your CV as a PDF or DOCX file.\",\"correlationId\":\"c1\"}";

        ApiException error = assertThrows(ApiException.class, () -> client.extractText(new byte[]{1}, "cv.png"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @Test
    void matchSendsTheCvAndOfferAsJson() {
        response = "{\"overall_score\":81,\"algorithm_version\":\"v\"}";

        JsonNode result = client.match("Java dev", "Backend Developer", "Java and Spring");

        assertThat(result.path("overall_score").asInt()).isEqualTo(81);
        assertThat(lastContentType.get()).startsWith("application/json");
        assertThat(lastBody.get()).contains("\"cv_text\":\"Java dev\"").contains("\"title\":\"Backend Developer\"");
    }

    @Test
    void serverErrorsAndDownServiceAreUnavailable() {
        status = 500;
        assertThrows(AiServiceUnavailableException.class, () -> client.match("a", "b", "c"));

        server.stop(0);
        assertThrows(AiServiceUnavailableException.class, () -> client.match("a", "b", "c"));
        assertThat(client.health().ready()).isFalse();
    }

    @Test
    void healthReportsReadinessAndAlgorithmVersion() {
        response = "{\"status\":\"ok\",\"algorithm_version\":\"2026.09-1\"}";
        AiServiceClient.Health health = client.health();
        assertThat(health.ready()).isTrue();
        assertThat(health.algorithmVersion()).isEqualTo("2026.09-1");
    }
}
