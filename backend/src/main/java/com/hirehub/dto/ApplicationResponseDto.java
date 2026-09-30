package com.hirehub.dto;

import com.hirehub.entity.ApplicationStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationResponseDto {

    private Long id ;

    private ApplicationStatus status;

    private java.time.LocalDate applicationDate;

    /**
     * The CV's file name, or null when there is no file to open (very old applications).
     * The file itself: GET /api/applications/{id}/cv (the candidate and the offer's recruiter only).
     */
    private String cvFileName;

    /** A written cover letter. */
    private String coverLetter;

    /** Set when the cover letter was sent as a PDF: GET /api/applications/{id}/cover-letter. */
    private String coverLetterFileName;

    private String candidateName;

    private String candidateLastName;

    private String jobOfferTitle;

    private Long jobOfferId;

    /** The offer was closed by the recruiter (archived, no longer in the feed). */
    private boolean offerClosed;

    private String recruiterCompany;

    private java.time.LocalDateTime interviewDate;

    private String interviewLetter;
}
