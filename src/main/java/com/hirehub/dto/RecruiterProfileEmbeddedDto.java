package com.hirehub.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecruiterProfileEmbeddedDto {

    private String companyName;

    private String website;

    private String logo;

    private String location;
}