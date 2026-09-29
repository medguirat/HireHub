package com.hirehub.test;

import com.hirehub.company.CompanyScrapeException;
import com.hirehub.company.CompanyScraperClient;
import com.hirehub.matching.AiServiceUnavailableException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** The company import client against a stub ai-service. */
class CompanyScraperClientTest {

    private HttpServer server;
    private CompanyScraperClient client;
    private final AtomicReference<String> lastPath = new AtomicReference<>();
    private final AtomicReference<String> lastBody = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String response = "{}";

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            lastPath.set(exchange.getRequestURI().getPath());
            lastBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        client = new CompanyScraperClient("http://127.0.0.1:" + server.getAddress().getPort(), 5);
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void returnsTheFieldsTheSiteStates() {
        response = "{\"url\":\"https://acme.example.com\",\"fields\":{\"companyName\":\"Acme\",\"foundedYear\":2006}}";

        CompanyScraperClient.ScrapedCompany result = client.scrape("acme.example.com");

        assertThat(lastPath.get()).isEqualTo("/company/profile");
        assertThat(lastBody.get()).isEqualTo("{\"url\":\"acme.example.com\"}");
        assertThat(result.url()).isEqualTo("https://acme.example.com");
        assertThat(result.fields().path("companyName").asText()).isEqualTo("Acme");
        assertThat(result.fields().has("industry")).isFalse();
    }

    @Test
    void aSiteThatCantBeImportedCarriesTheServiceMessage() {
        status = 422;
        response = "{\"detail\":{\"code\":\"unreachable\",\"message\":\"We couldn't reach this website.\"}}";

        CompanyScrapeException error = assertThrows(CompanyScrapeException.class, () -> client.scrape("x.example.com"));

        assertThat(error.getCode()).isEqualTo("unreachable");
        assertThat(error.getMessage()).isEqualTo("We couldn't reach this website.");
    }

    @Test
    void validationErrorsServerErrorsAndADownServiceAreUnavailable() {
        status = 422;
        response = "{\"detail\":[{\"type\":\"missing\",\"loc\":[\"body\",\"url\"]}]}";
        assertThrows(AiServiceUnavailableException.class, () -> client.scrape("x.example.com"));

        status = 500;
        assertThrows(AiServiceUnavailableException.class, () -> client.scrape("x.example.com"));

        server.stop(0);
        assertThrows(AiServiceUnavailableException.class, () -> client.scrape("x.example.com"));
    }
}
