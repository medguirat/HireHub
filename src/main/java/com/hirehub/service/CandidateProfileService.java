package com.hirehub.service;

import com.hirehub.dto.CandidateProfileRequestDto;
import com.hirehub.dto.CandidateProfileResponseDto;
import com.hirehub.dto.ExperienceDto;
import com.hirehub.entity.CandidateProfile;
import com.hirehub.entity.Experience;
import com.hirehub.entity.User;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.CandidateProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CandidateProfileService {

    private final CandidateProfileRepository candidateProfileRepository;

    public CandidateProfileService(CandidateProfileRepository candidateProfileRepository) {
        this.candidateProfileRepository = candidateProfileRepository;
    }

    private CandidateProfileResponseDto toDto(CandidateProfile profile) {
        List<ExperienceDto> experiences = profile.getExperiences().stream()
                .map(exp -> ExperienceDto.builder()
                        .id(exp.getId())
                        .position(exp.getPosition())
                        .company(exp.getCompany())
                        .startDate(exp.getStartDate())
                        .endDate(exp.getEndDate())
                        .build())
                .toList();

        return CandidateProfileResponseDto.builder()
                .userId(profile.getUser().getId())
                .firstName(profile.getUser().getFirstName())
                .lastName(profile.getUser().getLastName())
                .email(profile.getUser().getEmail())
                .urlLinkedin(profile.getUrlLinkedin())
                .urlGithub(profile.getUrlGithub())
                .urlPortfolio(profile.getUrlPortfolio())
                .bio(profile.getBio())
                .picture(profile.getPicture())
                .skills(profile.getSkills())
                .experiences(experiences)
                .build();
    }

    public CandidateProfileResponseDto getMyProfile(User currentUser) {
        CandidateProfile profile = candidateProfileRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found"));

        return toDto(profile);
    }

    /**
     * PUT en remplacement complet : skills et experiences sont recréées à chaque appel.
     * Simple et prévisible pour un v1 ; on pourra ajouter des endpoints granulaires
     * (POST/DELETE par expérience) plus tard si besoin.
     */
    @Transactional
    public CandidateProfileResponseDto updateMyProfile(User currentUser, CandidateProfileRequestDto dto) {
        CandidateProfile profile = candidateProfileRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate profile not found"));

        profile.setUrlLinkedin(dto.getUrlLinkedin());
        profile.setUrlGithub(dto.getUrlGithub());
        profile.setUrlPortfolio(dto.getUrlPortfolio());
        profile.setBio(dto.getBio());
        profile.setPicture(dto.getPicture());

        profile.getSkills().clear();
        if (dto.getSkills() != null) {
            profile.getSkills().addAll(dto.getSkills());
        }

        profile.getExperiences().clear();
        if (dto.getExperiences() != null) {
            List<Experience> experiences = dto.getExperiences().stream()
                    .map(expDto -> Experience.builder()
                            .position(expDto.getPosition())
                            .company(expDto.getCompany())
                            .startDate(expDto.getStartDate())
                            .endDate(expDto.getEndDate())
                            .candidateProfile(profile)
                            .build())
                    .toList();
            profile.getExperiences().addAll(experiences);
        }

        CandidateProfile saved = candidateProfileRepository.save(profile);
        return toDto(saved);
    }
}