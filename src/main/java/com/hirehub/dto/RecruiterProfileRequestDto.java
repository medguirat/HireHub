package com.hirehub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.validator.constraints.URL;

@Data
public class RecruiterProfileRequestDto {

    @NotBlank(message = "Company name is required")
    private String companyName;

    @URL(message = "website must be a valid URL")
    private String website;

    private String logo;

    private String location;
}