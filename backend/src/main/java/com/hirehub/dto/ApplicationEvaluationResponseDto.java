package com.hirehub.dto;

import com.hirehub.entity.InterviewType;

import java.time.LocalDateTime;

public record ApplicationEvaluationResponseDto(
        Long applicationId,
        int technicalSkills,
        int experience,
        int communication,
        int culturalFit,
        boolean hasDegree,
        boolean passedTest,
        boolean availableNow,
        String notes,
        InterviewType interviewType,
        double score,
        String evaluatedBy,
        LocalDateTime updatedAt
) {}
