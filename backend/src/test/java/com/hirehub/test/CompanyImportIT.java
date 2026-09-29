package com.hirehub.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hirehub.company.CompanyScrapeException;
import com.hirehub.company.CompanyScraperClient;
import com.hirehub.company.CompanyScraperClient.ScrapedCompany;
import com.hirehub.entity.CompanyImportStatus;
import com.hirehub.entity.RecruiterProfile;
import com.hirehub.entity.User;
import com.hirehub.matching.AiServiceUnavailableException;
import com.hirehub.repository.CandidateProfileRepository;
import com.hirehub.repository.RecruiterProfileRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import com.hirehub.service.EmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 4: company details imported from the website given at recruiter signup,
 * in the background, with the scraper (ai-service) mocked. Not @Transactional:
 * the import only starts once the signup transaction has committed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompanyImportIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RecruiterProfileRepository profileRepository;
    @Autowired private CandidateProfileRepository candidateProfileRepository;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private CompanyScraperClient scraperClient;
    @MockitoBean private EmailService emailService;

    private final List<String> createdEmails = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (String email : createdEmails) {
            userRepository.findByEmail(email).ifPresent(user -> {
                profileRepository.findById(user.getId()).ifPresent(profileRepository::delete);
                candidateProfileRepository.findById(user.getId()).ifPresent(candidateProfileRepository::delete);
                userRepository.delete(user);
            });
        }
    }

    private void signUp(String email, String companyName, String website) throws Exception {
        createdEmails.add(email);
        ObjectNode body = objectMapper.createObjectNode()
                .put("firstName", "Rec").put("lastName", "Ruiter").put("email", email)
                .put("password", "password123").put("role", "RECRUITER");
        if (companyName != null) body.put("companyName", companyName);
        if (website != null) body.put("companyWebsite", website);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk());
    }

    private String token(String email) {
        return "Bearer " + jwtService.generateToken(email);
    }

    private RecruiterProfile profile(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return profileRepository.findById(user.getId()).orElseThrow();
    }

    /** Waits for the background import to leave IN_PROGRESS. */
    private RecruiterProfile awaitImport(String email) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            RecruiterProfile profile = profile(email);
            if (profile.getCompanyImportStatus() != CompanyImportStatus.IN_PROGRESS) {
                return profile;
            }
            Thread.sleep(50);
        }
        throw new AssertionError("The company import didn't finish in time");
    }

    private ScrapedCompany scraped(String json) throws Exception {
        return new ScrapedCompany("https://acme.example.com", objectMapper.readTree(json));
    }

    @Test
    void signupFillsTheProfileFromTheWebsiteAndMarksTheImportedFields() throws Exception {
        when(scraperClient.scrape("https://acme.example.com")).thenReturn(scraped("""
                {"companyName": "Acme Software SA", "description": "Banking software.",
                 "foundedYear": 2006, "headquarters": "Sousse, Tunisia",
                 "linkedin": "https://www.linkedin.com/company/acme", "technologies": "Java, React"}"""));

        signUp("import-ok@test.com", "Acme", "acme.example.com");
        RecruiterProfile profile = awaitImport("import-ok@test.com");

        assertThat(profile.getCompanyImportStatus()).isEqualTo(CompanyImportStatus.COMPLETED);
        assertThat(profile.getWebsite()).isEqualTo("https://acme.example.com");
        assertThat(profile.getCompanyName()).isEqualTo("Acme"); // typed at signup: kept
        assertThat(profile.getFoundedYear()).isEqualTo(2006);
        assertThat(profile.getHeadquarters()).isEqualTo("Sousse, Tunisia");
        assertThat(profile.getIndustry()).isNull(); // not on the site: stays empty
        assertThat(profile.getCompanyType()).isNull();

        mockMvc.perform(get("/api/recruiters/profile").header("Authorization", token("import-ok@test.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyImportStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.companyImportMessage").value(
                        "We filled 5 fields from your website. Please review them and correct anything that's off."))
                .andExpect(jsonPath("$.autoFilledFields", containsInAnyOrder(
                        "description", "foundedYear", "headquarters", "technologies", "linkedin")));
    }

    @Test
    void importedTextIsNeverCutAndOverlongValuesAreLeftOut() throws Exception {
        String longDescription = "We build banking software for banks across Africa. ".repeat(20).trim(); // ~1,000 chars
        when(scraperClient.scrape(anyString())).thenReturn(scraped(
                "{\"description\": \"" + longDescription + "\", \"headquarters\": \"" + "x".repeat(300) + "\"}"));

        signUp("import-long@test.com", "Acme", "acme.example.com");
        RecruiterProfile profile = awaitImport("import-long@test.com");

        assertThat(profile.getDescription()).isEqualTo(longDescription); // whole, not cut at 255
        assertThat(profile.getHeadquarters()).isNull(); // longer than its column: left for the recruiter
    }

    @Test
    void editingAnImportedFieldRemovesItsMarker() throws Exception {
        when(scraperClient.scrape(anyString())).thenReturn(scraped(
                "{\"description\": \"Banking software.\", \"foundedYear\": 2006}"));
        signUp("import-edit@test.com", "Acme", "https://acme.example.com");
        awaitImport("import-edit@test.com");

        mockMvc.perform(put("/api/recruiters/profile").header("Authorization", token("import-edit@test.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\": \"Acme\", \"description\": \"We build banking software.\","
                                + " \"foundedYear\": 2006}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.autoFilledFields", containsInAnyOrder("foundedYear")));
    }

    @Test
    void signupSucceedsWhenTheWebsiteCantBeImported() throws Exception {
        when(scraperClient.scrape(anyString())).thenThrow(new CompanyScrapeException("unreachable",
                "We couldn't reach this website. Please check the address."));

        signUp("import-down-site@test.com", "Acme", "acme.example.com");
        RecruiterProfile profile = awaitImport("import-down-site@test.com");

        assertThat(profile.getCompanyImportStatus()).isEqualTo(CompanyImportStatus.FAILED);
        assertThat(profile.getCompanyImportMessage()).isEqualTo(
                "We couldn't reach this website. Please check the address. You can fill in your company details yourself.");
        assertThat(profile.getCompanyName()).isEqualTo("Acme");
        assertThat(profile.getDescription()).isNull();
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"import-down-site@test.com\", \"password\": \"password123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void signupSucceedsWhenTheAiServiceIsDown() throws Exception {
        when(scraperClient.scrape(anyString())).thenThrow(new AiServiceUnavailableException("down", null));

        signUp("import-down-ai@test.com", null, "acme.example.com");
        RecruiterProfile profile = awaitImport("import-down-ai@test.com");

        assertThat(profile.getCompanyImportStatus()).isEqualTo(CompanyImportStatus.FAILED);
        assertThat(profile.getCompanyImportMessage()).startsWith("We couldn't import your company details right now.");
    }

    @Test
    void anInvalidWebsiteDoesNotBlockSignupAndIsNeverFetched() throws Exception {
        signUp("import-bad-url@test.com", "Acme", "ftp://files.example.com");
        RecruiterProfile profile = profile("import-bad-url@test.com");

        assertThat(profile.getCompanyImportStatus()).isEqualTo(CompanyImportStatus.FAILED);
        assertThat(profile.getCompanyImportMessage()).startsWith("This website address isn't valid");
        verify(scraperClient, never()).scrape(anyString());
    }

    @Test
    void noWebsiteMeansNoImport() throws Exception {
        signUp("import-none@test.com", "Acme", null);

        mockMvc.perform(get("/api/recruiters/profile").header("Authorization", token("import-none@test.com")))
                .andExpect(jsonPath("$.companyImportStatus").value("NOT_REQUESTED"))
                .andExpect(jsonPath("$.companyName").value("Acme"))
                .andExpect(jsonPath("$.autoFilledFields", empty()));
        verify(scraperClient, never()).scrape(anyString());
    }

    @Test
    void retryingNeverOverwritesWhatTheRecruiterEntered() throws Exception {
        when(scraperClient.scrape(anyString())).thenThrow(new AiServiceUnavailableException("down", null));
        signUp("import-retry@test.com", "Acme", "acme.example.com");
        awaitImport("import-retry@test.com");
        mockMvc.perform(put("/api/recruiters/profile").header("Authorization", token("import-retry@test.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\": \"Acme\", \"website\": \"acme.example.com\", \"description\": \"Written by me.\"}"))
                .andExpect(status().isOk());

        reset(scraperClient);
        CountDownLatch release = new CountDownLatch(1);
        when(scraperClient.scrape("https://acme.example.com")).thenAnswer(inv -> {
            release.await(5, TimeUnit.SECONDS);
            return scraped("{\"description\": \"From the site.\", \"vision\": \"Open banking for all.\"}");
        });

        mockMvc.perform(post("/api/recruiters/profile/import").header("Authorization", token("import-retry@test.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyImportStatus").value("IN_PROGRESS"));
        // A second click while it runs doesn't start another import.
        mockMvc.perform(post("/api/recruiters/profile/import").header("Authorization", token("import-retry@test.com")))
                .andExpect(jsonPath("$.companyImportStatus").value("IN_PROGRESS"));
        release.countDown();
        RecruiterProfile profile = awaitImport("import-retry@test.com");

        assertThat(profile.getDescription()).isEqualTo("Written by me.");
        assertThat(profile.getVision()).isEqualTo("Open banking for all.");
        assertThat(profile.getAutoFilledFields()).isEqualTo("vision");
        verify(scraperClient, times(1)).scrape(anyString());
    }

    @Test
    void onlyRecruitersCanImport() throws Exception {
        createdEmails.add("import-cand@test.com");
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"C\",\"lastName\":\"D\",\"email\":\"import-cand@test.com\","
                                + "\"password\":\"password123\",\"role\":\"CANDIDATE\",\"companyWebsite\":\"acme.example.com\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/recruiters/profile/import").header("Authorization", token("import-cand@test.com")))
                .andExpect(status().isBadRequest());
        verify(scraperClient, never()).scrape(anyString());
    }
}
