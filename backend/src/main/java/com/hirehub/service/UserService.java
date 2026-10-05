package com.hirehub.service;

import com.hirehub.exception.ForbiddenException;

import com.hirehub.dto.*;
import com.hirehub.entity.CandidateProfile;
import com.hirehub.entity.RecruiterProfile;
import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.CandidateProfileRepository;
import com.hirehub.repository.RecruiterProfileRepository;
import com.hirehub.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       CandidateProfileRepository candidateProfileRepository,
                       RecruiterProfileRepository recruiterProfileRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.candidateProfileRepository = candidateProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
    }

    private CandidateProfileEmbeddedDto toEmbeddedDto(CandidateProfile profile) {
        return CandidateProfileEmbeddedDto.builder()
                .urlLinkedin(profile.getUrlLinkedin())
                .urlGithub(profile.getUrlGithub())
                .urlPortfolio(profile.getUrlPortfolio())
                .bio(profile.getBio())
                .picture(profile.getPicture())
                .skills(profile.getSkills())
                .experiences(profile.getExperiences().stream()
                        .map(exp -> ExperienceDto.builder()
                                .id(exp.getId())
                                .position(exp.getPosition())
                                .company(exp.getCompany())
                                .startDate(exp.getStartDate())
                                .endDate(exp.getEndDate())
                                .build())
                        .toList())
                .build();
    }

    private RecruiterProfileEmbeddedDto toEmbeddedDto(RecruiterProfile profile) {
        return RecruiterProfileEmbeddedDto.builder()
                .companyName(profile.getCompanyName())
                .website(profile.getWebsite())
                .logo(profile.getLogo())
                .description(profile.getDescription())
                .foundedYear(profile.getFoundedYear())
                .industry(profile.getIndustry())
                .mission(profile.getMission())
                .vision(profile.getVision())
                .companyValues(profile.getCompanyValues())
                .googleMapsUrl(profile.getGoogleMapsUrl())
                .headquarters(profile.getHeadquarters())
                .offices(profile.getOffices())
                .companySize(profile.getCompanySize())
                .companyType(profile.getCompanyType())
                .technologies(profile.getTechnologies())
                .phone(profile.getPhone())
                .linkedin(profile.getLinkedin())
                .facebook(profile.getFacebook())
                .instagram(profile.getInstagram())
                .twitter(profile.getTwitter())
                .build();
    }

    private UserResponseDto toDto(User user) {

        UserResponseDto.UserResponseDtoBuilder builder = UserResponseDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole());

        if (user.getRole() == Role.CANDIDATE) {
            candidateProfileRepository.findById(user.getId())
                    .ifPresent(profile -> builder.candidateProfile(toEmbeddedDto(profile)));
        } else if (user.getRole() == Role.RECRUITER) {
            recruiterProfileRepository.findById(user.getId())
                    .ifPresent(profile -> builder.recruiterProfile(toEmbeddedDto(profile)));
        }

        return builder.build();
    }



    /**
     * The signed-in user's basic details, whatever their role. /api/candidates/me and
     * /api/recruiters/profile give the role-specific profile.
     */
    public UserResponseDto getMyProfile(User currentUser) {
        return toDto(currentUser);
    }

    public UserResponseDto updateBasicInfo(User currentUser, UpdateBasicInfoDto dto) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());

        User saved = userRepository.save(user);
        return toDto(saved);
    }

    @Transactional
    public UserResponseDto createUser(UserRequestDto userRequestDto) {

        if (userRepository.existsByEmail(userRequestDto.getEmail())) {
            throw new BadRequestException("An account with this email already exists.");
        }

        User user = User.builder()
                .firstName(userRequestDto.getFirstName())
                .lastName(userRequestDto.getLastName())
                .email(userRequestDto.getEmail())
                .password(passwordEncoder.encode(userRequestDto.getPassword()))
                .role(userRequestDto.getRole())
                .build();

        User savedUser = userRepository.save(user);

        if (savedUser.getRole() == Role.CANDIDATE) {
            candidateProfileRepository.save(
                    CandidateProfile.builder().user(savedUser).build()
            );
        } else if (savedUser.getRole() == Role.RECRUITER) {
            recruiterProfileRepository.save(
                    RecruiterProfile.builder().user(savedUser).build()
            );
        }

        return toDto(savedUser);
    }

    public void deleteUser(Long id, User currentUser) {
        if (!currentUser.getId().equals(id)) {
            throw new ForbiddenException("You can only delete your own account.");
        }

        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found");
        }

        userRepository.deleteById(id);
    }
}