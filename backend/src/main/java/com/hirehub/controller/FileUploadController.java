package com.hirehub.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
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
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                Map<String, String> err = new HashMap<>();
                err.put("error", "Uploaded file is empty");
                return ResponseEntity.badRequest().body(err);
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

            String fileUrl = baseUrl + "/uploads/" + fileName;
            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Failed to upload file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
