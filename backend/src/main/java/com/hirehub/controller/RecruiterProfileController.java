package com.hirehub.controller;

import com.hirehub.dto.RecruiterProfileRequestDto;
import com.hirehub.dto.RecruiterProfileResponseDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.RecruiterProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruiters")
public class RecruiterProfileController {

    private final RecruiterProfileService recruiterProfileService;
    private final CurrentUserProvider currentUserProvider;

    public RecruiterProfileController(RecruiterProfileService recruiterProfileService,
                                      CurrentUserProvider currentUserProvider) {
        this.recruiterProfileService = recruiterProfileService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/profile")
    public RecruiterProfileResponseDto getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return recruiterProfileService.getMyProfile(recruiter);
    }

    @PutMapping("/profile")
    public RecruiterProfileResponseDto updateMyProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody RecruiterProfileRequestDto dto
    ) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return recruiterProfileService.updateMyProfile(recruiter, dto);
    }

    /** Starts an import of the company details from {"website": "..."} (or the saved website). */
    @PostMapping("/profile/import")
    public RecruiterProfileResponseDto importFromWebsite(@AuthenticationPrincipal UserDetails userDetails,
                                                         @RequestBody(required = false) Map<String, String> body) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return recruiterProfileService.importFromWebsite(recruiter, body == null ? null : body.get("website"));
    }
}
