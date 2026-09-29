package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression test for the Phase 1 "Application Error" bug: a CV over the
 * multipart limit used to come back as an opaque 500 "An unexpected error
 * occurred". Runs against a real embedded server because the limit is
 * enforced by Tomcat's multipart parsing, which MockMvc bypasses entirely.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class FileUploadSizeLimitIT {

    private static final String EMAIL = "upload-size-limit@test.com";

    // Tomcat answers 413 as soon as the file crosses the limit, before the
    // client has finished sending. HttpURLConnection (RestTemplate's default)
    // chokes on that early response; the JDK HttpClient reads it correctly,
    // as browsers and curl do.
    private final RestTemplate restTemplate = new RestTemplate(new JdkClientHttpRequestFactory());

    @LocalServerPort private int port;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    @AfterEach
    void cleanUp() {
        userRepository.findByEmail(EMAIL).ifPresent(userRepository::delete);
    }

    @Test
    void cvOverTenMegabytes_returns413WithClearMessageInsteadOfGeneric500() {
        User user = userRepository.save(User.builder()
                .firstName("Size").lastName("Limit").email(EMAIL)
                .password(passwordEncoder.encode("password123")).role(Role.CANDIDATE).build());
        String token = jwtService.generateToken(user.getEmail());

        byte[] oversized = new byte[10 * 1024 * 1024 + 512 * 1024];
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", new ByteArrayResource(oversized) {
            @Override
            public String getFilename() {
                return "big-cv.pdf";
            }
        });

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token);

        restTemplate.setErrorHandler(new NoOpResponseErrorHandler());
        ResponseEntity<Map<String, String>> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/files/upload",
                HttpMethod.POST,
                new HttpEntity<>(form, headers),
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message"))
                .isEqualTo("Your file must be under 10 MB. Please compress it or choose a smaller file.");
        assertThat(response.getBody().get("correlationId")).isNotBlank();
    }

    /** Let 4xx responses through so the test can assert on status and body. */
    private static class NoOpResponseErrorHandler implements ResponseErrorHandler {
        @Override
        public boolean hasError(ClientHttpResponse response) {
            return false;
        }
    }
}
