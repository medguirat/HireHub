package com.hirehub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.validator.constraints.URL;

@Data
public class RecruiterProfileRequestDto {

    @NotBlank(message = "Company name is required")
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
}