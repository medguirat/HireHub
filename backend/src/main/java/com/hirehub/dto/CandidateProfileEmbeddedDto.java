package com.hirehub.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateProfileEmbeddedDto {

    private String urlLinkedin;

    private String urlGithub;

    private String urlPortfolio;

    private String bio;

    private String picture;

    private List<String> skills;

    private List<ExperienceDto> experiences;
}