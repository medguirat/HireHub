package com.hirehub.matching;

import com.fasterxml.jackson.databind.JsonNode;
import com.hirehub.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

/** HTTP client for the Python ai-service (text extraction, matching, health). */
@Component
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    private final RestClient restClient;

    public AiServiceClient(@Value("${ai-service.base-url}") String baseUrl,
                           @Value("${ai-service.read-timeout-seconds:30}") long readTimeoutSeconds) {
        // HTTP/1.1 explicitly: the JDK client defaults to HTTP/2 and sends an "Upgrade: h2c"
        // header on plain-http requests, which uvicorn doesn't support and which breaks
        // multipart uploads to /extract.
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(readTimeoutSeconds));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public record ExtractedText(String text, String format) {}

    public record Health(boolean ready, String algorithmVersion) {}

    /**
     * @throws ApiException                  the file can't be read as a CV (unsupported format, no text)
     * @throws AiServiceUnavailableException the service is down or failing
     */
    public ExtractedText extractText(byte[] data, String fileName) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", new ByteArrayResource(data) {
            @Override
            public String getFilename() {
                return fileName;
            }
        });
        try {
            JsonNode body = restClient.post().uri("/extract")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .body(JsonNode.class);
            return new ExtractedText(body.path("text").asText(), body.path("format").asText());
        } catch (HttpClientErrorException e) {
            JsonNode error = e.getResponseBodyAs(JsonNode.class);
            JsonNode detail = error == null ? null : error.path("detail");
            if (detail == null || !detail.has("message")) {
                // Not one of the ai-service's own errors (e.g. a request validation error): a bug on our side.
                log.error("Unexpected {} from ai-service /extract: {}", e.getStatusCode(), e.getResponseBodyAsString());
                throw new AiServiceUnavailableException("Unexpected response from ai-service /extract", e);
            }
            String message = detail.path("message").asText();
            if (e.getStatusCode() == HttpStatus.UNSUPPORTED_MEDIA_TYPE) {
                throw ApiException.cvUnsupported(message);
            }
            if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY) {
                throw ApiException.cvUnreadable(message);
            }
            throw new AiServiceUnavailableException("Unexpected response from ai-service /extract", e);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("ai-service /extract failed: " + e.getMessage(), e);
        }
    }

    /** The full match breakdown, exactly as computed by the ai-service. */
    public JsonNode match(String cvText, String offerTitle, String offerDescription) {
        Map<String, Object> request = Map.of(
                "cv_text", cvText,
                "offer", Map.of("title", offerTitle, "description", offerDescription == null ? "" : offerDescription));
        try {
            return restClient.post().uri("/match")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("ai-service /match failed: " + e.getMessage(), e);
        }
    }

    public Health health() {
        try {
            JsonNode body = restClient.get().uri("/health").retrieve().body(JsonNode.class);
            return new Health("ok".equals(body.path("status").asText()), body.path("algorithm_version").asText(null));
        } catch (RestClientException e) {
            return new Health(false, null);
        }
    }
}
