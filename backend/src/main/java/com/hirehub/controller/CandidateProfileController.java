package com.hirehub.controller;

import com.hirehub.dto.CandidateProfileRequestDto;
import com.hirehub.dto.CandidateProfileResponseDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.CandidateProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/candidates")
public class CandidateProfileController {

    private final CandidateProfileService candidateProfileService;
    private final CurrentUserProvider currentUserProvider;

    public CandidateProfileController(CandidateProfileService candidateProfileService,
                                      CurrentUserProvider currentUserProvider) {
        this.candidateProfileService = candidateProfileService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/me")
    public CandidateProfileResponseDto getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return candidateProfileService.getMyProfile(candidate);
    }

    @PutMapping("/me")
    public CandidateProfileResponseDto updateMyProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CandidateProfileRequestDto dto
    ) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return candidateProfileService.updateMyProfile(candidate, dto);
    }
}