package com.hirehub.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirehub.dto.ApplicationRequestDto;
import com.hirehub.dto.ApplicationStatusUpdateDto;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApplicationControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
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
                .title("Dev Java").description("desc").location("Sfax")
                .contractType(ContractType.CDI)
                .publicationDate(LocalDate.now())
                .deadline(deadline)
                .recruiter(recruiter).build());
    }

    @Test
    void applicationsAreListedNewestFirst() throws Exception {
        User recruiter = persistUser("rec-order@test.com", Role.RECRUITER);
        JobOffer first = persistOffer(recruiter, LocalDate.now().plusDays(10));
        JobOffer second = persistOffer(recruiter, LocalDate.now().plusDays(10));
        User candidate = persistUser("cand-order@test.com", Role.CANDIDATE);
        Application older = applicationRepository.save(Application.builder().cv("a.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now()).candidate(candidate).jobOffer(first).build());
        Application newer = applicationRepository.save(Application.builder().cv("b.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now()).candidate(candidate).jobOffer(second).build());

        mockMvc.perform(get("/api/applications").header("Authorization", "Bearer " + jwtService.generateToken(recruiter.getEmail())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(newer.getId()))
                .andExpect(jsonPath("$.content[1].id").value(older.getId()));
    }

    @Test
    void createApplication_returns200OnValidRequest() throws Exception {
        User recruiter = persistUser("rec1@test.com", Role.RECRUITER);
        User candidate = persistUser("cand1@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));
        String token = jwtService.generateToken(candidate.getEmail());

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setCoverLetter("Motivated");
        dto.setJobOfferId(offer.getId());

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void createApplication_returns400WhenMissingCv() throws Exception {
        User recruiter = persistUser("rec2@test.com", Role.RECRUITER);
        User candidate = persistUser("cand2@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));
        String token = jwtService.generateToken(candidate.getEmail());

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setJobOfferId(offer.getId());
        // cv manquant volontairement

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.cv").exists());
    }

    @Test
    void createApplication_returns403WhenRecruiterTriesToApply() throws Exception {
        User recruiter = persistUser("rec3@test.com", Role.RECRUITER);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));
        String token = jwtService.generateToken(recruiter.getEmail());

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setJobOfferId(offer.getId());

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void createApplication_returns400WhenDuplicateApplication() throws Exception {
        User recruiter = persistUser("rec4@test.com", Role.RECRUITER);
        User candidate = persistUser("cand4@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));
        String token = jwtService.generateToken(candidate.getEmail());

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setJobOfferId(offer.getId());

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createApplication_returns400WhenDeadlinePassed() throws Exception {
        User recruiter = persistUser("rec5@test.com", Role.RECRUITER);
        User candidate = persistUser("cand5@test.com", Role.CANDIDATE);
        // Offre créée directement en base avec deadline passée (contourne la validation de création d'offre)
        JobOffer offer = jobOfferRepository.save(JobOffer.builder()
                .title("Old offer").description("desc").location("Sfax")
                .contractType(ContractType.CDI)
                .publicationDate(LocalDate.now().minusDays(30))
                .deadline(LocalDate.now().minusDays(1))
                .recruiter(recruiter).build());

        String token = jwtService.generateToken(candidate.getEmail());

        ApplicationRequestDto dto = new ApplicationRequestDto();
        dto.setCv("cv.pdf");
        dto.setJobOfferId(offer.getId());

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getApplicationById_returns403WhenStrangerAccesses() throws Exception {
        User recruiter = persistUser("rec6@test.com", Role.RECRUITER);
        User candidate = persistUser("cand6@test.com", Role.CANDIDATE);
        User stranger = persistUser("stranger6@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));

        Application app = applicationRepository.save(Application.builder()
                .cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer).build());

        String strangerToken = jwtService.generateToken(stranger.getEmail());

        mockMvc.perform(get("/api/applications/" + app.getId())
                        .header("Authorization", "Bearer " + strangerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateStatus_returns403WhenNonRecruiterTries() throws Exception {
        User recruiter = persistUser("rec7@test.com", Role.RECRUITER);
        User candidate = persistUser("cand7@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));

        Application app = applicationRepository.save(Application.builder()
                .cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer).build());

        String candidateToken = jwtService.generateToken(candidate.getEmail());

        ApplicationStatusUpdateDto dto = new ApplicationStatusUpdateDto();
        dto.setStatus(ApplicationStatus.ACCEPTED);

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/status")
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateStatus_succeedsForOwnerRecruiter() throws Exception {
        User recruiter = persistUser("rec8@test.com", Role.RECRUITER);
        User candidate = persistUser("cand8@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));

        Application app = applicationRepository.save(Application.builder()
                .cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer).build());

        String recruiterToken = jwtService.generateToken(recruiter.getEmail());

        ApplicationStatusUpdateDto dto = new ApplicationStatusUpdateDto();
        dto.setStatus(ApplicationStatus.ACCEPTED);
        dto.setInterviewDate(java.time.LocalDateTime.now().plusDays(3));

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/status")
                        .header("Authorization", "Bearer " + recruiterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    void deleteApplication_candidateCanWithdrawPendingApplication() throws Exception {
        User recruiter = persistUser("rec9@test.com", Role.RECRUITER);
        User candidate = persistUser("cand9@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter, LocalDate.now().plusDays(10));

        Application app = applicationRepository.save(Application.builder()
                .cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer).build());

        String token = jwtService.generateToken(candidate.getEmail());

        mockMvc.perform(delete("/api/applications/" + app.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void getAllApplications_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/applications"))
                .andExpect(status().isUnauthorized());
    }
}
