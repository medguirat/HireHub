package com.hirehub.controller;

import com.hirehub.exception.ApiException;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ErrorCodes;
import com.hirehub.files.FileTypes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

/**
 * Public images: profile photos and company logos. They are shown with plain img tags, so they
 * are served without login from /uploads, under random names that can't be guessed. Only real
 * images are accepted (checked from the file's content), and /uploads serves nothing else
 * (WebConfig), so this can't be used to publish a CV or a web page. CVs and cover letters are
 * private files: see CandidateDocumentController.
 */
@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    // Set APP_BASE_URL when the backend isn't reached at http://localhost:8081 (Docker, a real domain).
    @Value("${app.base-url:http://localhost:8081}")
    private String baseUrl;

    @Value("${app.public-upload-dir:uploads}")
    private String uploadDir;

    @PostMapping("/images")
    public Map<String, String> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        byte[] data = file.getBytes();
        if (data.length == 0) {
            throw new BadRequestException(ErrorCodes.FILE_MISSING, "The file is empty. Please choose another file.");
        }
        FileTypes.Image image = FileTypes.image(data).orElseThrow(() -> new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                ErrorCodes.UNSUPPORTED_MEDIA_TYPE, "Please choose a PNG, JPEG, GIF or WebP image."));

        // The name and extension come from us, never from the upload.
        String fileName = UUID.randomUUID() + image.extension;
        Path directory = Paths.get(uploadDir);
        Files.createDirectories(directory);
        Files.write(directory.resolve(fileName), data);
        return Map.of("url", baseUrl + "/uploads/" + fileName);
    }
}
