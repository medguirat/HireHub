package com.hirehub.controller;

import com.hirehub.dto.JobOfferRequestDto;
import com.hirehub.dto.JobOfferResponseDto;
import com.hirehub.dto.PageResponseDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.RecruiterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recruiters")
public class RecruiterController {

    private final RecruiterService recruiterService;
    private final CurrentUserProvider currentUserProvider;

    public RecruiterController(RecruiterService recruiterService,
                               CurrentUserProvider currentUserProvider) {
        this.recruiterService = recruiterService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping("/offers")
    public JobOfferResponseDto createOffer(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody JobOfferRequestDto dto
    ) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return recruiterService.createOffer(dto, recruiter);
    }

    @GetMapping("/offers")
    public PageResponseDto<JobOfferResponseDto> getMyOffers(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10, sort = "id") Pageable pageable
    ) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return PageResponseDto.from(recruiterService.getRecruiterOffers(recruiter.getId(), pageable));
    }

    @GetMapping("/offers/{id}")
    public JobOfferResponseDto getMyOfferById(@PathVariable Long id,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return recruiterService.getRecruiterOfferById(id, recruiter.getId());
    }

    @PutMapping("/offers/{offerId}")
    public JobOfferResponseDto updateOffer(
            @PathVariable Long offerId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody JobOfferRequestDto dto
    ) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return recruiterService.updateOffer(offerId, dto, recruiter.getId());
    }

    @DeleteMapping("/offers/{offerId}")
    public ResponseEntity<String> deleteOffer(
            @PathVariable Long offerId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        recruiterService.deleteOffer(offerId, recruiter.getId());
        return ResponseEntity.ok("Offer deleted successfully");
    }
}