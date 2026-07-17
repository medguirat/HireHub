package com.hirehub.service;

import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class CandidateService {

    private final UserRepository userRepository;

    public CandidateService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCandidateProfile(Long candidateId) {
        return userRepository.findById(candidateId)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));
    }
}