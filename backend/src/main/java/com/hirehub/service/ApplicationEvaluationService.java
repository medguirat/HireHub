package com.hirehub.service;

import com.hirehub.exception.ForbiddenException;

import com.hirehub.dto.ApplicationEvaluationRequestDto;
import com.hirehub.dto.ApplicationEvaluationResponseDto;
import com.hirehub.entity.Application;
import com.hirehub.entity.ApplicationEvaluation;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.ApplicationEvaluationRepository;
import com.hirehub.repository.ApplicationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ApplicationEvaluationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationEvaluationRepository evaluationRepository;

    public ApplicationEvaluationService(ApplicationRepository applicationRepository,
                                        ApplicationEvaluationRepository evaluationRepository) {
        this.applicationRepository = applicationRepository;
        this.evaluationRepository = evaluationRepository;
    }

    public ApplicationEvaluationResponseDto get(Long applicationId, User recruiter) {
        ownedApplication(applicationId, recruiter);
        return evaluationRepository.findByApplicationId(applicationId)
                .map(ApplicationEvaluationService::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("No evaluation has been saved for this application yet."));
    }

    public ApplicationEvaluationResponseDto save(Long applicationId, ApplicationEvaluationRequestDto dto, User recruiter) {
        Application application = ownedApplication(applicationId, recruiter);
        ApplicationEvaluation evaluation = evaluationRepository.findByApplicationId(applicationId)
                .orElseGet(() -> ApplicationEvaluation.builder().application(application).build());
        evaluation.setTechnicalSkills(dto.getTechnicalSkills());
        evaluation.setExperience(dto.getExperience());
        evaluation.setCommunication(dto.getCommunication());
        evaluation.setCulturalFit(dto.getCulturalFit());
        evaluation.setHasDegree(dto.isHasDegree());
        evaluation.setPassedTest(dto.isPassedTest());
        evaluation.setAvailableNow(dto.isAvailableNow());
        evaluation.setNotes(dto.getNotes());
        evaluation.setInterviewType(dto.getInterviewType());
        evaluation.setScore(score(dto));
        evaluation.setEvaluatedBy(recruiter);
        evaluation.setUpdatedAt(LocalDateTime.now());
        return toDto(evaluationRepository.save(evaluation));
    }

    /** Out of 20: average rating scaled to 17 points, plus 1 per satisfied checklist item. */
    static double score(ApplicationEvaluationRequestDto dto) {
        double average = (dto.getTechnicalSkills() + dto.getExperience() + dto.getCommunication() + dto.getCulturalFit()) / 4.0;
        int bonus = (dto.isHasDegree() ? 1 : 0) + (dto.isPassedTest() ? 1 : 0) + (dto.isAvailableNow() ? 1 : 0);
        return Math.round(((average / 5) * 17 + bonus) * 10) / 10.0;
    }

    private Application ownedApplication(Long applicationId, User recruiter) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found."));
        if (!application.getJobOffer().getRecruiter().getId().equals(recruiter.getId())) {
            throw new ForbiddenException("You can only evaluate applications to your own offers.");
        }
        return application;
    }

    private static ApplicationEvaluationResponseDto toDto(ApplicationEvaluation e) {
        String evaluator = e.getEvaluatedBy() == null ? null
                : e.getEvaluatedBy().getFirstName() + " " + e.getEvaluatedBy().getLastName();
        return new ApplicationEvaluationResponseDto(e.getApplication().getId(), e.getTechnicalSkills(),
                e.getExperience(), e.getCommunication(), e.getCulturalFit(), e.isHasDegree(), e.isPassedTest(),
                e.isAvailableNow(), e.getNotes(), e.getInterviewType(), e.getScore(), evaluator, e.getUpdatedAt());
    }
}
