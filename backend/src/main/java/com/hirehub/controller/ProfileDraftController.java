package com.hirehub.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.hirehub.exception.ApiException;
import com.hirehub.exception.BadRequestException;
import com.hirehub.matching.AiServiceClient;
import com.hirehub.matching.AiServiceUnavailableException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Write it for me" on the profile pages: a draft built only from what the user has entered (the
 * form as it is now, saved or not), by the ai-service. The browser never calls the ai-service
 * itself; roles come from the URL rules (SecurityConfig).
 */
@RestController
public class ProfileDraftController {

    /** A draft request is a profile form, never this large. */
    private static final int MAX_BODY_CHARS = 20_000;

    private final AiServiceClient aiService;

    public ProfileDraftController(AiServiceClient aiService) {
        this.aiService = aiService;
    }

    /** Recruiters: a company description from the company profile fields. */
    @PostMapping("/api/recruiters/profile/description-draft")
    public JsonNode companyDescription(@RequestBody JsonNode profile) {
        return draft("company", profile);
    }

    /** Candidates: a short bio from the headline, skills, experience, education and languages. */
    @PostMapping("/api/candidates/me/bio-draft")
    public JsonNode bio(@RequestBody JsonNode profile) {
        return draft("bio", profile);
    }

    private JsonNode draft(String kind, JsonNode profile) {
        if (profile == null || !profile.isObject() || profile.toString().length() > MAX_BODY_CHARS) {
            throw new BadRequestException("Send the profile details as a JSON object.");
        }
        try {
            return aiService.draft(kind, profile);
        } catch (AiServiceUnavailableException e) {
            throw ApiException.draftsUnavailable();
        }
    }
}
