package com.hirehub.test;

import com.hirehub.entity.Application;
import com.hirehub.entity.ApplicationStatus;
import com.hirehub.entity.JobOffer;
import com.hirehub.entity.Role;
import com.hirehub.entity.StoredFile;
import com.hirehub.entity.User;
import com.hirehub.files.LegacyUploadMigration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CVs and cover letters are private: the candidate who sent them and the recruiter who owns the
 * offer can read them; any other signed-in user gets 403, and nobody gets them without logging in.
 */
class ApplicationFilesIT extends ApiTestSupport {

    @Autowired private LegacyUploadMigration migration;
    @Value("${app.public-upload-dir}") private String publicUploadDir;

    private User recruiter;
    private User candidate;
    private User otherCandidate;
    private User otherRecruiter;
    private JobOffer offer;
    private Application application;

    @BeforeEach
    void setUp() {
        recruiter = user("files-rec@test.com", Role.RECRUITER);
        candidate = user("files-cand@test.com", Role.CANDIDATE);
        otherCandidate = user("files-other-cand@test.com", Role.CANDIDATE);
        otherRecruiter = user("files-other-rec@test.com", Role.RECRUITER);
        offer = offer(recruiter, "Backend developer");
        application = applicationWithFiles(candidate, offer, true);
    }

    private static MockMultipartFile file(String name, byte[] data) {
        return new MockMultipartFile("file", name, "application/pdf", data);
    }

    // ---------- uploading a document ----------

