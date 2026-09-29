package com.hirehub.dto;

import com.hirehub.entity.CompanyImportStatus;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecruiterProfileResponseDto {

    private Long userId;

    private String firstName;

    private String lastName;

    private String email;

    private String companyName;

    private String website;

    private String logo;

    private String description;

    private Integer foundedYear;

    private String industry;

    private String mission;

    private String vision;

    private String companyValues;

    private String googleMapsUrl;

    private String headquarters;

    private String offices;

    private String companySize;

    private String companyType;

    private String technologies;

    private String phone;

    private String linkedin;

    private String facebook;

    private String instagram;

    private String twitter;

    private CompanyImportStatus companyImportStatus;

    private String companyImportMessage;

    /** Profile fields filled from the company website that the recruiter hasn't changed. */
    private List<String> autoFilledFields;
}
