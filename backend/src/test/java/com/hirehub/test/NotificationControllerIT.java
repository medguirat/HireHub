package com.hirehub.test;

import com.hirehub.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Interview invitations: created when a recruiter accepts, read by the candidate. */
class NotificationControllerIT extends ApiTestSupport {

    @Test
    void acceptingWithAnInterviewNotifiesTheCandidateWhoCanMarkItRead() throws Exception {
        User recruiter = user("notif-rec@test.com", Role.RECRUITER);
        User candidate = user("notif-cand@test.com", Role.CANDIDATE);
        Application app = application(candidate, offer(recruiter, "Java Developer"));

        mockMvc.perform(patch("/api/applications/" + app.getId() + "/status").header("Authorization", token(recruiter))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACCEPTED\",\"interviewDate\":\"" + LocalDateTime.now().plusDays(3).withNano(0)
                                + "\",\"interviewLetter\":\"See you on Monday\"}"))
                .andExpect(status().isOk());

        String body = mockMvc.perform(get("/api/notifications").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].message").value(org.hamcrest.Matchers.containsString("Java Developer")))
                .andExpect(jsonPath("$[0].read").value(false))
                .andExpect(jsonPath("$[0].user.password").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        long id = com.jayway.jsonpath.JsonPath.parse(body).read("$[0].id", Long.class);

        mockMvc.perform(put("/api/notifications/" + id + "/read").header("Authorization", token(candidate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        // The recruiter has no notifications of their own.
        mockMvc.perform(get("/api/notifications").header("Authorization", token(recruiter)))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void someoneElsesNotificationCannotBeMarkedRead() throws Exception {
        User owner = user("notif-owner@test.com", Role.CANDIDATE);
        User other = user("notif-other@test.com", Role.CANDIDATE);
        Notification notification = notificationRepository.save(Notification.builder().user(owner)
                .message("Hello").createdAt(LocalDateTime.now()).isRead(false).build());

        mockMvc.perform(put("/api/notifications/" + notification.getId() + "/read").header("Authorization", token(other)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/notifications/999999/read").header("Authorization", token(other)))
                .andExpect(status().isNotFound());
    }
}
