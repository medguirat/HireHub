package com.hirehub.repository;

import com.hirehub.entity.CandidateCv;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CandidateCvRepository extends JpaRepository<CandidateCv, Long> {

    Optional<CandidateCv> findByCandidateId(Long candidateId);
}
