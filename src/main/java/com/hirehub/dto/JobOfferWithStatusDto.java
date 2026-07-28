package com.hirehub.dto;

import com.hirehub.entity.ContractType;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobOfferWithStatusDto {

    private Long id;
    private String title;
    private String description;
    private String location;
    private ContractType contractType;
    private LocalDate publicationDate;
    private LocalDate deadline;
    private String recruiterName;
    private String recruiterLastName;

    // Contexte propre au candidat connecté
    private boolean alreadyApplied;
    private boolean expired;
}