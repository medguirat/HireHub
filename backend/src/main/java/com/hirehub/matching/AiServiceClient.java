package com.hirehub.matching;

import com.fasterxml.jackson.databind.JsonNode;
import com.hirehub.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/** HTTP client for the Python ai-service (text extraction, matching, health). */
@Component
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    private final RestClient restClient;

    public AiServiceClient(@Value("${ai-service.base-url}") String baseUrl,
                           @Value("${ai-service.api-key:}") String apiKey,
                           @Value("${ai-service.read-timeout-seconds:30}") long readTimeoutSeconds) {
        this.restClient = AiServiceHttp.restClient(baseUrl, apiKey, readTimeoutSeconds);
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
            logIfKeyRefused(e);
            JsonNode error = e.getResponseBodyAs(JsonNode.class);
            if (!isOwnError(error)) {
                // Not one of the ai-service's own errors (e.g. a request validation error): a bug on our side.
                log.error("Unexpected {} from ai-service /extract: {}", e.getStatusCode(), e.getResponseBodyAsString());
                throw new AiServiceUnavailableException("Unexpected response from ai-service /extract", e);
            }
            String message = error.path("message").asText();
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
            logIfKeyRefused(e);
            throw new AiServiceUnavailableException("ai-service /match failed: " + e.getMessage(), e);
        }
    }

    /**
     * A profile draft built only from the user's own data: "company" (company description) or
     * "bio" (candidate bio). Answers {text, ai_assisted, used}.
     *
     * @throws ApiException                  422 NOT_ENOUGH_DATA (the profile is too empty), 400 if the
     *                                       ai-service can't use the data
     * @throws AiServiceUnavailableException the service is down or failing
     */
    public JsonNode draft(String kind, JsonNode profile) {
        try {
            return restClient.post().uri("/draft/{kind}", kind)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(profile)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (HttpClientErrorException e) {
            JsonNode error = e.getResponseBodyAs(JsonNode.class);
            if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY && isOwnError(error)) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "NOT_ENOUGH_DATA", error.path("message").asText());
            }
            if (e.getStatusCode() == HttpStatus.UNPROCESSABLE_ENTITY) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST",
                        "Some of these details can't be used for a draft. Check them and try again.");
            }
            logIfKeyRefused(e);
            throw new AiServiceUnavailableException("ai-service /draft/" + kind + " failed: " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("ai-service /draft/" + kind + " failed: " + e.getMessage(), e);
        }
    }

    /** A 401 means the two services don't share the same AI_SERVICE_KEY: say so plainly in the log. */
    static void logIfKeyRefused(RestClientException e) {
        if (e instanceof HttpClientErrorException.Unauthorized) {
            log.error("The ai-service refused this backend's key: AI_SERVICE_KEY must be the same for both services.");
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

    /**
     * The ai-service answers errors as {code, message, correlationId, fieldErrors?}. Its own, expected
     * errors (e.g. "no_text") carry a message for the user; VALIDATION_FAILED means we sent a bad request.
     */
    public static boolean isOwnError(JsonNode error) {
        return error != null && error.hasNonNull("message") && !"VALIDATION_FAILED".equals(error.path("code").asText());
    }
}
