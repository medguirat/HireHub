package com.hirehub.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.ApiException;
import com.hirehub.matching.AiServiceClient;
import com.hirehub.matching.AiServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Profile drafts go through the backend (the browser never calls the ai-service). */
class ProfileDraftIT extends ApiTestSupport {

    @MockitoBean private AiServiceClient aiService;

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void aRecruiterGetsACompanyDescriptionDraft() throws Exception {
        User recruiter = user("draft-recruiter@test.com", Role.RECRUITER);
        when(aiService.draft(eq("company"), any())).thenReturn(json.readTree(
                "{\"text\":\"Acme builds warehouse robots.\",\"ai_assisted\":false,\"used\":[\"companyName\",\"industry\"]}"));

        mockMvc.perform(post("/api/recruiters/profile/description-draft").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"companyName\":\"Acme\",\"industry\":\"Robotics\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Acme builds warehouse robots."))
                .andExpect(jsonPath("$.ai_assisted").value(false));
        verify(aiService).draft(eq("company"), argThat(body -> "Acme".equals(body.path("companyName").asText())));
    }

    @Test
    void aCandidateGetsABioDraftAndTheServiceOwnMessageWhenTheProfileIsEmpty() throws Exception {
        User candidate = user("draft-candidate@test.com", Role.CANDIDATE);
        when(aiService.draft(eq("bio"), any())).thenThrow(new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                "NOT_ENOUGH_DATA", "Add a headline, skills or an experience first."));

        mockMvc.perform(post("/api/candidates/me/bio-draft").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NOT_ENOUGH_DATA"))
                .andExpect(jsonPath("$.message").value("Add a headline, skills or an experience first."));
    }

    @Test
    void whenTheAiServiceIsDownTheAnswerIs503() throws Exception {
        User candidate = user("draft-down@test.com", Role.CANDIDATE);
        when(aiService.draft(eq("bio"), any())).thenThrow(new AiServiceUnavailableException("down", null));

        mockMvc.perform(post("/api/candidates/me/bio-draft").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"headline\":\"Dev\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DRAFTS_UNAVAILABLE"));
    }

    @Test
    void theBodyMustBeAProfileObject() throws Exception {
        User candidate = user("draft-bad@test.com", Role.CANDIDATE);
        mockMvc.perform(post("/api/candidates/me/bio-draft").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON).content("[1,2,3]"))
                .andExpect(status().isBadRequest());
    }
}
