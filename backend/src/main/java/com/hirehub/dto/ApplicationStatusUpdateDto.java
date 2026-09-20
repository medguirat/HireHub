package com.hirehub.dto;

import com.hirehub.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApplicationStatusUpdateDto {

    @NotNull(message = "Status is required")
    private ApplicationStatus status;

    private java.time.LocalDateTime interviewDate;

    private String interviewLetter;
}