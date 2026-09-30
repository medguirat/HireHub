package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.ApiError;
import com.hirehub.exception.ApiErrorController;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Every kind of error comes back as { code, message, correlationId, fieldErrors? }, whatever produced it. */
class ApiErrorFormatIT extends ApiTestSupport {

    private static final String UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

    /** The common shape: JSON with a code, a message and a correlation id. */
    private static ResultActions assertError(ResultActions result, int status, String code, String message) throws Exception {
        return result.andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value(message))
                .andExpect(jsonPath("$.correlationId", matchesPattern(UUID)));
    }

    @Test
    void validationErrorsListEachFieldAndSummariseThem() throws Exception {
        User recruiter = user("errors-validation@test.com", Role.RECRUITER);
        assertError(mockMvc.perform(post("/api/recruiters/offers").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(offerJson("", LocalDate.now().plusDays(10)))),
                400, "VALIDATION_FAILED", "Title is required.")
                .andExpect(jsonPath("$.fieldErrors.title").value("Title is required"));
    }

    @Test
    void businessRuleErrorsHaveNoFieldErrors() throws Exception {
        User candidate = user("errors-twice@test.com", Role.CANDIDATE);
        var offer = offer(user("errors-twice-rec@test.com", Role.RECRUITER), "Twice");
        application(candidate, offer);
        assertError(mockMvc.perform(post("/api/applications").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cv\":\"cv.pdf\",\"jobOfferId\":" + offer.getId() + "}")),
                400, "BAD_REQUEST", "You have already applied for this job offer.")
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void notSignedIn() throws Exception {
        assertError(mockMvc.perform(get("/api/applications")), 401, "AUTH_REQUIRED",
                "Your session has expired or you are not signed in. Please log in again.");
    }

    @Test
    void wrongPassword() throws Exception {
        user("errors-login@test.com", Role.CANDIDATE);
        assertError(mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"errors-login@test.com\",\"password\":\"wrong-password\"}")),
                401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    @Test
    void wrongRoleForTheUrl() throws Exception {
        User candidate = user("errors-role@test.com", Role.CANDIDATE);
        assertError(mockMvc.perform(get("/api/recruiters/offers").header("Authorization", token(candidate))),
                403, "FORBIDDEN", "Your account type can't use this feature.");
    }

    @Test
    void someoneElsesData() throws Exception {
        var offer = offer(user("errors-owner@test.com", Role.RECRUITER), "Owned");
        User otherRecruiter = user("errors-other@test.com", Role.RECRUITER);
        assertError(mockMvc.perform(put("/api/recruiters/offers/" + offer.getId()).header("Authorization", token(otherRecruiter))
                        .contentType(MediaType.APPLICATION_JSON).content(offerJson("Mine now", LocalDate.now().plusDays(5)))),
                403, "FORBIDDEN", "You cannot modify this offer.");
    }

    @Test
    void unknownRecordAndUnknownRoute() throws Exception {
        User candidate = user("errors-404@test.com", Role.CANDIDATE);
        assertError(mockMvc.perform(get("/api/applications/999999").header("Authorization", token(candidate))),
                404, "NOT_FOUND", "Application not found");
        assertError(mockMvc.perform(get("/api/does-not-exist").header("Authorization", token(candidate))),
                404, "NOT_FOUND", "Not found.");
    }

    @Test
    void malformedRequests() throws Exception {
        User candidate = user("errors-malformed@test.com", Role.CANDIDATE);
        assertError(mockMvc.perform(get("/api/applications/abc").header("Authorization", token(candidate))),
                400, "BAD_REQUEST", "Invalid value for id.");
        assertError(mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON).content("{not json")),
                400, "BAD_REQUEST", "The request body is not valid JSON.");
        assertError(mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.TEXT_PLAIN).content("hello")),
                415, "UNSUPPORTED_MEDIA_TYPE", "This request format isn't supported (text/plain;charset=UTF-8).");
        assertError(mockMvc.perform(post("/api/users/me").header("Authorization", token(candidate))),
                405, "METHOD_NOT_ALLOWED", "This action isn't available here (POST not supported).");
    }

    @Test
    void errorsOutsideControllersUseTheSameFormat() {
        ApiErrorController controller = new ApiErrorController();

        MockHttpServletRequest notFound = new MockHttpServletRequest();
        notFound.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 404);
        ResponseEntity<ApiError> response = controller.error(notFound);
        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody().code()).isEqualTo("NOT_FOUND");
        assertThat(response.getBody().correlationId()).matches(UUID);

        MockHttpServletRequest crash = new MockHttpServletRequest();
        crash.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 500);
        crash.setAttribute(RequestDispatcher.ERROR_EXCEPTION, new IllegalStateException("boom"));
        response = controller.error(crash);
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().code()).isEqualTo("INTERNAL_ERROR");
        assertThat(response.getBody().message()).isEqualTo("An unexpected error occurred. Please try again later.");
    }
}
