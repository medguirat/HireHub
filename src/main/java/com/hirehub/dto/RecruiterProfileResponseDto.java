package com.hirehub.dto;

import lombok.*;

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

    private String location;
}