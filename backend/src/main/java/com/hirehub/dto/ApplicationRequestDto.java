package com.hirehub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApplicationRequestDto {

    @NotBlank(message = "CV is required")
    private String cv;

    private String coverLetter;

    @NotNull(message = "Job offer id is required")
    private Long jobOfferId;
}