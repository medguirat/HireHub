package com.hirehub.service;

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

    public User getProfile(Long candidateId) {
        return userRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
    }

    public User updateProfile(Long candidateId, User updatedData) {
        User existingCandidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        existingCandidate.setFirstName(updatedData.getFirstName());
        existingCandidate.setLastName(updatedData.getLastName());

        return userRepository.save(existingCandidate);
    }
}