package com.hirehub.dto;

import com.hirehub.entity.ContractType;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobOfferResponseDto {

    private Long id ;

    private String title ;

    private String description ;

    private String location ;

    private ContractType contractType;

    private LocalDate publicationDate;

    private LocalDate deadline ;

    private String recruiterName ;

    private String recruiterLastName;

    private com.hirehub.entity.OfferStatus status;

    private java.time.LocalDateTime closedAt;

    /** Filled for the recruiter's own offers (decides whether "delete" deletes or closes). */
    private Long applicationCount;
}
