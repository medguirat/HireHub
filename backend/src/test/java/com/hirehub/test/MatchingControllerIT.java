package com.hirehub.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirehub.entity.*;
import com.hirehub.exception.ApiException;
import com.hirehub.matching.AiServiceClient;
import com.hirehub.matching.AiServiceUnavailableException;
import com.hirehub.repository.JobOfferRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** CV upload and matching endpoints, with the ai-service mocked. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MatchingControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper mapper;

    @MockitoBean private AiServiceClient aiService;

    private static final String BREAKDOWN = """
            {"algorithm_version":"t1","overall_score":74,
             "categories":{"skills":{"score":80}},"skills":{"missing_required":["Docker"]},
             "recommendations":["a","b"],"recommendations_source":"rules"}""";

    private User persistUser(String email, Role role) {
        return userRepository.save(User.builder().firstName("Test").lastName("User").email(email)
                .password(passwordEncoder.encode("password123")).role(role).build());
    }

    private String token(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }

    private JobOffer persistOffer(User recruiter) {
        return jobOfferRepository.save(JobOffer.builder().title("Java Developer").description("Java, Spring Boot, Docker")
                .location("Tunis").contractType(ContractType.CDI).publicationDate(LocalDate.now())
                .deadline(LocalDate.now().plusDays(30)).recruiter(recruiter).build());
    }

    private MockHttpServletRequestBuilder uploadCv(User candidate, String fileName, byte[] content) {
        return multipart(HttpMethod.PUT, "/api/candidates/me/cv")
                .file(new MockMultipartFile("file", fileName, "application/octet-stream", content))
                .header("Authorization", token(candidate));
    }

    @Test
    void cvUploadExtractsTextAndReportsIt() throws Exception {
        User candidate = persistUser("cv1@test.com", Role.CANDIDATE);
        when(aiService.extractText(any(), eq("cv.pdf"))).thenReturn(new AiServiceClient.ExtractedText("Java dev", "pdf"));

        mockMvc.perform(uploadCv(candidate, "cv.pdf", "%PDF-1.4 cv".getBytes()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("cv.pdf"))
                .andExpect(jsonPath("$.textExtracted").value(true));
        mockMvc.perform(get("/api/candidates/me/cv").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("cv.pdf"));
    }

    @Test
    void noCvYetIs404() throws Exception {
        User candidate = persistUser("cv2@test.com", Role.CANDIDATE);
        mockMvc.perform(get("/api/candidates/me/cv").header("Authorization", token(candidate)))
                .andExpect(status().isNotFound());
    }

    @Test
    void wrongFileTypeIsRejectedBeforeReachingTheAiService() throws Exception {
        User candidate = persistUser("cv3@test.com", Role.CANDIDATE);
        mockMvc.perform(uploadCv(candidate, "cv.txt", "hello".getBytes()))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("CV_UNSUPPORTED_FORMAT"));
        verifyNoInteractions(aiService);
    }

    @Test
    void unreadableCvIsRejectedAndNotStored() throws Exception {
        User candidate = persistUser("cv4@test.com", Role.CANDIDATE);
        when(aiService.extractText(any(), any())).thenThrow(ApiException.cvUnreadable("We couldn't find any text."));

        mockMvc.perform(uploadCv(candidate, "scan.pdf", "%PDF-1.4".getBytes()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CV_UNREADABLE"))
                .andExpect(jsonPath("$.message").value("We couldn't find any text."));
        mockMvc.perform(get("/api/candidates/me/cv").header("Authorization", token(candidate)))
                .andExpect(status().isNotFound());
    }

    @Test
    void cvIsKeptIfTheAiServiceIsDownAtUpload() throws Exception {
        User candidate = persistUser("cv5@test.com", Role.CANDIDATE);
        when(aiService.extractText(any(), any())).thenThrow(new AiServiceUnavailableException("down", null));

        mockMvc.perform(uploadCv(candidate, "cv.docx", "PK docx".getBytes()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.textExtracted").value(false));
    }

    @Test
    void matchingRequiresACv() throws Exception {
        User recruiter = persistUser("rec-m1@test.com", Role.RECRUITER);
        User candidate = persistUser("cand-m1@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter);

        mockMvc.perform(get("/api/candidates/offers/" + offer.getId() + "/match").header("Authorization", token(candidate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CV_REQUIRED"));
    }

    @Test
    void matchReturnsTheBreakdownThenServesItFromCache() throws Exception {
        User recruiter = persistUser("rec-m2@test.com", Role.RECRUITER);
        User candidate = persistUser("cand-m2@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter);
        when(aiService.extractText(any(), any())).thenReturn(new AiServiceClient.ExtractedText("Java dev", "pdf"));
        when(aiService.match("Java dev", "Java Developer", "Java, Spring Boot, Docker")).thenReturn(mapper.readTree(BREAKDOWN));
        mockMvc.perform(uploadCv(candidate, "cv.pdf", "%PDF-1.4 v1".getBytes())).andExpect(status().isOk());

        String url = "/api/candidates/offers/" + offer.getId() + "/match";
        mockMvc.perform(get(url).header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cached").value(false))
                .andExpect(jsonPath("$.offerTitle").value("Java Developer"))
                .andExpect(jsonPath("$.result.overall_score").value(74))
                .andExpect(jsonPath("$.result.skills.missing_required[0]").value("Docker"));
        mockMvc.perform(get(url).header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cached").value(true))
                .andExpect(jsonPath("$.result.overall_score").value(74));
        verify(aiService, times(1)).match(any(), any(), any());

        // A new CV version invalidates the cache.
        mockMvc.perform(uploadCv(candidate, "cv.pdf", "%PDF-1.4 v2".getBytes())).andExpect(status().isOk());
        mockMvc.perform(get(url).header("Authorization", token(candidate)))
                .andExpect(jsonPath("$.cached").value(false));
        verify(aiService, times(2)).match(any(), any(), any());
    }

    @Test
    void aiServiceDownGives503AndNeverAScore() throws Exception {
        User recruiter = persistUser("rec-m3@test.com", Role.RECRUITER);
        User candidate = persistUser("cand-m3@test.com", Role.CANDIDATE);
        JobOffer offer = persistOffer(recruiter);
        when(aiService.extractText(any(), any())).thenReturn(new AiServiceClient.ExtractedText("Java dev", "pdf"));
        when(aiService.match(any(), any(), any())).thenThrow(new AiServiceUnavailableException("down", null));
        mockMvc.perform(uploadCv(candidate, "cv.pdf", "%PDF-1.4".getBytes())).andExpect(status().isOk());

        mockMvc.perform(get("/api/candidates/offers/" + offer.getId() + "/match").header("Authorization", token(candidate)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("MATCHING_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value(
                        "The matching service is temporarily unavailable. Please try again in a moment."))
                .andExpect(jsonPath("$.result").doesNotExist());
    }

    @Test
    void unknownOfferIs404() throws Exception {
        User candidate = persistUser("cand-m4@test.com", Role.CANDIDATE);
        when(aiService.extractText(any(), any())).thenReturn(new AiServiceClient.ExtractedText("Java dev", "pdf"));
        mockMvc.perform(uploadCv(candidate, "cv.pdf", "%PDF-1.4".getBytes())).andExpect(status().isOk());

        mockMvc.perform(get("/api/candidates/offers/999999/match").header("Authorization", token(candidate)))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyCandidatesCanMatchOrUpload() throws Exception {
        User recruiter = persistUser("rec-m5@test.com", Role.RECRUITER);
        JobOffer offer = persistOffer(recruiter);

        mockMvc.perform(get("/api/candidates/offers/" + offer.getId() + "/match").header("Authorization", token(recruiter)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(uploadCv(recruiter, "cv.pdf", "%PDF".getBytes()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/candidates/offers/" + offer.getId() + "/match"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.aiService.status").exists());
    }
}
