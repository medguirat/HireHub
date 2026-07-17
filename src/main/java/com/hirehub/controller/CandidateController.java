package com.hirehub.controller;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import com.hirehub.service.CandidateService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private final CandidateService candidateService;
    private final UserRepository userRepository;

    public CandidateController(CandidateService candidateService, UserRepository userRepository) {
        this.candidateService = candidateService;
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public User getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            throw new RuntimeException("User not authenticated");
        }

        User candidate = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Candidate not found"));

        if (candidate.getRole() != Role.CANDIDATE) {
            throw new RuntimeException("Only candidates can access this");
        }

        return candidateService.getCandidateProfile(candidate.getId());
    }
}