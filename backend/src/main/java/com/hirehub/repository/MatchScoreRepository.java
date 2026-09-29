package com.hirehub.repository;

import com.hirehub.entity.MatchScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface MatchScoreRepository extends JpaRepository<MatchScore, Long> {

    Optional<MatchScore> findByCandidateIdAndJobOfferId(Long candidateId, Long jobOfferId);

    @Transactional
    void deleteByCandidateId(Long candidateId);
}
