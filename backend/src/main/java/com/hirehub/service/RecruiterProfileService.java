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
        profile.setDescription(dto.getDescription());
        profile.setFoundedYear(dto.getFoundedYear());
        profile.setIndustry(dto.getIndustry());
        profile.setMission(dto.getMission());
        profile.setVision(dto.getVision());
        profile.setCompanyValues(dto.getCompanyValues());
        profile.setGoogleMapsUrl(dto.getGoogleMapsUrl());
        profile.setHeadquarters(dto.getHeadquarters());
        profile.setOffices(dto.getOffices());
        profile.setCompanySize(dto.getCompanySize());
        profile.setCompanyType(dto.getCompanyType());
        profile.setTechnologies(dto.getTechnologies());
        profile.setPhone(dto.getPhone());
        profile.setLinkedin(dto.getLinkedin());
        profile.setFacebook(dto.getFacebook());
        profile.setInstagram(dto.getInstagram());
        profile.setTwitter(dto.getTwitter());

        RecruiterProfile saved = recruiterProfileRepository.save(profile);
        return toDto(saved);
    }
}