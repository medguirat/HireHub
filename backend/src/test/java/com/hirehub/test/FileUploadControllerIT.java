package com.hirehub.test;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Profile photos and company logos: public images under random names. Only real images are
 * accepted, and /uploads serves nothing but images. The over-size case lives in
 * FileUploadSizeLimitIT (MockMvc bypasses Tomcat's multipart limit).
 */
class FileUploadControllerIT extends ApiTestSupport {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 'I', 'H', 'D', 'R'};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F'};

    @Value("${app.public-upload-dir}") private String publicUploadDir;

    private static MockMultipartFile image(String name, byte[] data) {
        return new MockMultipartFile("file", name, "image/png", data);
    }

    @Test
    void anImageIsStoredUnderARandomNameAndServedPublicly() throws Exception {
        User candidate = user("photo-ok@test.com", Role.CANDIDATE);
        String body = mockMvc.perform(multipart("/api/files/images").file(image("../../me.png", PNG))
                        .header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", endsWith(".png")))
                .andReturn().getResponse().getContentAsString();
        String url = com.jayway.jsonpath.JsonPath.read(body, "$.url");
        String name = url.substring(url.lastIndexOf('/') + 1);

        mockMvc.perform(get("/uploads/" + name))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(content().bytes(PNG))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        Files.deleteIfExists(Paths.get(publicUploadDir, name));
    }

    @Test
    void theExtensionComesFromTheContentNotTheName() throws Exception {
        User recruiter = user("logo-jpeg@test.com", Role.RECRUITER);
        String body = mockMvc.perform(multipart("/api/files/images").file(image("logo.png", JPEG))
                        .header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", endsWith(".jpg")))
                .andReturn().getResponse().getContentAsString();
        String url = com.jayway.jsonpath.JsonPath.read(body, "$.url");
        Files.deleteIfExists(Paths.get(publicUploadDir, url.substring(url.lastIndexOf('/') + 1)));
    }

    @Test
    void anythingThatIsNotAnImageIsRefused() throws Exception {
        User candidate = user("photo-bad@test.com", Role.CANDIDATE);
        for (byte[] notAnImage : new byte[][]{PDF, "<svg onload=alert(1)></svg>".getBytes(), "<html></html>".getBytes()}) {
            mockMvc.perform(multipart("/api/files/images").file(image("photo.png", notAnImage))
                            .header("Authorization", token(candidate)))
                    .andExpect(status().isUnsupportedMediaType())
                    .andExpect(jsonPath("$.message").value("Please choose a PNG, JPEG, GIF or WebP image."));
        }
        mockMvc.perform(multipart("/api/files/images").file(image("photo.png", new byte[0])).header("Authorization", token(candidate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_MISSING"));
        mockMvc.perform(multipart("/api/files/images").header("Authorization", token(candidate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FILE_MISSING"));
    }

    @Test
    void uploadingNeedsASignedInUser() throws Exception {
        mockMvc.perform(multipart("/api/files/images").file(image("photo.png", PNG)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/api/files/images").file(image("photo.png", PNG)).header("Authorization", "Bearer not.a.validtoken"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Your session has expired or you are not signed in. Please log in again."));
    }

    @Test
    void uploadsServesImagesOnly() throws Exception {
        Path dir = Paths.get(publicUploadDir);
        Files.createDirectories(dir);
        String pdfName = UUID.randomUUID() + ".pdf";
        String htmlName = UUID.randomUUID() + ".html";
        Files.write(dir.resolve(pdfName), PDF);
        Files.write(dir.resolve(htmlName), "<script>alert(1)</script>".getBytes());
        try {
            mockMvc.perform(get("/uploads/" + pdfName)).andExpect(status().isNotFound());
            mockMvc.perform(get("/uploads/" + htmlName)).andExpect(status().isNotFound());
            mockMvc.perform(get("/uploads/..%2F..%2Fpom.xml")).andExpect(status().is4xxClientError());
        } finally {
            Files.deleteIfExists(dir.resolve(pdfName));
            Files.deleteIfExists(dir.resolve(htmlName));
        }
    }

    @Test
    void theOldGenericUploadIsGone() throws Exception {
        User candidate = user("old-upload@test.com", Role.CANDIDATE);
        mockMvc.perform(multipart("/api/files/upload").file(image("cv.pdf", PDF)).header("Authorization", token(candidate)))
                .andExpect(status().isNotFound());
    }
}
