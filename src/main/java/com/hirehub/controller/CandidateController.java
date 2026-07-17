package com.hirehub.controller;

import com.hirehub.entity.Candidate;
import com.hirehub.service.CandidateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private final CandidateService candidateService;

    public CandidateController(CandidateService candidateService) {
        this.candidateService = candidateService;
    }

    @GetMapping
    public List<Candidate> getAllCandidates() {
        return candidateService.getAllCandidates();
    }

    @GetMapping("/{id}")
    public Candidate getCandidateById(@PathVariable Long id) {
        return candidateService.getCandidateById(id);
    }

    @PostMapping
    public Candidate createCandidate(@RequestBody Candidate candidate) {
        return candidateService.createCandidate(candidate);
    }

    @DeleteMapping("/{id}")
    public void deleteCandidate(@PathVariable Long id) {
        candidateService.deleteCandidate(id);
    }
}