package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The browser session (HttpOnly cookie) and its CSRF protection. */
class SessionCookieIT extends ApiTestSupport {

    private static final String UPDATE = "{\"firstName\":\"Nour\",\"lastName\":\"Cookie\"}";

    private Cookie logIn(String email) throws Exception {
        user(email, Role.CANDIDATE);
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("hirehub_session");
    }

    /** The XSRF-TOKEN cookie, as the app gets it from GET /api/auth/csrf. */
    private Cookie csrfCookie() throws Exception {
        MockHttpServletResponse response = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent()).andReturn().getResponse();
        Cookie cookie = response.getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isFalse(); // the app's JavaScript must read it
        return cookie;
    }

    @Test
    void theSessionCookieIsHttpOnlyStrictAndOnlyForTheApi() throws Exception {
        user("cookie-attrs@test.com", Role.CANDIDATE);
        java.util.List<String> setCookies = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"cookie-attrs@test.com\",\"password\":\"password123\"}"))
                .andReturn().getResponse().getHeaders(HttpHeaders.SET_COOKIE);
        assertThat(setCookies).filteredOn(c -> c.startsWith("hirehub_session=")).singleElement().asString()
                .contains("HttpOnly").contains("SameSite=Strict").contains("Path=/api").contains("Max-Age=3600");
        // The CSRF cookie comes with it, readable by the app (not HttpOnly).
        assertThat(setCookies).filteredOn(c -> c.startsWith("XSRF-TOKEN=")).singleElement().asString()
                .doesNotContain("HttpOnly");
    }

    @Test
    void readingWithTheCookieNeedsNoCsrfToken() throws Exception {
        Cookie session = logIn("cookie-read@test.com");
        mockMvc.perform(get("/api/users/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("cookie-read@test.com"));
    }

    @Test
    void aChangeWithTheCookieButNoCsrfTokenIsRefused() throws Exception {
        Cookie session = logIn("cookie-nocsrf@test.com");
        mockMvc.perform(put("/api/users/me").cookie(session).contentType(MediaType.APPLICATION_JSON).content(UPDATE))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));

        // A token that doesn't match the cookie is refused too.
        Cookie csrf = csrfCookie();
        mockMvc.perform(put("/api/users/me").cookie(session, csrf).header("X-XSRF-TOKEN", "forged")
                        .contentType(MediaType.APPLICATION_JSON).content(UPDATE))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @Test
    void aChangeWithTheCookieAndTheCsrfTokenWorks() throws Exception {
        Cookie session = logIn("cookie-csrf@test.com");
        Cookie csrf = csrfCookie();
        mockMvc.perform(put("/api/users/me").cookie(session, csrf).header("X-XSRF-TOKEN", csrf.getValue())
                        .contentType(MediaType.APPLICATION_JSON).content(UPDATE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Nour"));
    }

    @Test
    void apiClientsWithABearerTokenAreNotCheckedForCsrf() throws Exception {
        User user = user("cookie-bearer@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/users/me").header("Authorization", token(user))
                        .contentType(MediaType.APPLICATION_JSON).content(UPDATE))
                .andExpect(status().isOk());
    }

    @Test
    void logoutDeletesTheCookie() throws Exception {
        Cookie session = logIn("cookie-logout@test.com");
        Cookie csrf = csrfCookie();
        Cookie cleared = mockMvc.perform(post("/api/auth/logout").cookie(session, csrf)
                        .header("X-XSRF-TOKEN", csrf.getValue()))
                .andExpect(status().isNoContent())
                .andReturn().getResponse().getCookie("hirehub_session");
        assertThat(cleared.getMaxAge()).isZero();
        assertThat(cleared.getValue()).isEmpty();
    }

    @Test
    void anInvalidCookieIs401AndIsDeleted() throws Exception {
        MockHttpServletResponse response = mockMvc.perform(get("/api/users/me")
                        .cookie(new Cookie("hirehub_session", "expired.or.tampered.token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"))
                .andReturn().getResponse();
        assertThat(response.getCookie("hirehub_session").getMaxAge()).isZero();
    }
}
