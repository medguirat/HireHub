package com.hirehub.test;

import com.hirehub.entity.PasswordResetToken;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.repository.PasswordResetTokenRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import com.hirehub.service.EmailService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "Forgot password" end to end through the API. Not @Transactional: the email is only sent once
 * the request's transaction commits, as in production. Each test cleans up its own user.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordResetIT {

    private static final String EMAIL = "reset-me@test.com";
    private static final String OLD_PASSWORD = "old-password-1";
    private static final String NEW_PASSWORD = "brand-new-password-2";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordResetTokenRepository tokens;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @MockitoBean private EmailService emailService;

    private User user;

    @BeforeEach
    void createUser() {
        user = userRepository.save(User.builder().firstName("Rita").lastName("Reset").email(EMAIL)
                .password(passwordEncoder.encode(OLD_PASSWORD)).role(Role.CANDIDATE).build());
    }

    @AfterEach
    void deleteUser() {
        tokens.deleteAll(tokens.findAll().stream().filter(t -> t.getUser().getId().equals(user.getId())).toList());
        userRepository.deleteById(user.getId());
    }

    private ResultActions requestLink(String email) throws Exception {
        return mockMvc.perform(post("/api/auth/password-reset").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"));
    }

    /** Asks for a link and returns the token from the email that was sent. */
    private String tokenFromEmail() throws Exception {
        requestLink(EMAIL).andExpect(status().isOk());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService, timeout(5000)).sendPasswordResetEmail(eq(EMAIL), eq("Rita"), link.capture(), eq(45));
        assertThat(link.getValue()).startsWith("http://localhost:5173/reset-password#token=");
        return link.getValue().substring(link.getValue().indexOf("#token=") + "#token=".length());
    }

    private ResultActions confirm(String token, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}"));
    }

    private int login(String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + password + "\"}"))
                .andReturn().getResponse().getStatus();
    }

    private static String sha256(String value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private List<PasswordResetToken> myTokens() {
        return tokens.findAll().stream().filter(t -> t.getUser().getId().equals(user.getId())).toList();
    }

    @Test
    void theLinkIsRandomSingleUseAndOnlyItsHashIsStored() throws Exception {
        String token = tokenFromEmail();

        assertThat(token).hasSizeGreaterThanOrEqualTo(43); // 256 random bits, base64url
        List<PasswordResetToken> stored = myTokens();
        assertThat(stored).hasSize(1);
        assertThat(stored.get(0).getTokenHash()).isEqualTo(sha256(token)).isNotEqualTo(token);
        assertThat(stored.get(0).getExpiresAt()).isBetween(LocalDateTime.now().plusMinutes(44), LocalDateTime.now().plusMinutes(46));
    }

    @Test
    void theAnswerIsTheSameWhetherOrNotTheEmailHasAnAccount() throws Exception {
        String known = requestLink(EMAIL).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String unknown = requestLink("nobody-" + System.nanoTime() + "@test.com").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String otherCase = requestLink(EMAIL.toUpperCase()).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(unknown).isEqualTo(known).isEqualTo(otherCase);
        assertThat((String) JsonPath.read(known, "$.message"))
                .isEqualTo("If an account exists for this email, we've sent a link to reset the password. It works once and expires in 45 minutes.");
        // One email in all: to the account's address (the upper-case request came within the minute).
        verify(emailService, timeout(5000)).sendPasswordResetEmail(eq(EMAIL), anyString(), anyString(), anyInt());
        verify(emailService, after(500).times(1)).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void theResetPageCanCheckALinkFirst() throws Exception {
        String token = tokenFromEmail();
        mockMvc.perform(post("/api/auth/password-reset/check").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/password-reset/check").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"made-up-token\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESET_LINK_INVALID"));
    }

    @Test
    void resettingChangesThePasswordAndTheLinkWorksOnce() throws Exception {
        String token = tokenFromEmail();

        confirm(token, NEW_PASSWORD).andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Your password has been changed. You can now log in with it."));
        assertThat(login(NEW_PASSWORD)).isEqualTo(200);
        assertThat(login(OLD_PASSWORD)).isEqualTo(401);

        confirm(token, "yet-another-password").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESET_LINK_INVALID"))
                .andExpect(jsonPath("$.message").value(
                        "This reset link is invalid, has already been used or has expired. Please ask for a new one."));
        assertThat(login(NEW_PASSWORD)).isEqualTo(200);
    }

    @Test
    void theNewPasswordFollowsTheSignupRule() throws Exception {
        String token = tokenFromEmail();
        confirm(token, "short").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.password").value("Password must be at least 8 characters"));
        // A refused password doesn't use up the link.
        confirm(token, NEW_PASSWORD).andExpect(status().isOk());
    }

    @Test
    void anExpiredLinkIsRefused() throws Exception {
        String token = tokenFromEmail();
        PasswordResetToken stored = myTokens().get(0);
        stored.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        tokens.save(stored);

        confirm(token, NEW_PASSWORD).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("RESET_LINK_INVALID"));
        assertThat(login(OLD_PASSWORD)).isEqualTo(200);
    }

    @Test
    void aNewLinkReplacesThePreviousOne() throws Exception {
        String first = tokenFromEmail();
        PasswordResetToken firstStored = myTokens().get(0);
        firstStored.setCreatedAt(LocalDateTime.now().minusMinutes(2)); // past the one-email-per-minute limit
        tokens.save(firstStored);

        requestLink(EMAIL).andExpect(status().isOk());
        verify(emailService, timeout(5000).times(2)).sendPasswordResetEmail(eq(EMAIL), anyString(), anyString(), anyInt());

        confirm(first, NEW_PASSWORD).andExpect(status().isBadRequest());
        assertThat(myTokens()).hasSize(2).filteredOn(t -> t.getUsedAt() == null).hasSize(1);
    }

    @Test
    void askingAgainWithinAMinuteSendsNoSecondEmail() throws Exception {
        tokenFromEmail();
        requestLink(EMAIL).andExpect(status().isOk());
        verify(emailService, after(700).times(1)).sendPasswordResetEmail(eq(EMAIL), anyString(), anyString(), anyInt());
        assertThat(myTokens()).hasSize(1);
    }

    @Test
    void resettingSignsTheUserOutEverywhere() throws Exception {
        String oldSession = "Bearer " + jwtService.generateToken(EMAIL);
        mockMvc.perform(get("/api/users/me").header("Authorization", oldSession)).andExpect(status().isOk());
        Thread.sleep(1100); // login tokens carry their issue time in whole seconds

        confirm(tokenFromEmail(), NEW_PASSWORD).andExpect(status().isOk());

        mockMvc.perform(get("/api/users/me").header("Authorization", oldSession))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
        String newSession = "Bearer " + JsonPath.read(mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + NEW_PASSWORD + "\"}"))
                .andReturn().getResponse().getContentAsString(), "$.token");
        mockMvc.perform(get("/api/users/me").header("Authorization", newSession)).andExpect(status().isOk());
    }

    @Test
    void invalidRequestsAreValidated() throws Exception {
        requestLink("not-an-email").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").value("Email must be valid"));
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString(), anyInt());
    }
}
