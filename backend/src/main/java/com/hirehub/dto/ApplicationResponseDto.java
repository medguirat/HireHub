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

    private String cv ;

    private String coverLetter;

    private String candidateName;

    private String candidateLastName;

    private String jobOfferTitle;

    private Long jobOfferId;

    private String recruiterCompany;

    private java.time.LocalDateTime interviewDate;

    private String interviewLetter;
}
