package com.hirehub.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;

/**
 * A CV/offer match. {@code result} is the ai-service's breakdown as-is
 * (overall_score, categories, skills, recommendations, ...).
 */
public record MatchResponseDto(
        Long offerId,
        String offerTitle,
        String cvFileName,
        boolean cached,
        LocalDateTime computedAt,
        JsonNode result
) {}
