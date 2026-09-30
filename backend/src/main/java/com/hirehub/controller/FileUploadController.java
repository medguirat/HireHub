package com.hirehub.controller;

import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ErrorCodes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    // CHANGED: was hardcoded to "http://localhost:8081". That breaks the
    // moment this runs behind Docker/another port/a real domain, because the
    // URL saved in the DB (application.cv, .picture, .logo ...) would still
    // point at localhost:8081 no matter where the app actually runs.
    // Set APP_BASE_URL as an env var (e.g. http://localhost:8081 in dev,
    // http://backend:8081 or your real domain in Docker/prod).
    @Value("${app.base-url:http://localhost:8081}")
    private String baseUrl;

    @PostMapping("/upload")
    public Map<String, String> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new BadRequestException(ErrorCodes.FILE_MISSING, "The file is empty. Please choose another file.");
        }

        String originalName = file.getOriginalFilename();
        String fileExtension = "";
        if (originalName != null && originalName.contains(".")) {
            fileExtension = originalName.substring(originalName.lastIndexOf("."));
        }

        String fileName = System.currentTimeMillis() + "_" + java.util.UUID.randomUUID().toString() + fileExtension;
        Path uploadPath = Paths.get("uploads");
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return Map.of("url", baseUrl + "/uploads/" + fileName);
    }
}
