package com.hirehub.controller;

import com.hirehub.dto.CandidateDashboardDto;
import com.hirehub.dto.JobOfferWithStatusDto;
import com.hirehub.dto.PageResponseDto;
import com.hirehub.entity.ContractType;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.CandidateService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private final CandidateService candidateService;
    private final CurrentUserProvider currentUserProvider;

    public CandidateController(CandidateService candidateService,
                               CurrentUserProvider currentUserProvider) {
        this.candidateService = candidateService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/offers")
    public PageResponseDto<JobOfferWithStatusDto> browseOffers(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) ContractType contractType,
            @PageableDefault(size = 10, sort = "id") Pageable pageable
    ) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return PageResponseDto.from(
                candidateService.browseOffers(candidate, keyword, location, contractType, pageable)
        );
    }

    @GetMapping("/offers/{id}")
    public JobOfferWithStatusDto getOfferDetails(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return candidateService.getOfferDetails(id, candidate);
    }

    @GetMapping("/dashboard")
    public CandidateDashboardDto getDashboard(@AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return candidateService.getDashboard(candidate);
    }
}