    @Test
    void aCandidateUploadsAPdfAndGetsAnIdToAttach() throws Exception {
        mockMvc.perform(multipart("/api/candidates/documents").file(file("My CV.pdf", PDF)).header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.fileName").value("My CV.pdf"))
                .andExpect(jsonPath("$.size").value(PDF.length))
                .andExpect(jsonPath("$.url").doesNotExist());
    }

    @Test
    void onlyRealPdfsAreAccepted() throws Exception {
        mockMvc.perform(multipart("/api/candidates/documents").file(file("cv.pdf", "<html>not a pdf</html>".getBytes()))
                        .header("Authorization", token(candidate)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"))
                .andExpect(jsonPath("$.message").value("Please upload a PDF file."));
        mockMvc.perform(multipart("/api/candidates/documents").file(file("cv.pdf", new byte[0]))
                        .header("Authorization", token(candidate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_MISSING"));
    }

    @Test
    void onlyCandidatesUploadDocuments() throws Exception {
        mockMvc.perform(multipart("/api/candidates/documents").file(file("cv.pdf", PDF)).header("Authorization", token(recruiter)))
                .andExpect(status().isForbidden());
        mockMvc.perform(multipart("/api/candidates/documents").file(file("cv.pdf", PDF)))
                .andExpect(status().isUnauthorized());
    }

    // ---------- attaching documents to an application ----------

    @Test
    void applyingWithUploadedFilesShowsTheirNamesButNoLinks() throws Exception {
        JobOffer another = offer(recruiter, "Another role");
        StoredFile cv = storedPdf(candidate, "Amine-CV.pdf");
        StoredFile letter = storedPdf(candidate, "Letter.pdf");
        mockMvc.perform(post("/api/applications").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cvFileId\":\"" + cv.getId() + "\",\"coverLetterFileId\":\"" + letter.getId()
                                + "\",\"jobOfferId\":" + another.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cvFileName").value("Amine-CV.pdf"))
                .andExpect(jsonPath("$.coverLetterFileName").value("Letter.pdf"))
                .andExpect(jsonPath("$.cv").doesNotExist())
                .andExpect(content().string(not(containsString("/uploads/"))));
    }

    @Test
    void aCandidateCannotAttachSomeoneElsesFile() throws Exception {
        StoredFile theirs = storedPdf(otherCandidate, "theirs.pdf");
        JobOffer another = offer(recruiter, "Another role");
        mockMvc.perform(post("/api/applications").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cvFileId\":\"" + theirs.getId() + "\",\"jobOfferId\":" + another.getId() + "}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You can only attach files you uploaded yourself."));
        mockMvc.perform(post("/api/applications").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cvFileId\":\"" + UUID.randomUUID() + "\",\"jobOfferId\":" + another.getId() + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_NOT_FOUND"));
    }

    // ---------- reading an application's CV ----------

    @Test
    void theCandidateWhoAppliedCanReadTheirCv() throws Exception {
        mockMvc.perform(get("/api/applications/" + application.getId() + "/cv").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(PDF))
                .andExpect(header().string("Content-Disposition", containsString("inline")))
                .andExpect(header().string("Content-Disposition", containsString(application.getCv())))
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void theRecruiterWhoOwnsTheOfferCanReadTheCv() throws Exception {
        mockMvc.perform(get("/api/applications/" + application.getId() + "/cv").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(PDF));
    }

    @Test
    void anotherCandidateGets403() throws Exception {
        mockMvc.perform(get("/api/applications/" + application.getId() + "/cv").header("Authorization", token(otherCandidate)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.message").value("You don't have access to this application's files."));
    }

    @Test
    void anotherRecruiterGets403() throws Exception {
        mockMvc.perform(get("/api/applications/" + application.getId() + "/cv").header("Authorization", token(otherRecruiter)))
                .andExpect(status().isForbidden());
    }

    @Test
    void withoutLoggingInItIs401() throws Exception {
        mockMvc.perform(get("/api/applications/" + application.getId() + "/cv"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
        mockMvc.perform(get("/api/applications/" + application.getId() + "/cv").header("Authorization", "Bearer expired.or.fake"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownApplicationOrNoFileIs404() throws Exception {
        mockMvc.perform(get("/api/applications/999999/cv").header("Authorization", token(candidate)))
                .andExpect(status().isNotFound());
        Application withoutFile = application(candidate, offer(recruiter, "Old application"));
        mockMvc.perform(get("/api/applications/" + withoutFile.getId() + "/cv").header("Authorization", token(candidate)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("There is no CV file for this application."));
    }

    // ---------- reading a cover letter file ----------

    @Test
    void coverLetterFilesFollowTheSameRules() throws Exception {
        String url = "/api/applications/" + application.getId() + "/cover-letter";
        mockMvc.perform(get(url).header("Authorization", token(candidate))).andExpect(status().isOk()).andExpect(content().bytes(PDF));
        mockMvc.perform(get(url).header("Authorization", token(recruiter))).andExpect(status().isOk());
        mockMvc.perform(get(url).header("Authorization", token(otherCandidate))).andExpect(status().isForbidden());
        mockMvc.perform(get(url).header("Authorization", token(otherRecruiter))).andExpect(status().isForbidden());
        mockMvc.perform(get(url)).andExpect(status().isUnauthorized());

        Application textOnly = applicationWithFiles(candidate, offer(recruiter, "Text letter"), false);
        mockMvc.perform(get("/api/applications/" + textOnly.getId() + "/cover-letter").header("Authorization", token(candidate)))
                .andExpect(status().isNotFound());
    }

    // ---------- the profile CV (used for matching) ----------

    @Test
    void theProfileCvIsOnlyForItsCandidate() throws Exception {
        mockMvc.perform(get("/api/candidates/me/cv/file").header("Authorization", token(recruiter)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/candidates/me/cv/file"))
                .andExpect(status().isUnauthorized());
        // "me" is always the caller: another candidate only ever reaches their own (here: none).
        mockMvc.perform(get("/api/candidates/me/cv/file").header("Authorization", token(otherCandidate)))
                .andExpect(status().isNotFound());
    }

    // ---------- lists never expose file locations ----------

    @Test
    void applicationListsGiveFileNamesOnly() throws Exception {
        mockMvc.perform(get("/api/applications").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].cvFileName").value(application.getCv()))
                .andExpect(jsonPath("$.content[0].coverLetterFileName").value("letter.pdf"))
                .andExpect(content().string(not(containsString("/uploads/"))))
                .andExpect(content().string(not(containsString(application.getCvFile().getStoredName()))));
    }

    // ---------- applications made when CVs were public links ----------

    @Test
    void oldPublicCvLinksAreMovedToPrivateStorage() throws Exception {
        Path uploads = Paths.get(publicUploadDir);
        Files.createDirectories(uploads);
        String oldName = System.currentTimeMillis() + "_" + UUID.randomUUID() + ".pdf";
        Files.write(uploads.resolve(oldName), PDF);
        JobOffer oldOffer = offer(recruiter, "Before private files");
        Application old = applicationRepository.save(Application.builder()
                .cv("http://localhost:8081/uploads/" + oldName)
                .coverLetter("http://localhost:8081/uploads/missing-" + UUID.randomUUID() + ".pdf")
                .status(ApplicationStatus.PENDING).applicationDate(LocalDate.now())
                .candidate(candidate).jobOffer(oldOffer).build());

        // The old public link no longer works: /uploads serves images only.
        mockMvc.perform(get("/uploads/" + oldName)).andExpect(status().isNotFound());

        assertThat(migration.migrate()).isEqualTo(1);
        Application migrated = applicationRepository.findById(old.getId()).orElseThrow();
        assertThat(migrated.getCvFile()).isNotNull();
        assertThat(migrated.getCv()).isEqualTo("CV-Test-User.pdf");
        assertThat(migrated.getCvFile().getOwner().getId()).isEqualTo(candidate.getId());
        // A link to a file that no longer exists is left as it was.
        assertThat(migrated.getCoverLetterFile()).isNull();
        assertThat(migrated.getCoverLetter()).contains("/uploads/missing-");

        mockMvc.perform(get("/api/applications/" + old.getId() + "/cv").header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(content().bytes(PDF));
        mockMvc.perform(get("/api/applications/" + old.getId() + "/cv").header("Authorization", token(otherRecruiter)))
                .andExpect(status().isForbidden());
        // The dead link isn't shown as if it were a written letter.
        mockMvc.perform(get("/api/applications/" + old.getId()).header("Authorization", token(candidate)))
                .andExpect(jsonPath("$.coverLetter").doesNotExist());

        assertThat(migration.migrate()).isZero(); // idempotent
        Files.deleteIfExists(uploads.resolve(oldName));
    }
}
