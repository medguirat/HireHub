package com.hirehub.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User persistUser(String email, Role role) {
        return userRepository.save(User.builder()
                .firstName("Test").lastName("User").email(email)
                .password(passwordEncoder.encode("password123")).role(role).build());
    }

    @Test
    void createUser_returns400WhenEmailAlreadyExists() throws Exception {
        persistUser("dup@test.com", Role.CANDIDATE);

        UserRequestDto dto = UserRequestDto.builder()
                .firstName("New").lastName("User").email("dup@test.com")
                .password("password123").role(Role.CANDIDATE).build();

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("already exists")));
    }

    @Test
    void createUser_returns400WhenValidationFails() throws Exception {
        UserRequestDto dto = UserRequestDto.builder()
                .firstName("").lastName("User").email("not-an-email")
                .password("123").role(Role.CANDIDATE).build();

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.email").exists())
                .andExpect(jsonPath("$.password").exists());
    }

    @Test
    void createUser_returns200OnSuccessAndCreatesCandidateProfile() throws Exception {
        UserRequestDto dto = UserRequestDto.builder()
                .firstName("New").lastName("User").email("new@test.com")
                .password("password123").role(Role.CANDIDATE).build();

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@test.com"))
                .andExpect(jsonPath("$.role").value("CANDIDATE"));
    }

    @Test
    void deleteUser_returns400WhenDeletingSomeoneElsesAccount() throws Exception {
        User me = persistUser("me@test.com", Role.CANDIDATE);
        User other = persistUser("other@test.com", Role.CANDIDATE);
        String token = jwtService.generateToken(me.getEmail());

        mockMvc.perform(delete("/api/users/" + other.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteUser_succeedsWhenDeletingOwnAccount() throws Exception {
        User me = persistUser("me2@test.com", Role.CANDIDATE);
        String token = jwtService.generateToken(me.getEmail());

        mockMvc.perform(delete("/api/users/" + me.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void deleteUser_requiresAuthentication() throws Exception {
        User other = persistUser("noauth@test.com", Role.CANDIDATE);

        mockMvc.perform(delete("/api/users/" + other.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyProfile_returns401WithoutToken() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyProfile_returns200WithValidToken() throws Exception {
        User me = persistUser("valid@test.com", Role.CANDIDATE);
        String token = jwtService.generateToken(me.getEmail());

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("valid@test.com"));
    }

    @Test
    void getUserById_returns404WhenNotFound() throws Exception {
        mockMvc.perform(get("/api/users/999999"))
                .andExpect(status().isNotFound());
    }
}
