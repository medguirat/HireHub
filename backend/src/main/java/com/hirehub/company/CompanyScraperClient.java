package com.hirehub.company;

import com.fasterxml.jackson.databind.JsonNode;
import com.hirehub.matching.AiServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

/** Calls the ai-service's company website import (/company/profile). */
@Component
public class CompanyScraperClient {

    private static final Logger log = LoggerFactory.getLogger(CompanyScraperClient.class);

    private final RestClient restClient;

    public CompanyScraperClient(@Value("${ai-service.base-url}") String baseUrl,
                                @Value("${company-import.read-timeout-seconds:45}") long readTimeoutSeconds) {
        // HTTP/1.1 for the same reason as AiServiceClient (uvicorn and h2c upgrades).
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        // The ai-service bounds a whole import to ~25 s; leave it room to answer.
        factory.setReadTimeout(Duration.ofSeconds(readTimeoutSeconds));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    /** The fields the website states (absent when not found) and the final homepage URL. */
    public record ScrapedCompany(String url, JsonNode fields) {}

    /**
     * @throws CompanyScrapeException        the site can't be imported (bad address, unreachable, not a web page...)
     * @throws AiServiceUnavailableException the ai-service is down or failing
     */
    public ScrapedCompany scrape(String url) {
        try {
            JsonNode body = restClient.post().uri("/company/profile")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("url", url))
                    .retrieve()
                    .body(JsonNode.class);
            return new ScrapedCompany(body.path("url").asText(url), body.path("fields"));
        } catch (HttpClientErrorException e) {
            JsonNode error = e.getResponseBodyAs(JsonNode.class);
            JsonNode detail = error == null ? null : error.path("detail");
            if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY && detail != null && detail.has("message")) {
                throw new CompanyScrapeException(detail.path("code").asText(), detail.path("message").asText());
            }
            log.error("Unexpected {} from ai-service /company/profile: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceUnavailableException("Unexpected response from ai-service /company/profile", e);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("ai-service /company/profile failed: " + e.getMessage(), e);
        }
    }
}
