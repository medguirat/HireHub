package com.hirehub.service;

import com.hirehub.entity.Candidate;
import com.hirehub.entity.Role;
import com.hirehub.repository.CandidateRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final PasswordEncoder passwordEncoder;

    public CandidateService(CandidateRepository candidateRepository, PasswordEncoder passwordEncoder) {
        this.candidateRepository = candidateRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<Candidate> getAllCandidates() {
        return candidateRepository.findAll();
    }

    public Candidate getCandidateById(Long id) {
        return candidateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));
    }

    public Candidate createCandidate(Candidate candidate) {

        candidate.setPassword(passwordEncoder.encode(candidate.getPassword()));
        candidate.setRole(Role.CANDIDATE);

        return candidateRepository.save(candidate);
    }

    public void deleteCandidate(Long id) {
        candidateRepository.deleteById(id);
    }
}