package com.hirehub.service;

import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.User;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class CandidateService {

    private final UserRepository userRepository;

    public CandidateService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponseDto getProfile(Long candidateId) {
        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        return UserResponseDto.builder()
                .id(candidate.getId())
                .firstName(candidate.getFirstName())
                .lastName(candidate.getLastName())
                .email(candidate.getEmail())
                .role(candidate.getRole())
                .build();
    }

    public UserResponseDto updateProfile(Long candidateId, User updatedData) {
        User existingCandidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        existingCandidate.setFirstName(updatedData.getFirstName());
        existingCandidate.setLastName(updatedData.getLastName());

        User savedCandidate = userRepository.save(existingCandidate);

        return UserResponseDto.builder()
                .id(savedCandidate.getId())
                .firstName(savedCandidate.getFirstName())
                .lastName(savedCandidate.getLastName())
                .email(savedCandidate.getEmail())
                .role(savedCandidate.getRole())
                .build();
    }
}