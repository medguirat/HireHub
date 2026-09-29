package com.hirehub.dto;

import com.hirehub.entity.InterviewType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ApplicationEvaluationRequestDto {

    @NotNull @Min(value = 1, message = "Ratings go from 1 to 5.") @Max(value = 5, message = "Ratings go from 1 to 5.")
    private Integer technicalSkills;

    @NotNull @Min(value = 1, message = "Ratings go from 1 to 5.") @Max(value = 5, message = "Ratings go from 1 to 5.")
    private Integer experience;

    @NotNull @Min(value = 1, message = "Ratings go from 1 to 5.") @Max(value = 5, message = "Ratings go from 1 to 5.")
    private Integer communication;

    @NotNull @Min(value = 1, message = "Ratings go from 1 to 5.") @Max(value = 5, message = "Ratings go from 1 to 5.")
    private Integer culturalFit;

    private boolean hasDegree;
    private boolean passedTest;
    private boolean availableNow;

    @Size(max = 5000, message = "Notes can be at most 5000 characters.")
    private String notes;

    @NotNull(message = "Choose an interview type.")
    private InterviewType interviewType;
}
