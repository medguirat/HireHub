package com.hirehub.service;

import com.hirehub.company.CompanyProfileImporter;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final EmailService emailService;
    private final CompanyProfileImporter companyProfileImporter;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService,
                       UserRepository userRepository, PasswordEncoder passwordEncoder,
                       CandidateProfileRepository candidateProfileRepository,
                       RecruiterProfileRepository recruiterProfileRepository,
                       EmailService emailService,
                       CompanyProfileImporter companyProfileImporter) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.candidateProfileRepository = candidateProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.emailService = emailService;
        this.companyProfileImporter = companyProfileImporter;
    }

    public LoginResponseDto login(LoginRequestDto request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        return LoginResponseDto.builder()
                .token(jwtService.generateToken(request.getEmail()))
                .build();
    }

    @Transactional
    public UserResponseDto register(UserRequestDto request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("An account with this email already exists.");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        User savedUser = userRepository.save(user);


        if (savedUser.getRole() == Role.CANDIDATE) {
            CandidateProfile profile = CandidateProfile.builder()
                    .user(savedUser)
                    .build();
            candidateProfileRepository.save(profile);
        } else if (savedUser.getRole() == Role.RECRUITER) {
            String companyName = request.getCompanyName() == null ? null : request.getCompanyName().trim();
            RecruiterProfile profile = recruiterProfileRepository.save(RecruiterProfile.builder()
                    .user(savedUser)
                    .companyName(companyName == null || companyName.isEmpty() ? null : companyName)
                    .build());
            if (request.getCompanyWebsite() != null && !request.getCompanyWebsite().isBlank()) {
                // Runs in the background after commit; a failure never affects the signup.
                companyProfileImporter.requestImport(profile, request.getCompanyWebsite());
            }
        }

        emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getFirstName(), savedUser.getRole().name());

        return UserResponseDto.builder()
                .id(savedUser.getId())
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .build();
    }
}