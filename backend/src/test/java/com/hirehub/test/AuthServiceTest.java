package com.hirehub.test;

import com.hirehub.company.CompanyProfileImporter;
import com.hirehub.service.AuthService;
import com.hirehub.service.EmailService;

import com.hirehub.dto.LoginRequestDto;
import com.hirehub.dto.LoginResponseDto;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.CandidateProfile;
import com.hirehub.entity.RecruiterProfile;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.repository.CandidateProfileRepository;
import com.hirehub.repository.RecruiterProfileRepository;
import com.hirehub.repository.UserRepository;
import com.hirehub.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtService jwtService;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private RecruiterProfileRepository recruiterProfileRepository;
    @Mock private EmailService emailService;
    @Mock private CompanyProfileImporter companyProfileImporter;

    @InjectMocks private AuthService authService;

    @Test
    void login_generatesTokenOnSuccess() {
        LoginRequestDto request = LoginRequestDto.builder()
                .email("user@test.com").password("password123").build();

        when(jwtService.generateToken("user@test.com")).thenReturn("fake-jwt-token");

        LoginResponseDto result = authService.login(request);

        assertThat(result.getToken()).isEqualTo("fake-jwt-token");
        verify(authenticationManager).authenticate(any());
    }

    @Test
    void login_propagatesExceptionOnBadCredentials() {
        LoginRequestDto request = LoginRequestDto.builder()
                .email("user@test.com").password("wrong").build();

        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager).authenticate(any());

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
        verify(jwtService, never()).generateToken(anyString());
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        UserRequestDto request = UserRequestDto.builder()
                .firstName("Ali").lastName("Ben").email("ali@test.com")
                .password("password123").role(Role.CANDIDATE).build();

        when(userRepository.existsByEmail("ali@test.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_encodesPasswordAndCreatesCandidateProfile() {
        UserRequestDto request = UserRequestDto.builder()
                .firstName("Ali").lastName("Ben").email("ali@test.com")
                .password("plainPwd").role(Role.CANDIDATE).build();

        User savedUser = User.builder().id(1L).firstName("Ali").lastName("Ben")
                .email("ali@test.com").role(Role.CANDIDATE).build();

        when(userRepository.existsByEmail("ali@test.com")).thenReturn(false);
        when(passwordEncoder.encode("plainPwd")).thenReturn("encodedPwd");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        UserResponseDto result = authService.register(request);

        assertThat(result.getEmail()).isEqualTo("ali@test.com");
        verify(candidateProfileRepository).save(any(CandidateProfile.class));
        verify(recruiterProfileRepository, never()).save(any());
        verify(emailService).sendWelcomeEmail("ali@test.com", "Ali", Role.CANDIDATE);
    }

    @Test
    void register_createsRecruiterProfileWhenRoleIsRecruiter() {
        UserRequestDto request = UserRequestDto.builder()
                .firstName("Rec").lastName("Ru").email("rec@test.com")
                .password("plainPwd").role(Role.RECRUITER).build();

        User savedUser = User.builder().id(2L).firstName("Rec").lastName("Ru")
                .email("rec@test.com").role(Role.RECRUITER).build();

        when(userRepository.existsByEmail("rec@test.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPwd");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        authService.register(request);

        verify(recruiterProfileRepository).save(any(RecruiterProfile.class));
        verify(candidateProfileRepository, never()).save(any());
        verify(emailService).sendWelcomeEmail("rec@test.com", "Rec", Role.RECRUITER);
        verify(companyProfileImporter, never()).requestImport(any(), any());
    }

    @Test
    void register_startsTheCompanyImportWhenARecruiterGivesAWebsite() {
        UserRequestDto request = UserRequestDto.builder()
                .firstName("Rec").lastName("Ru").email("rec@test.com").password("plainPwd")
                .role(Role.RECRUITER).companyName("  Acme  ").companyWebsite("acme.example.com").build();
        User savedUser = User.builder().id(2L).firstName("Rec").email("rec@test.com").role(Role.RECRUITER).build();
        when(userRepository.existsByEmail("rec@test.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPwd");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(recruiterProfileRepository.save(any(RecruiterProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.register(request);

        verify(recruiterProfileRepository).save(argThat(p -> "Acme".equals(p.getCompanyName())));
        verify(companyProfileImporter).requestImport(any(RecruiterProfile.class), eq("acme.example.com"));
    }
}
