package com.hirehub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ApplicationRequestDto {

    /** Id returned by POST /api/candidates/documents for the CV. */
    @NotBlank(message = "Upload your CV to apply")
    private String cvFileId;

    @Size(max = 10000, message = "The cover letter must be at most 10000 characters")
    private String coverLetter;

    /** Optional: a cover letter uploaded as a PDF (POST /api/candidates/documents). */
    private String coverLetterFileId;

    @NotNull(message = "Job offer id is required")
    private Long jobOfferId;
}
