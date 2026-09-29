package com.hirehub.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateProfileResponseDto {

    private Long userId;

    private String firstName;

    private String lastName;

    private String email;

    private String urlLinkedin;

    private String urlGithub;

    private String urlPortfolio;

    private String headline;
    private String education;
    private String bio;

    private String picture;

    private List<String> skills;

    private List<ExperienceDto> experiences;
}