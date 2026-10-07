package com.hirehub.dto;

import com.hirehub.entity.LanguageLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LanguageDto {

    @NotBlank(message = "Language is required")
    @Size(max = 60, message = "Language must be at most 60 characters")
    private String language;

    @NotNull(message = "Level is required")
    private LanguageLevel level;
}
