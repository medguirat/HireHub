package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The access rules of every endpoint in one table: without a token each
 * protected endpoint answers 401, and with the wrong role 403. Public
 * endpoints answer without a token. (Happy paths and validation live in the
 * per-feature tests.)
 */
class EndpointAccessIT extends ApiTestSupport {

    private static final String BODY = "{}";

    /** method, path, role required (null = any signed-in user). */
    static Stream<Arguments> protectedEndpoints() {
        return Stream.of(
                // Applications
                Arguments.of("GET", "/api/applications", null),
                Arguments.of("GET", "/api/applications/1", null),
                Arguments.of("POST", "/api/applications", Role.CANDIDATE),
                Arguments.of("DELETE", "/api/applications/1", null),
                Arguments.of("PATCH", "/api/applications/1/status", Role.RECRUITER),
                Arguments.of("GET", "/api/applications/1/evaluation", Role.RECRUITER),
                Arguments.of("PUT", "/api/applications/1/evaluation", Role.RECRUITER),
                Arguments.of("GET", "/api/applications/1/cv", null),
                Arguments.of("GET", "/api/applications/1/cover-letter", null),
                // Candidate
                Arguments.of("GET", "/api/candidates/offers", Role.CANDIDATE),
                Arguments.of("GET", "/api/candidates/offers/1", Role.CANDIDATE),
                Arguments.of("GET", "/api/candidates/dashboard", Role.CANDIDATE),
                Arguments.of("GET", "/api/candidates/me", Role.CANDIDATE),
                Arguments.of("PUT", "/api/candidates/me", Role.CANDIDATE),
                Arguments.of("GET", "/api/candidates/me/cv", Role.CANDIDATE),
                Arguments.of("GET", "/api/candidates/me/cv/file", Role.CANDIDATE),
                Arguments.of("POST", "/api/candidates/documents", Role.CANDIDATE),
                Arguments.of("GET", "/api/candidates/offers/1/match", Role.CANDIDATE),
                // Recruiter
                Arguments.of("GET", "/api/recruiters/offers", Role.RECRUITER),
                Arguments.of("POST", "/api/recruiters/offers", Role.RECRUITER),
                Arguments.of("GET", "/api/recruiters/offers/1", Role.RECRUITER),
                Arguments.of("PUT", "/api/recruiters/offers/1", Role.RECRUITER),
                Arguments.of("DELETE", "/api/recruiters/offers/1", Role.RECRUITER),
                Arguments.of("GET", "/api/recruiters/profile", Role.RECRUITER),
                Arguments.of("PUT", "/api/recruiters/profile", Role.RECRUITER),
                Arguments.of("POST", "/api/recruiters/profile/import", Role.RECRUITER),
                // Any signed-in user
                Arguments.of("GET", "/api/notifications", null),
                Arguments.of("PUT", "/api/notifications/1/read", null),
                Arguments.of("GET", "/api/users/me", null),
                Arguments.of("PUT", "/api/users/me", null),
                Arguments.of("DELETE", "/api/users/1", null),
                Arguments.of("POST", "/api/files/images", null),
                Arguments.of("GET", "/api/test", null)
        );
    }

    private MockHttpServletRequestBuilder call(String method, String path) {
        return request(HttpMethod.valueOf(method), path).contentType(MediaType.APPLICATION_JSON).content(BODY);
    }

    @ParameterizedTest(name = "{0} {1} without a token -> 401")
    @MethodSource("protectedEndpoints")
    void everyProtectedEndpointNeedsAToken(String method, String path, Role role) throws Exception {
        mockMvc.perform(call(method, path)).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest(name = "{0} {1} with the wrong role -> 403")
    @MethodSource("protectedEndpoints")
    void roleSpecificEndpointsRefuseTheOtherRole(String method, String path, Role role) throws Exception {
        if (role == null) return; // open to both roles
        Role other = role == Role.CANDIDATE ? Role.RECRUITER : Role.CANDIDATE;
        User wrong = user("wrong-" + other.name().toLowerCase() + "-" + Math.abs(path.hashCode()) + method + "@test.com", other);
        mockMvc.perform(call(method, path).header("Authorization", token(wrong))).andExpect(status().isForbidden());
    }

    static Stream<Arguments> publicEndpoints() {
        return Stream.of(
                Arguments.of("GET", "/api/health"),
                Arguments.of("GET", "/api/joboffers"),
                Arguments.of("POST", "/api/auth/login"),
                Arguments.of("POST", "/api/auth/register"),
                Arguments.of("POST", "/api/auth/password-reset"),
                Arguments.of("POST", "/api/auth/password-reset/check"),
                Arguments.of("POST", "/api/auth/password-reset/confirm"),
                Arguments.of("POST", "/api/users")
        );
    }

    @ParameterizedTest(name = "{0} {1} is public")
    @MethodSource("publicEndpoints")
    void publicEndpointsAnswerWithoutAToken(String method, String path) throws Exception {
        int status = mockMvc.perform(call(method, path)).andReturn().getResponse().getStatus();
        assertThat(status).isNotIn(401, 403); // may be 200, 400 (empty body) or 503 (ai-service off in tests)
    }
}
