package com.hirehub.controller;

import com.hirehub.dto.ApplicationResponseDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.Application;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.repository.UserRepository;
import com.hirehub.service.ApplicationService;
import com.hirehub.service.CandidateService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private final CandidateService candidateService;
    private final ApplicationService applicationService;
    private final UserRepository userRepository;

    public CandidateController(CandidateService candidateService,
                               ApplicationService applicationService,
                               UserRepository userRepository) {
        this.candidateService = candidateService;
        this.applicationService = applicationService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedCandidate(UserDetails userDetails) {
        if (userDetails == null) {
            throw new BadRequestException("User not authenticated");
        }

        User candidate = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new BadRequestException("Candidate not found"));

        if (candidate.getRole() != Role.CANDIDATE) {
            throw new BadRequestException("Only candidates can access this");
        }

        return candidate;
    }

    @GetMapping("/me")
    public UserResponseDto getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User candidate = getAuthenticatedCandidate(userDetails);
        return candidateService.getProfile(candidate.getId());
    }

    @PutMapping("/me")
    public UserResponseDto updateMyProfile(@AuthenticationPrincipal UserDetails userDetails,
                                           @RequestBody User updatedData) {
        User candidate = getAuthenticatedCandidate(userDetails);
        return candidateService.updateProfile(candidate.getId(), updatedData);
    }

    @PostMapping("/applications")
    public ApplicationResponseDto applyToOffer(@AuthenticationPrincipal UserDetails userDetails,
                                               @RequestBody Application application) {
        User candidate = getAuthenticatedCandidate(userDetails);

        User candidateRef = User.builder().id(candidate.getId()).build();
        application.setCandidate(candidateRef);

        return applicationService.createApplication(application);
    }

    @GetMapping("/applications")
    public List<ApplicationResponseDto> getMyApplications(@AuthenticationPrincipal UserDetails userDetails) {
        User candidate = getAuthenticatedCandidate(userDetails);
        return applicationService.getApplicationsByCandidateId(candidate.getId());
    }
}