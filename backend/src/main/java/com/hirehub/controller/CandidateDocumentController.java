package com.hirehub.controller;

import com.hirehub.dto.StoredFileDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.files.ApplicationDocumentService;
import com.hirehub.security.CurrentUserProvider;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Files a candidate attaches to an application (CV, cover letter). They are private: see ApplicationController. */
@RestController
@RequestMapping("/api/candidates/documents")
public class CandidateDocumentController {

    private final ApplicationDocumentService documents;
    private final CurrentUserProvider currentUserProvider;

    public CandidateDocumentController(ApplicationDocumentService documents, CurrentUserProvider currentUserProvider) {
        this.documents = documents;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping(consumes = "multipart/form-data")
    public StoredFileDto upload(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return documents.upload(candidate, file);
    }
}
