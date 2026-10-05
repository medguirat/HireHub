package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.ratelimit.RateLimiter;
import com.hirehub.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Login rate limits, with small limits so they are reached quickly. */
@SpringBootTest(properties = {
        "app.rate-limit.login.per-ip=6",
        "app.rate-limit.login.failures-per-email=3"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoginRateLimitIT {

    private static final String EMAIL = "login-limited@test.com";
    private static final String PASSWORD = "the-right-password";

    @Autowired private MockMvc mockMvc;
    @Autowired private RateLimiter rateLimiter;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User user;

    @BeforeEach
    void setUp() {
        rateLimiter.reset();
        user = userRepository.save(User.builder().firstName("Login").lastName("Limited").email(EMAIL)
                .password(passwordEncoder.encode(PASSWORD)).role(Role.CANDIDATE).build());
    }

    @AfterEach
    void tearDown() {
        userRepository.deleteById(user.getId());
        rateLimiter.reset();
    }

    private ResultActions login(String email, String password, String ip) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(request -> { request.setRemoteAddr(ip); return request; })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void repeatedFailuresLockTheEmailEvenForTheRightPassword() throws Exception {
        for (int i = 0; i < 3; i++) {
            login(EMAIL, "wrong-" + i, "198.51.100." + i).andExpect(status().isUnauthorized());
        }
        // From another address, with the right password: still refused, the email is locked for now.
        login(EMAIL, PASSWORD, "198.51.100.50")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("TOO_MANY_REQUESTS"));
        // Other accounts are not affected.
        login("someone-else@test.com", "whatever", "198.51.100.51").andExpect(status().isUnauthorized());
    }

    @Test
    void aSuccessfulLoginResetsTheFailures() throws Exception {
        login(EMAIL, "wrong-1", "198.51.100.1").andExpect(status().isUnauthorized());
        login(EMAIL, "wrong-2", "198.51.100.2").andExpect(status().isUnauthorized());
        login(EMAIL.toUpperCase(), PASSWORD, "198.51.100.3").andExpect(status().isOk());
        login(EMAIL, "wrong-3", "198.51.100.4").andExpect(status().isUnauthorized());
        login(EMAIL, "wrong-4", "198.51.100.5").andExpect(status().isUnauthorized());
        login(EMAIL, PASSWORD, "198.51.100.6").andExpect(status().isOk());
    }

    @Test
    void tooManyAttemptsFromOneAddressGetA429() throws Exception {
        for (int i = 0; i < 6; i++) {
            login("user-" + i + "@test.com", "x", "203.0.113.20").andExpect(status().isUnauthorized());
        }
        login(EMAIL, PASSWORD, "203.0.113.20").andExpect(status().isTooManyRequests());
        login(EMAIL, PASSWORD, "203.0.113.21").andExpect(status().isOk());
    }
}
