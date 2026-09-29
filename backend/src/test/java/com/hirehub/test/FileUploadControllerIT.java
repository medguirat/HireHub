package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Upload endpoint behaviour through MockMvc. The over-size case lives in
 * FileUploadSizeLimitIT instead: MockMvc builds the multipart request itself
 * and never goes through Tomcat's multipart parsing, so the real size limit
 * can't be exercised here.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FileUploadControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private String tokenFor(String email) {
        User user = userRepository.save(User.builder()
                .firstName("Test").lastName("Candidate").email(email)
                .password(passwordEncoder.encode("password123")).role(Role.CANDIDATE).build());
        return jwtService.generateToken(user.getEmail());
    }

    @Test
    void uploadFile_succeedsForNormalSizedCv() throws Exception {
        String token = tokenFor("upload-ok@test.com");
        MockMultipartFile cv = new MockMultipartFile(
                "file", "cv.pdf", "application/pdf", "%PDF-1.4 small test cv".getBytes());

        String body = mockMvc.perform(multipart("/api/files/upload")
                        .file(cv)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").exists())
                .andReturn().getResponse().getContentAsString();

        String url = com.jayway.jsonpath.JsonPath.read(body, "$.url");
        java.nio.file.Files.deleteIfExists(
                java.nio.file.Paths.get("uploads", url.substring(url.lastIndexOf('/') + 1)));
    }

    @Test
    void uploadFile_returns400WhenNoFilePartSent() throws Exception {
        String token = tokenFor("upload-nofile@test.com");

        mockMvc.perform(multipart("/api/files/upload")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadFile_requiresAuthentication() throws Exception {
        MockMultipartFile cv = new MockMultipartFile(
                "file", "cv.pdf", "application/pdf", "content".getBytes());

        mockMvc.perform(multipart("/api/files/upload").file(cv))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidOrExpiredToken_returns401WithLogInAgainMessage() throws Exception {
        MockMultipartFile cv = new MockMultipartFile(
                "file", "cv.pdf", "application/pdf", "content".getBytes());

        mockMvc.perform(multipart("/api/files/upload")
                        .file(cv)
                        .header("Authorization", "Bearer not.a.validtoken"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(
                        "Your session has expired or you are not signed in. Please log in again."));
    }
}
