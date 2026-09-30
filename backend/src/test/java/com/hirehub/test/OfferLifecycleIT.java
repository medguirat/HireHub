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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Phase 3: what candidates see in the feed, and closing instead of deleting. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OfferLifecycleIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User user(String email, Role role) {
        return userRepository.save(User.builder().firstName("Test").lastName("User").email(email)
                .password(passwordEncoder.encode("password123")).role(role).build());
    }

    private String token(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }

    private JobOffer offer(User recruiter, String title, LocalDate published, LocalDate deadline, OfferStatus status) {
        return jobOfferRepository.save(JobOffer.builder().title(title).description("desc").location("Tunis")
                .contractType(ContractType.CDI).publicationDate(published).publishedAt(published.atTime(9, 0))
                .deadline(deadline).status(status).recruiter(recruiter).build());
    }

    private void apply(User candidate, JobOffer offer) {
        applicationRepository.save(Application.builder().cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now()).candidate(candidate).jobOffer(offer).build());
    }

    @Test
    void aJustPublishedOfferIsFirstInTheCandidateFeedAndMarkedNew() throws Exception {
        User recruiter = user("feed-rec@test.com", Role.RECRUITER);
        User candidate = user("feed-cand@test.com", Role.CANDIDATE);
        offer(recruiter, "Older offer", LocalDate.now().minusDays(5), LocalDate.now().plusDays(20), OfferStatus.OPEN);

        mockMvc.perform(post("/api/recruiters/offers").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Brand new offer\",\"description\":\"Java\",\"location\":\"Tunis\","
                                + "\"contractType\":\"CDI\",\"deadline\":\"" + LocalDate.now().plusDays(30) + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/candidates/offers").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Brand new offer"))
                .andExpect(jsonPath("$.content[0].newlyPublished").value(true))
                .andExpect(jsonPath("$.content[1].title").value("Older offer"))
                .andExpect(jsonPath("$.content[1].newlyPublished").value(false));
    }

    @Test
    void closedAndExpiredOffersAreNotShownToCandidatesOrPublicly() throws Exception {
        User recruiter = user("vis-rec@test.com", Role.RECRUITER);
        User candidate = user("vis-cand@test.com", Role.CANDIDATE);
        offer(recruiter, "Open offer", LocalDate.now(), LocalDate.now().plusDays(10), OfferStatus.OPEN);
        offer(recruiter, "Closed offer", LocalDate.now(), LocalDate.now().plusDays(10), OfferStatus.CLOSED);
        offer(recruiter, "Expired offer", LocalDate.now().minusDays(40), LocalDate.now().minusDays(1), OfferStatus.OPEN);

        mockMvc.perform(get("/api/candidates/offers").header("Authorization", token(candidate)))
                .andExpect(jsonPath("$.content[*].title", hasItem("Open offer")))
                .andExpect(jsonPath("$.content[*].title", not(hasItem("Closed offer"))))
                .andExpect(jsonPath("$.content[*].title", not(hasItem("Expired offer"))));
        mockMvc.perform(get("/api/joboffers"))
                .andExpect(jsonPath("$.content[*].title", hasItem("Open offer")))
                .andExpect(jsonPath("$.content[*].title", not(hasItem("Closed offer"))))
                .andExpect(jsonPath("$.content[*].title", not(hasItem("Expired offer"))));
    }

    @Test
    void deletingAnOfferWithApplicationsClosesItAndKeepsItsHistory() throws Exception {
        User recruiter = user("close-rec@test.com", Role.RECRUITER);
        User candidate = user("close-cand@test.com", Role.CANDIDATE);
        User lateCandidate = user("close-late@test.com", Role.CANDIDATE);
        JobOffer offer = offer(recruiter, "Offer with applicants", LocalDate.now(), LocalDate.now().plusDays(10),
                OfferStatus.OPEN);
        apply(candidate, offer);

        mockMvc.perform(delete("/api/recruiters/offers/" + offer.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("CLOSED"));

        JobOffer stored = jobOfferRepository.findById(offer.getId()).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(OfferStatus.CLOSED);
        assertThat(stored.getClosedAt()).isBeforeOrEqualTo(LocalDateTime.now());

        // The recruiter still sees the offer and its applicant.
        mockMvc.perform(get("/api/recruiters/offers").header("Authorization", token(recruiter)))
                .andExpect(jsonPath("$.content[0].title").value("Offer with applicants"))
                .andExpect(jsonPath("$.content[0].status").value("CLOSED"))
                .andExpect(jsonPath("$.content[0].applicationCount").value(1));
        mockMvc.perform(get("/api/applications").header("Authorization", token(recruiter)))
                .andExpect(jsonPath("$.content[0].jobOfferTitle").value("Offer with applicants"));

        // The candidate still sees the application, marked as closed; the offer left the feed.
        mockMvc.perform(get("/api/applications").header("Authorization", token(candidate)))
                .andExpect(jsonPath("$.content[0].jobOfferTitle").value("Offer with applicants"))
                .andExpect(jsonPath("$.content[0].offerClosed").value(true));
        mockMvc.perform(get("/api/candidates/offers/" + offer.getId()).header("Authorization", token(candidate)))
                .andExpect(status().isNotFound());

        // Nobody can apply anymore.
        mockMvc.perform(post("/api/applications").header("Authorization", token(lateCandidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cvFileId\":\"not-checked-before-the-offer\",\"jobOfferId\":" + offer.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("This offer has been closed and no longer accepts applications."));
    }

    @Test
    void deletingAnOfferWithoutApplicationsReallyDeletesIt() throws Exception {
        User recruiter = user("del-rec@test.com", Role.RECRUITER);
        JobOffer offer = offer(recruiter, "Unused offer", LocalDate.now(), LocalDate.now().plusDays(10), OfferStatus.OPEN);

        mockMvc.perform(delete("/api/recruiters/offers/" + offer.getId()).header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("DELETED"));
        assertThat(jobOfferRepository.findById(offer.getId())).isEmpty();
    }

    @Test
    void onlyTheOwnerCanDeleteOrClose() throws Exception {
        User owner = user("own-rec@test.com", Role.RECRUITER);
        User other = user("other-rec@test.com", Role.RECRUITER);
        JobOffer offer = offer(owner, "Owned offer", LocalDate.now(), LocalDate.now().plusDays(10), OfferStatus.OPEN);

        mockMvc.perform(delete("/api/recruiters/offers/" + offer.getId()).header("Authorization", token(other)))
                .andExpect(status().isForbidden());
        assertThat(jobOfferRepository.findById(offer.getId())).isPresent();
    }
}
