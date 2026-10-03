package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.ratelimit.RateLimiter;
import com.hirehub.repository.PasswordResetTokenRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.service.EmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** "Forgot password" rate limits, with small limits so they are reached quickly. */
@SpringBootTest(properties = {
        "app.rate-limit.password-reset.per-ip=4",
        "app.rate-limit.password-reset.per-email=2"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RateLimitIT {

    private static final String EMAIL = "rate-limited@test.com";
    private static final String GENERIC = "If an account exists for this email, we've sent a link to reset the password. "
            + "It works once and expires in 45 minutes.";

    @Autowired private MockMvc mockMvc;
    @Autowired private RateLimiter rateLimiter;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordResetTokenRepository tokens;
    @MockitoBean private EmailService emailService;

    private User user;

    @BeforeEach
    void setUp() {
        rateLimiter.reset();
        user = userRepository.save(User.builder().firstName("Rate").lastName("Limited").email(EMAIL)
                .password("x").role(Role.CANDIDATE).build());
    }

    @AfterEach
    void tearDown() {
        tokens.deleteAll(tokens.findAll().stream().filter(t -> t.getUser().getId().equals(user.getId())).toList());
        userRepository.deleteById(user.getId());
        rateLimiter.reset();
    }

    private ResultActions ask(String email, String ip) throws Exception {
        return mockMvc.perform(post("/api/auth/password-reset")
                .with(request -> { request.setRemoteAddr(ip); return request; })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"));
    }

    @Test
    void tooManyRequestsFromOneAddressGetA429WithRetryAfter() throws Exception {
        for (int i = 0; i < 4; i++) {
            ask("someone-" + i + "@test.com", "203.0.113.7").andExpect(status().isOk());
        }
        ask("someone-else@test.com", "203.0.113.7")
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("TOO_MANY_REQUESTS"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith("Too many attempts. Please wait")));

        // Another address is not affected.
        ask("someone-else@test.com", "198.51.100.2").andExpect(status().isOk());
    }

    @Test
    void tooManyRequestsForOneEmailKeepTheSameAnswerButSendNothingMore() throws Exception {
        String first = ask(EMAIL, "203.0.113.10").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        verify(emailService, timeout(5000)).sendPasswordResetEmail(eq(EMAIL), anyString(), anyString(), anyInt());

        // Past the per-account "one email a minute" rule, so only the rate limit can stop the next ones.
        tokens.findAll().forEach(t -> { t.setCreatedAt(t.getCreatedAt().minusMinutes(5)); tokens.save(t); });
        ask(EMAIL.toUpperCase(), "203.0.113.11").andExpect(status().isOk());
        verify(emailService, timeout(5000).times(2)).sendPasswordResetEmail(eq(EMAIL), anyString(), anyString(), anyInt());

        tokens.findAll().forEach(t -> { t.setCreatedAt(t.getCreatedAt().minusMinutes(5)); tokens.save(t); });
        String limited = ask(EMAIL, "203.0.113.12").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String unknown = ask("nobody-here@test.com", "203.0.113.13").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(limited).isEqualTo(first).isEqualTo(unknown).contains(GENERIC);
        verify(emailService, after(1000).times(2)).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyInt());
    }
}
