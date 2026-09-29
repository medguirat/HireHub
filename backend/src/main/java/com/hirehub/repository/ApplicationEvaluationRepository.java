package com.hirehub.repository;

import com.hirehub.entity.ApplicationEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ApplicationEvaluationRepository extends JpaRepository<ApplicationEvaluation, Long> {

    Optional<ApplicationEvaluation> findByApplicationId(Long applicationId);
}
