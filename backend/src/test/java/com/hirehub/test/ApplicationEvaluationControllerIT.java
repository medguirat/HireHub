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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** The recruiter's manual evaluation of an application, persisted server-side. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApplicationEvaluationControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private static final String EVALUATION = """
            {"technicalSkills":4,"experience":3,"communication":5,"culturalFit":4,
             "hasDegree":true,"passedTest":true,"availableNow":false,
             "notes":"Strong system design answers","interviewType":"ONSITE"}""";

    private User persistUser(String email, Role role) {
        return userRepository.save(User.builder().firstName("Test").lastName("User").email(email)
                .password(passwordEncoder.encode("password123")).role(role).build());
    }

    private String token(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }

    private Application persistApplication(User recruiter, User candidate) {
        JobOffer offer = jobOfferRepository.save(JobOffer.builder().title("Dev").description("desc").location("Tunis")
                .contractType(ContractType.CDI).publicationDate(LocalDate.now()).deadline(LocalDate.now().plusDays(10))
                .recruiter(recruiter).build());
        return applicationRepository.save(Application.builder().cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now()).candidate(candidate).jobOffer(offer).build());
    }

    @Test
    void ownerSavesThenReadsTheEvaluationWithAServerComputedScore() throws Exception {
        User recruiter = persistUser("eval-rec1@test.com", Role.RECRUITER);
        Application app = persistApplication(recruiter, persistUser("eval-cand1@test.com", Role.CANDIDATE));
        String url = "/api/applications/" + app.getId() + "/evaluation";

        // average 4/5 -> 13.6, plus 2 checklist points = 15.6 / 20
        mockMvc.perform(put(url).header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON).content(EVALUATION))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(15.6))
                .andExpect(jsonPath("$.evaluatedBy").value("Test User"));

        mockMvc.perform(get(url).header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.communication").value(5))
                .andExpect(jsonPath("$.notes").value("Strong system design answers"))
                .andExpect(jsonPath("$.interviewType").value("ONSITE"));
    }

    @Test
    void savingAgainUpdatesTheSameEvaluation() throws Exception {
        User recruiter = persistUser("eval-rec2@test.com", Role.RECRUITER);
        Application app = persistApplication(recruiter, persistUser("eval-cand2@test.com", Role.CANDIDATE));
        String url = "/api/applications/" + app.getId() + "/evaluation";
        mockMvc.perform(put(url).header("Authorization", token(recruiter))
                .contentType(MediaType.APPLICATION_JSON).content(EVALUATION)).andExpect(status().isOk());

        mockMvc.perform(put(url).header("Authorization", token(recruiter)).contentType(MediaType.APPLICATION_JSON)
                        .content(EVALUATION.replace("\"technicalSkills\":4", "\"technicalSkills\":1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.technicalSkills").value(1));
        mockMvc.perform(get(url).header("Authorization", token(recruiter)))
                .andExpect(jsonPath("$.technicalSkills").value(1));
    }

    @Test
    void nothingSavedYetIs404() throws Exception {
        User recruiter = persistUser("eval-rec3@test.com", Role.RECRUITER);
        Application app = persistApplication(recruiter, persistUser("eval-cand3@test.com", Role.CANDIDATE));
        mockMvc.perform(get("/api/applications/" + app.getId() + "/evaluation").header("Authorization", token(recruiter)))
                .andExpect(status().isNotFound());
    }

    @Test
    void ratingsOutsideOneToFiveAreRejected() throws Exception {
        User recruiter = persistUser("eval-rec4@test.com", Role.RECRUITER);
        Application app = persistApplication(recruiter, persistUser("eval-cand4@test.com", Role.CANDIDATE));
        mockMvc.perform(put("/api/applications/" + app.getId() + "/evaluation").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON).content(EVALUATION.replace("\"communication\":5", "\"communication\":6")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.communication").value("Ratings go from 1 to 5."));
    }

    @Test
    void otherRecruitersAndCandidatesCannotEvaluate() throws Exception {
        User owner = persistUser("eval-rec5@test.com", Role.RECRUITER);
        User candidate = persistUser("eval-cand5@test.com", Role.CANDIDATE);
        User otherRecruiter = persistUser("eval-rec6@test.com", Role.RECRUITER);
        Application app = persistApplication(owner, candidate);
        String url = "/api/applications/" + app.getId() + "/evaluation";

        mockMvc.perform(put(url).header("Authorization", token(otherRecruiter))
                .contentType(MediaType.APPLICATION_JSON).content(EVALUATION)).andExpect(status().isBadRequest());
        mockMvc.perform(put(url).header("Authorization", token(candidate))
                .contentType(MediaType.APPLICATION_JSON).content(EVALUATION)).andExpect(status().isBadRequest());
        mockMvc.perform(get(url)).andExpect(status().isUnauthorized());
    }
}
