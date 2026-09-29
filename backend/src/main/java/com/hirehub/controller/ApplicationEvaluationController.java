package com.hirehub.controller;

import com.hirehub.dto.ApplicationEvaluationRequestDto;
import com.hirehub.dto.ApplicationEvaluationResponseDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.ApplicationEvaluationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/applications/{applicationId}/evaluation")
public class ApplicationEvaluationController {

    private final ApplicationEvaluationService evaluationService;
    private final CurrentUserProvider currentUserProvider;

    public ApplicationEvaluationController(ApplicationEvaluationService evaluationService,
                                           CurrentUserProvider currentUserProvider) {
        this.evaluationService = evaluationService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public ApplicationEvaluationResponseDto get(@PathVariable Long applicationId,
                                                @AuthenticationPrincipal UserDetails userDetails) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return evaluationService.get(applicationId, recruiter);
    }

    @PutMapping
    public ApplicationEvaluationResponseDto save(@PathVariable Long applicationId,
                                                 @Valid @RequestBody ApplicationEvaluationRequestDto dto,
                                                 @AuthenticationPrincipal UserDetails userDetails) {
        User recruiter = currentUserProvider.requireRole(userDetails, Role.RECRUITER);
        return evaluationService.save(applicationId, dto, recruiter);
    }
}
