package com.hirehub.service;

import com.hirehub.dto.RecruiterProfileRequestDto;
import com.hirehub.dto.RecruiterProfileResponseDto;
import com.hirehub.entity.RecruiterProfile;
import com.hirehub.entity.User;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.RecruiterProfileRepository;
import org.springframework.stereotype.Service;

@Service
public class RecruiterProfileService {

    private final RecruiterProfileRepository recruiterProfileRepository;

    public RecruiterProfileService(RecruiterProfileRepository recruiterProfileRepository) {
        this.recruiterProfileRepository = recruiterProfileRepository;
    }

    private RecruiterProfileResponseDto toDto(RecruiterProfile profile) {
        return RecruiterProfileResponseDto.builder()
                .userId(profile.getUser().getId())
                .firstName(profile.getUser().getFirstName())
                .lastName(profile.getUser().getLastName())
                .email(profile.getUser().getEmail())
                .companyName(profile.getCompanyName())
                .website(profile.getWebsite())
                .logo(profile.getLogo())
                .location(profile.getLocation())
                .build();
    }

    public RecruiterProfileResponseDto getMyProfile(User currentUser) {
        RecruiterProfile profile = recruiterProfileRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter profile not found"));

        return toDto(profile);
    }

    public RecruiterProfileResponseDto updateMyProfile(User currentUser, RecruiterProfileRequestDto dto) {
        RecruiterProfile profile = recruiterProfileRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter profile not found"));

        profile.setCompanyName(dto.getCompanyName());
        profile.setWebsite(dto.getWebsite());
        profile.setLogo(dto.getLogo());
        profile.setLocation(dto.getLocation());

        RecruiterProfile saved = recruiterProfileRepository.save(profile);
        return toDto(saved);
    }
}