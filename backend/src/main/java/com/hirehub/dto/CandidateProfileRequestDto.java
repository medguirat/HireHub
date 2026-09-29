package com.hirehub.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.hibernate.validator.constraints.URL;

import java.util.List;

@Data
public class CandidateProfileRequestDto {

    @URL(message = "urlLinkedin must be a valid URL")
    private String urlLinkedin;

    @URL(message = "urlGithub must be a valid URL")
    private String urlGithub;

    @URL(message = "urlPortfolio must be a valid URL")
    private String urlPortfolio;

    @Size(max = 150, message = "Headline must be at most 150 characters")
    private String headline;

    @Size(max = 1000, message = "Education must be at most 1000 characters")
    private String education;

    @Size(max = 2000, message = "Bio must be at most 2000 characters")
    private String bio;

    private String picture;

    private List<String> skills;

    @Valid
    private List<ExperienceDto> experiences;
}