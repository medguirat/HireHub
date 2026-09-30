package com.hirehub.controller;

import com.hirehub.dto.CvMetadataDto;
import com.hirehub.dto.MatchResponseDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.files.FileResponses;
import com.hirehub.matching.CandidateCvService;
import com.hirehub.matching.MatchingService;
import com.hirehub.security.CurrentUserProvider;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidates")
public class MatchingController {

    private final CandidateCvService cvService;
    private final MatchingService matchingService;
    private final CurrentUserProvider currentUserProvider;

    public MatchingController(CandidateCvService cvService, MatchingService matchingService,
                              CurrentUserProvider currentUserProvider) {
        this.cvService = cvService;
        this.matchingService = matchingService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/me/cv")
    public CvMetadataDto getMyCv(@AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return cvService.getMyCv(candidate);
    }

    /**
     * The candidate's own CV file, shown inline (PDF preview). Only PDF and DOCX
     * are ever stored, so the type comes from the stored name, not the upload.
     */
    @GetMapping("/me/cv/file")
    public ResponseEntity<byte[]> getMyCvFile(@AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        CandidateCvService.CvFile file = cvService.readMyCvFile(candidate);
        MediaType type = file.isPdf() ? MediaType.APPLICATION_PDF
                : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        return FileResponses.privateFile(file.data(), type, file.fileName(), file.isPdf());
    }

    @PutMapping(value = "/me/cv", consumes = "multipart/form-data")
    public CvMetadataDto uploadMyCv(@RequestParam("file") MultipartFile file,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return cvService.uploadMyCv(candidate, file);
    }

    @GetMapping("/offers/{offerId}/match")
    public MatchResponseDto matchOffer(@PathVariable Long offerId,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return matchingService.match(candidate, offerId);
    }
}
