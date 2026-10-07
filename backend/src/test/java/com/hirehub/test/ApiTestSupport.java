package com.hirehub.test;

import com.hirehub.entity.*;
import com.hirehub.files.ApplicationDocumentService;
import com.hirehub.repository.*;
import com.hirehub.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/** Shared setup for API integration tests: test database, MockMvc, and small data builders. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
abstract class ApiTestSupport {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected UserRepository userRepository;
    @Autowired protected JobOfferRepository jobOfferRepository;
    @Autowired protected ApplicationRepository applicationRepository;
    @Autowired protected CandidateProfileRepository candidateProfileRepository;
    @Autowired protected RecruiterProfileRepository recruiterProfileRepository;
    @Autowired protected NotificationRepository notificationRepository;
    @Autowired protected PasswordEncoder passwordEncoder;
    @Autowired protected JwtService jwtService;
    @Autowired protected ApplicationDocumentService documents;

    /** A minimal valid PDF (the upload checks the %PDF- signature). */
    protected static final byte[] PDF = "%PDF-1.4\n% HireHub test file\n%%EOF\n".getBytes();

    protected User user(String email, Role role) {
        User user = userRepository.save(User.builder().firstName("Test").lastName("User").email(email)
                .password(passwordEncoder.encode("password123")).role(role).build());
        if (role == Role.CANDIDATE) {
            candidateProfileRepository.save(CandidateProfile.builder().user(user).build());
        } else {
            recruiterProfileRepository.save(RecruiterProfile.builder().user(user).companyName("Acme").build());
        }
        return user;
    }

    protected String token(User user) {
        return "Bearer " + jwtService.generateToken(user.getEmail());
    }

    protected JobOffer offer(User recruiter, String title) {
        return jobOfferRepository.save(JobOffer.builder().title(title).description("Java and Spring Boot")
                .location("Tunis").contractType(ContractType.CDI).publicationDate(LocalDate.now())
                .publishedAt(LocalDate.now().atStartOfDay()).deadline(LocalDate.now().plusDays(30))
                .status(OfferStatus.OPEN).recruiter(recruiter).build());
    }

    protected Application application(User candidate, JobOffer offer) {
        return applicationRepository.save(Application.builder().cv("cv.pdf").status(ApplicationStatus.PENDING)
                .applicationDate(LocalDate.now()).candidate(candidate).jobOffer(offer).build());
    }

    protected static String offerJson(String title, LocalDate deadline) {
        return "{\"title\":\"" + title + "\",\"description\":\"Java and Spring Boot\",\"location\":\"Tunis\","
                + "\"contractType\":\"CDI\",\"deadline\":\"" + deadline + "\"}";
    }

    /** A private PDF owned by this user, as if uploaded through POST /api/candidates/documents. */
    protected StoredFile storedPdf(User owner, String name) {
        return documents.store(owner, PDF, name);
    }

    /** An application whose CV (and optionally cover letter) are real private files. */
    protected Application applicationWithFiles(User candidate, JobOffer offer, boolean coverLetterFile) {
        StoredFile cv = storedPdf(candidate, "cv-" + candidate.getId() + ".pdf");
        return applicationRepository.save(Application.builder().cv(cv.getOriginalName()).cvFile(cv)
                .coverLetterFile(coverLetterFile ? storedPdf(candidate, "letter.pdf") : null)
                .status(ApplicationStatus.PENDING).applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(offer).build());
    }
}
