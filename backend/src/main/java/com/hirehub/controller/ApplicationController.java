package com.hirehub.controller;

import com.hirehub.dto.ApplicationRequestDto;
import com.hirehub.dto.ApplicationResponseDto;
import com.hirehub.dto.ApplicationStatusUpdateDto;
import com.hirehub.dto.PageResponseDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final CurrentUserProvider currentUserProvider;

    public ApplicationController(ApplicationService applicationService,
                                 CurrentUserProvider currentUserProvider) {
        this.applicationService = applicationService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public PageResponseDto<ApplicationResponseDto> getAllApplications(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        User user = currentUserProvider.getAuthenticatedUser(userDetails);
        return PageResponseDto.from(applicationService.getAllApplications(user, pageable));
    }

    @GetMapping("/{id}")
    public ApplicationResponseDto getApplicationById(@PathVariable Long id,
                                                     @AuthenticationPrincipal UserDetails userDetails) {
        User user = currentUserProvider.getAuthenticatedUser(userDetails);
        return applicationService.getApplicationById(id, user);
    }

    @PostMapping
    public ApplicationResponseDto createApplication(@Valid @RequestBody ApplicationRequestDto dto,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        User candidate = currentUserProvider.requireRole(userDetails, Role.CANDIDATE);
        return applicationService.createApplication(dto, candidate);
    }

    @DeleteMapping("/{id}")
    public void deleteApplication(@PathVariable Long id,
                                  @AuthenticationPrincipal UserDetails userDetails) {
        User user = currentUserProvider.getAuthenticatedUser(userDetails);
        applicationService.deleteApplication(id, user);
    }

    @PatchMapping("/{id}/status")
    public ApplicationResponseDto updateStatus(@PathVariable Long id,
                                               @Valid @RequestBody ApplicationStatusUpdateDto dto,
                                               @AuthenticationPrincipal UserDetails userDetails) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return applicationService.updateApplicationStatus(id, dto, recruiter);
    }
}