package com.hirehub.test;

import com.hirehub.entity.ApplicationStatus;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** A candidate's own account: profile, dashboard counts, basic info, deleting the account. */
class CandidateAccountIT extends ApiTestSupport {

    @Test
    void profileRoundTripWithSkillsAndExperience() throws Exception {
        User candidate = user("account-cand@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bio\":\"Java developer\",\"skills\":[\"Java\",\"Docker\"],"
                                + "\"urlLinkedin\":\"https://www.linkedin.com/in/test\","
                                + "\"experiences\":[{\"position\":\"Developer\",\"company\":\"Acme\",\"startDate\":\"2022-01-01\"}]}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/candidates/me").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skills.length()").value(2))
                .andExpect(jsonPath("$.experiences[0].company").value("Acme"))
                .andExpect(jsonPath("$.email").value("account-cand@test.com"));
    }

    @Test
    void profileValidation() throws Exception {
        User candidate = user("account-invalid@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/candidates/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"urlLinkedin\":\"not a url\",\"experiences\":[{\"position\":\"\",\"company\":\"Acme\"}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.urlLinkedin").value("urlLinkedin must be a valid URL"))
                .andExpect(jsonPath("$.fieldErrors['experiences[0].position']").value("Position is required"))
                .andExpect(jsonPath("$.fieldErrors['experiences[0].startDate']").value("Start date is required"));
    }

    @Test
    void dashboardCountsTheCandidatesApplications() throws Exception {
        User recruiter = user("account-rec@test.com", Role.RECRUITER);
        User candidate = user("account-dash@test.com", Role.CANDIDATE);
        application(candidate, offer(recruiter, "A"));
        var accepted = application(candidate, offer(recruiter, "B"));
        accepted.setStatus(ApplicationStatus.ACCEPTED);
        applicationRepository.save(accepted);

        mockMvc.perform(get("/api/candidates/dashboard").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalApplications").value(2))
                .andExpect(jsonPath("$.pendingApplications").value(1))
                .andExpect(jsonPath("$.acceptedApplications").value(1))
                .andExpect(jsonPath("$.rejectedApplications").value(0));
    }

    @Test
    void basicInfoIsValidatedAndSaved() throws Exception {
        User candidate = user("account-basic@test.com", Role.CANDIDATE);
        mockMvc.perform(put("/api/users/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"firstName\":\"\",\"lastName\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.firstName").value("First name is required"));
        mockMvc.perform(put("/api/users/me").header("Authorization", token(candidate))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"firstName\":\"Nour\",\"lastName\":\"Hammami\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Nour"));
    }

    @Test
    void theHealthAndTestEndpointsAnswer() throws Exception {
        User candidate = user("account-ping@test.com", Role.CANDIDATE);
        mockMvc.perform(get("/api/test").header("Authorization", token(candidate))).andExpect(status().isOk());
        mockMvc.perform(get("/api/health")).andExpect(jsonPath("$.status").value("UP"));
    }
}
