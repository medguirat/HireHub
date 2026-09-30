package com.hirehub.test;

import com.hirehub.entity.JobOffer;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** A recruiter's own offers: create, read, update, and the public offer endpoints. */
class RecruiterOfferControllerIT extends ApiTestSupport {

    @Test
    void createReadAndUpdateAnOffer() throws Exception {
        User recruiter = user("offers-rec@test.com", Role.RECRUITER);
        String created = mockMvc.perform(post("/api/recruiters/offers").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON).content(offerJson("Backend Developer", LocalDate.now().plusDays(20))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Backend Developer"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andReturn().getResponse().getContentAsString();
        long id = com.jayway.jsonpath.JsonPath.parse(created).read("$.id", Long.class);

        mockMvc.perform(get("/api/recruiters/offers/" + id).header("Authorization", token(recruiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Backend Developer"));

        mockMvc.perform(put("/api/recruiters/offers/" + id).header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON).content(offerJson("Senior Backend Developer", LocalDate.now().plusDays(40))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Senior Backend Developer"));
    }

    @Test
    void offerValidationNamesEachProblem() throws Exception {
        User recruiter = user("offers-invalid@test.com", Role.RECRUITER);
        mockMvc.perform(post("/api/recruiters/offers").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"description\":\"\",\"location\":\"\",\"deadline\":\"" + LocalDate.now().minusDays(1) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").value("Title is required"))
                .andExpect(jsonPath("$.fieldErrors.description").value("Description is required"))
                .andExpect(jsonPath("$.fieldErrors.location").value("Location is required"))
                .andExpect(jsonPath("$.fieldErrors.contractType").value("Contract type is required"))
                .andExpect(jsonPath("$.fieldErrors.deadline").value("Deadline must be in the future"));
    }

    @Test
    void aRecruiterOnlySeesAndChangesTheirOwnOffers() throws Exception {
        User owner = user("offers-owner@test.com", Role.RECRUITER);
        User other = user("offers-other@test.com", Role.RECRUITER);
        JobOffer offer = offer(owner, "Owner's offer");
        offer(other, "Other's offer");

        mockMvc.perform(get("/api/recruiters/offers").header("Authorization", token(other)))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Other's offer"));
        mockMvc.perform(get("/api/recruiters/offers/" + offer.getId()).header("Authorization", token(other)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/recruiters/offers/" + offer.getId()).header("Authorization", token(other))
                        .contentType(MediaType.APPLICATION_JSON).content(offerJson("Hijacked", LocalDate.now().plusDays(5))))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/recruiters/offers/" + offer.getId()).header("Authorization", token(other)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anUnknownOfferIs404() throws Exception {
        User recruiter = user("offers-404@test.com", Role.RECRUITER);
        mockMvc.perform(get("/api/recruiters/offers/999999").header("Authorization", token(recruiter)))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicOfferEndpointsWorkWithoutAnAccount() throws Exception {
        User recruiter = user("offers-public@test.com", Role.RECRUITER);
        JobOffer offer = offer(recruiter, "Public offer");
        mockMvc.perform(get("/api/joboffers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Public offer"));
        mockMvc.perform(get("/api/joboffers/" + offer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Public offer"));
        mockMvc.perform(get("/api/joboffers/999999")).andExpect(status().isNotFound());
    }
}
