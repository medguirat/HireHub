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

    private String cv ;

    private String coverLetter;

    private String candidateName;

    private String candidateLastName;

    private String jobOfferTitle;
}
