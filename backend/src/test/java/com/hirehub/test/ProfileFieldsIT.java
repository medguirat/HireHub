package com.hirehub.test;

import com.hirehub.entity.CandidateProfile;
import com.hirehub.entity.RecruiterProfile;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.repository.CandidateProfileRepository;
import com.hirehub.repository.RecruiterProfileRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Phase 6: new candidate profile fields and the widened company description. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProfileFieldsIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private CandidateProfileRepository candidateProfileRepository;
    @Autowired private RecruiterProfileRepository recruiterProfileRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User user(String email, Role role) {
        User user = userRepository.save(User.builder().firstName("Test").lastName("User").email(email)
                .password(passwordEncoder.encode("password123")).role(role).build());
        if (role == Role.CANDIDATE) {
            candidateProfileRepository.save(CandidateProfile.builder().user(user).build());
        } else {
            recruiterProfileRepository.save(RecruiterProfile.builder().user(user).build());
        }
        return user;
    }

    private String token(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }

    @Test
    void candidateHeadlineAndEducationAreSaved() throws Exception {
        User candidate = user("profile-cand@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headline\": \"  Java backend developer \", \"education\": \"Master, ENICAR (2024)\","
                                + " \"skills\": [\"Java\"], \"experiences\": []}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("Java backend developer"))
                .andExpect(jsonPath("$.education").value("Master, ENICAR (2024)"));

        mockMvc.perform(get("/api/candidates/me").header("Authorization", token(candidate)))
                .andExpect(jsonPath("$.headline").value("Java backend developer"));
    }

    @Test
    void candidateLanguagesAreSavedInOrderWithoutDuplicates() throws Exception {
        User candidate = user("profile-lang@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"languages\": [{\"language\": \"English\", \"level\": \"FLUENT\"},"
                                + " {\"language\": \" Arabic \", \"level\": \"NATIVE\"},"
                                + " {\"language\": \"english\", \"level\": \"PROFESSIONAL\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.languages.length()").value(2))
                .andExpect(jsonPath("$.languages[0].language").value("english"))
                .andExpect(jsonPath("$.languages[0].level").value("PROFESSIONAL"))
                .andExpect(jsonPath("$.languages[1].language").value("Arabic"))
                .andExpect(jsonPath("$.languages[1].level").value("NATIVE"));
    }

    @Test
    void aLanguageNeedsANameAndAKnownLevel() throws Exception {
        User candidate = user("profile-lang-bad@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"languages\": [{\"language\": \"\", \"level\": \"FLUENT\"}]}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"languages\": [{\"language\": \"French\", \"level\": \"GODLIKE\"}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Invalid value for languages[0].level. Allowed values: NATIVE, FLUENT, PROFESSIONAL, INTERMEDIATE, BASIC."));
    }

    @Test
    void candidateHeadlineIsLimitedTo150Characters() throws Exception {
        User candidate = user("profile-cand-long@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headline\": \"" + "a".repeat(151) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.headline").value("Headline must be at most 150 characters"));
    }

    @Test
    void companyDescriptionIsNoLongerCutAt255Characters() throws Exception {
        User recruiter = user("profile-rec@test.com", Role.RECRUITER);
        String description = "We build banking software. ".repeat(100).trim(); // ~2,700 characters
        mockMvc.perform(put("/api/recruiters/profile").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\": \"Acme\", \"description\": \"" + description + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value(description));
    }

    @Test
    void companyDescriptionOver5000CharactersIsRejectedWithAMessage() throws Exception {
        User recruiter = user("profile-rec-long@test.com", Role.RECRUITER);
        mockMvc.perform(put("/api/recruiters/profile").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\": \"Acme\", \"description\": \"" + "a".repeat(5001) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.description").value("Description must be at most 5000 characters"));
    }
}
