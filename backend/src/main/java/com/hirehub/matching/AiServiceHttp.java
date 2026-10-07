package com.hirehub.matching;

import com.hirehub.config.RequestIdFilter;
import org.slf4j.MDC;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * HTTP clients for the ai-service. Every call carries the shared key (X-Internal-Key, from
 * AI_SERVICE_KEY: the ai-service answers nobody else) and the current request id (X-Request-Id),
 * so one id follows a request through both services' logs and errors.
 */
public final class AiServiceHttp {

    public static final String KEY_HEADER = "X-Internal-Key";
    static final int MIN_KEY_LENGTH = 32;

    private AiServiceHttp() {
    }

    public static RestClient restClient(String baseUrl, String apiKey, long readTimeoutSeconds) {
        if (apiKey == null || apiKey.trim().length() < MIN_KEY_LENGTH) {
            throw new IllegalStateException("AI_SERVICE_KEY must be set to a random value of at least "
                    + MIN_KEY_LENGTH + " characters, the same for the backend and the ai-service "
                    + "(`npm run dev` generates one in .env).");
        }
        // HTTP/1.1 explicitly: the JDK client defaults to HTTP/2 and sends an "Upgrade: h2c"
        // header on plain-http requests, which uvicorn doesn't support and which breaks
        // multipart uploads to /extract.
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(readTimeoutSeconds));
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(KEY_HEADER, apiKey.trim())
                .requestInterceptor((request, body, execution) -> {
                    String requestId = MDC.get(RequestIdFilter.MDC_KEY);
                    if (requestId != null) {
                        request.getHeaders().set(RequestIdFilter.HEADER, requestId);
                    }
                    return execution.execute(request, body);
                })
                .build();
    }
}
