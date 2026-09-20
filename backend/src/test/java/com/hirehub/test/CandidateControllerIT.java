package com.hirehub.test;

import com.hirehub.entity.*;
import com.hirehub.repository.ApplicationRepository;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CandidateControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User persistUser(String email, Role role) {
        return userRepository.save(User.builder()
                .firstName("Test").lastName("User").email(email)
                .password(passwordEncoder.encode("password123")).role(role).build());
    }

    private JobOffer persistOffer(User recruiter, LocalDate deadline) {
        return jobOfferRepository.save(JobOffer.builder()
                .title("Dev Java Sfax").description("desc").location("Sfax")
                .contractType(ContractType.CDI)
                .publicationDate(LocalDate.now())
                .deadline(deadline)
                .recruiter(recruiter).build());
    }

    @Test
    void browseOffers_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/candidates/offers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void browseOffers_returns400WhenRecruiterCalls() throws Exception {
        User recruiter = persistUser("rec1@test.com", Role.RECRUITER);
        String token = jwtService.generateToken(recruiter.getEmail());

        mockMvc.perform(get("/api/candidates/offers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void browseOffers_marksAlreadyAppliedCorrectly() throws Exception {
        User recruiter = persistUser("rec2@test.com", Role.RECRUITER);
        User candidate = persistUser("cand2@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));

        applicationRepository.save(Application.builder()
                .cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer).build());

        String token = jwtService.generateToken(candidate.getEmail());

        mockMvc.perform(get("/api/candidates/offers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].alreadyApplied").value(true));
    }

    @Test
    void browseOffers_filtersByKeyword() throws Exception {
        User recruiter = persistUser("rec3@test.com", Role.RECRUITER);
        User candidate = persistUser("cand3@test.com", Role.CANDIDATE);
        persistOffer(recruiter, LocalDate.now().plusDays(10)); // "Dev Java Sfax"

        String token = jwtService.generateToken(candidate.getEmail());

        mockMvc.perform(get("/api/candidates/offers?keyword=Java")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", org.hamcrest.Matchers.not(org.hamcrest.Matchers.empty())));

        mockMvc.perform(get("/api/candidates/offers?keyword=Python")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", org.hamcrest.Matchers.empty()));
    }

    @Test
    void getOfferDetails_returns404WhenOfferNotFound() throws Exception {
        User candidate = persistUser("cand4@test.com", Role.CANDIDATE);
        String token = jwtService.generateToken(candidate.getEmail());

        mockMvc.perform(get("/api/candidates/offers/999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDashboard_returnsCorrectCounts() throws Exception {
        User recruiter = persistUser("rec5@test.com", Role.RECRUITER);
        User candidate = persistUser("cand5@test.com", Role.CANDIDATE);
        JobOffer offer1 = persistOffer(recruiter, LocalDate.now().plusDays(10));
        JobOffer offer2 = jobOfferRepository.save(JobOffer.builder()
                .title("Dev Python").description("desc").location("Tunis")
                .contractType(ContractType.CDD)
                .publicationDate(LocalDate.now())
                .deadline(LocalDate.now().plusDays(15))
                .recruiter(recruiter).build());

        applicationRepository.save(Application.builder()
                .cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer1).build());
        applicationRepository.save(Application.builder()
                .cv("cv.pdf").status(ApplicationStatus.ACCEPTED)
                .applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer2).build());

        String token = jwtService.generateToken(candidate.getEmail());

        mockMvc.perform(get("/api/candidates/dashboard")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplications").value(2))
                .andExpect(jsonPath("$.pendingApplications").value(1))
                .andExpect(jsonPath("$.acceptedApplications").value(1))
                .andExpect(jsonPath("$.rejectedApplications").value(0));
    }

    @Test
    void getDashboard_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/candidates/dashboard"))
                .andExpect(status().isUnauthorized());
    }
}
