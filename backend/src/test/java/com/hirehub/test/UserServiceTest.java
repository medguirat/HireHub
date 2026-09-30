package com.hirehub.test;

import com.hirehub.exception.ForbiddenException;
import com.hirehub.service.UserService;

import com.hirehub.dto.UpdateBasicInfoDto;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.CandidateProfile;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.CandidateProfileRepository;
import com.hirehub.repository.RecruiterProfileRepository;
import com.hirehub.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private RecruiterProfileRepository recruiterProfileRepository;

    @InjectMocks private UserService userService;

    @Test
    void createUser_throwsWhenEmailAlreadyExists() {
        UserRequestDto dto = UserRequestDto.builder()
                .firstName("Ali").lastName("Ben").email("ali@test.com")
                .password("password123").role(Role.CANDIDATE).build();

        when(userRepository.existsByEmail("ali@test.com")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> userService.createUser(dto));

        assertThat(ex.getMessage()).contains("already exists");
        verify(userRepository, never()).save(any());
    }

    @Test
    void createUser_createsCandidateProfileWhenRoleIsCandidate() {
        UserRequestDto dto = UserRequestDto.builder()
                .firstName("Ali").lastName("Ben").email("ali@test.com")
                .password("password123").role(Role.CANDIDATE).build();

        User savedUser = User.builder().id(1L).firstName("Ali").lastName("Ben")
                .email("ali@test.com").role(Role.CANDIDATE).build();

        when(userRepository.existsByEmail("ali@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.empty());

        UserResponseDto result = userService.createUser(dto);

        assertThat(result.getEmail()).isEqualTo("ali@test.com");
        verify(candidateProfileRepository, times(1)).save(any(CandidateProfile.class));
        verify(recruiterProfileRepository, never()).save(any());
    }

    @Test
    void createUser_createsRecruiterProfileWhenRoleIsRecruiter() {
        UserRequestDto dto = UserRequestDto.builder()
                .firstName("Rec").lastName("Ru").email("rec@test.com")
                .password("password123").role(Role.RECRUITER).build();

        User savedUser = User.builder().id(2L).firstName("Rec").lastName("Ru")
                .email("rec@test.com").role(Role.RECRUITER).build();

        when(userRepository.existsByEmail("rec@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(recruiterProfileRepository.findById(2L)).thenReturn(Optional.empty());

        userService.createUser(dto);

        verify(recruiterProfileRepository, times(1)).save(any());
        verify(candidateProfileRepository, never()).save(any());
    }

    @Test
    void createUser_encodesPasswordBeforeSaving() {
        UserRequestDto dto = UserRequestDto.builder()
                .firstName("Ali").lastName("Ben").email("ali@test.com")
                .password("plainPassword").role(Role.CANDIDATE).build();

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode("plainPassword")).thenReturn("hashedValue");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.createUser(dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPassword()).isEqualTo("hashedValue");
    }

    @Test
    void deleteUser_throwsWhenNotOwnAccount() {
        User currentUser = User.builder().id(1L).build();

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> userService.deleteUser(2L, currentUser));

        assertThat(ex.getMessage()).contains("your own account");
        verify(userRepository, never()).deleteById(any());
    }

    @Test
    void deleteUser_throwsWhenUserDoesNotExist() {
        User currentUser = User.builder().id(1L).build();

        when(userRepository.existsById(1L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> userService.deleteUser(1L, currentUser));
    }

    @Test
    void deleteUser_succeedsWhenDeletingOwnAccount() {
        User currentUser = User.builder().id(1L).build();

        when(userRepository.existsById(1L)).thenReturn(true);

        userService.deleteUser(1L, currentUser);

        verify(userRepository).deleteById(1L);
    }

    @Test
    void updateBasicInfo_throwsWhenUserNotFound() {
        User currentUser = User.builder().id(99L).build();
        UpdateBasicInfoDto dto = new UpdateBasicInfoDto();
        dto.setFirstName("New");
        dto.setLastName("Name");

        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> userService.updateBasicInfo(currentUser, dto));
    }

    @Test
    void updateBasicInfo_updatesFirstAndLastName() {
        User currentUser = User.builder().id(1L).firstName("Old").lastName("Name")
                .email("a@test.com").role(Role.CANDIDATE).build();

        UpdateBasicInfoDto dto = new UpdateBasicInfoDto();
        dto.setFirstName("New");
        dto.setLastName("Value");

        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(candidateProfileRepository.findById(1L)).thenReturn(Optional.empty());

        UserResponseDto result = userService.updateBasicInfo(currentUser, dto);

        assertThat(result.getFirstName()).isEqualTo("New");
        assertThat(result.getLastName()).isEqualTo("Value");
    }

}
