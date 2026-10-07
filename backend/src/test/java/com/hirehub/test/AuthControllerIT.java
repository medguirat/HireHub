package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.service.EmailService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Sign up and log in. */
class AuthControllerIT extends ApiTestSupport {

    @MockitoBean private EmailService emailService;

    private static String signup(String email, String password, String role) {
        return "{\"firstName\":\"Ada\",\"lastName\":\"Lovelace\",\"email\":\"" + email + "\",\"password\":\""
                + password + "\",\"role\":" + (role == null ? "null" : "\"" + role + "\"") + "}";
    }

    @Test
    void aCandidateCanSignUpThenLogIn() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(signup("ada@test.com", "password123", "CANDIDATE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ada@test.com"))
                .andExpect(jsonPath("$.role").value("CANDIDATE"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist());

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ada@test.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("hirehub_session"))
                .andExpect(jsonPath("$.email").value("ada@test.com"))
                .andExpect(jsonPath("$.token").doesNotExist()); // the browser never sees the token

        // API clients get a token for "Authorization: Bearer".
        mockMvc.perform(post("/api/auth/token").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ada@test.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(cookie().doesNotExist("hirehub_session"))
                .andExpect(jsonPath("$.token", not(emptyOrNullString())));
    }

    @Test
    void signingUpSignsTheNewAccountIn() throws Exception {
        Cookie session = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(signup("auto@test.com", "password123", "RECRUITER")))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly("hirehub_session", true))
                .andReturn().getResponse().getCookie("hirehub_session");

        // The session works right away, for the new account and its role.
        mockMvc.perform(get("/api/users/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("auto@test.com"))
                .andExpect(jsonPath("$.role").value("RECRUITER"));
        mockMvc.perform(get("/api/recruiters/profile").cookie(session))
                .andExpect(status().isOk());
    }

    @Test
    void aFailedSignupGivesNoSession() throws Exception {
        user("already@test.com", Role.CANDIDATE);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(signup("already@test.com", "password123", "CANDIDATE")))
                .andExpect(status().isBadRequest())
                .andExpect(cookie().doesNotExist("hirehub_session"));
    }

    @Test
    void signupValidatesEachField() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(signup("not-an-email", "short", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.email").value("Email must be valid"))
                .andExpect(jsonPath("$.fieldErrors.password").value("Password must be at least 8 characters"))
                .andExpect(jsonPath("$.fieldErrors.role").value("Role is required"))
                .andExpect(jsonPath("$.message").value("Email must be valid. Password must be at least 8 characters. Role is required."));
    }

    @Test
    void anEmailCanOnlyBeUsedOnce() throws Exception {
        user("taken@test.com", Role.RECRUITER);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(signup("taken@test.com", "password123", "CANDIDATE")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("An account with this email already exists."));
    }

    @Test
    void aWrongPasswordOrUnknownEmailIs401WithOneMessage() throws Exception {
        user("known@test.com", Role.CANDIDATE);
        for (String body : new String[] {
                "{\"email\":\"known@test.com\",\"password\":\"wrong-password\"}",
                "{\"email\":\"nobody@test.com\",\"password\":\"password123\"}"}) {
            mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Invalid email or password."));
        }
    }

    @Test
    void emptyCredentialsAre400() throws Exception {
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Enter your email and password."));
    }

    @Test
    void aTamperedTokenIs401() throws Exception {
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer not.a.real.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Your session has expired or you are not signed in. Please log in again."));
    }
}
