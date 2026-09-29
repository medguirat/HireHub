package com.hirehub.controller;

import com.hirehub.dto.CvMetadataDto;
import com.hirehub.dto.MatchResponseDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.matching.CandidateCvService;
import com.hirehub.matching.MatchingService;
import com.hirehub.security.CurrentUserProvider;
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
