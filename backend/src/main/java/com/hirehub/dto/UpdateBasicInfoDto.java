package com.hirehub.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateBasicInfoDto {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;
}