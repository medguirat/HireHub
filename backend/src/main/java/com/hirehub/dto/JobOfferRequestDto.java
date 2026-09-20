package com.hirehub.dto;

import com.hirehub.entity.ContractType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;


@Data
public class JobOfferRequestDto {

    @NotBlank (message = "Title is required ")
    private String title;

    @NotBlank (message = "Description is required")
    private String description;

    @NotBlank (message = "Location is required")
    private String location;

    @NotNull (message = "Contract type is required ")
    private ContractType contractType;

    @NotNull (message="Deadline is required")
    @Future (message = "Deadline must be in the future ")
    private LocalDate deadline;
}
